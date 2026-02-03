import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SheetRow {
  title: string;
  category: string;
  description?: string;
  image_url: string;
  prompt: string;
  platform: string;
  product_type?: string;
}

interface SyncRequest {
  sheetId: string;
  sheetName: string;
  columnMapping: {
    title: string;
    category: string;
    description?: string;
    image_url: string;
    prompt: string;
    platform: string;
    product_type?: string;
  };
}

// Get Google Access Token using Service Account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  // Create JWT header and payload
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat: now,
  };

  // Base64url encode
  const encoder = new TextEncoder();
  const toBase64Url = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = toBase64Url(header);
  const payloadB64 = toBase64Url(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key and sign
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error("Token error:", tokenData);
    throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error}`);
  }

  return tokenData.access_token;
}

// Fetch data from Google Sheets
async function fetchSheetData(
  accessToken: string,
  sheetId: string,
  sheetName: string
): Promise<any[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Sheets API error:", error);
    throw new Error(`Failed to fetch sheet: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.values || [];
}

// Convert column letter to index (A=0, B=1, etc.)
function columnToIndex(col: string): number {
  const upper = col.toUpperCase();
  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const { sheetId, sheetName, columnMapping }: SyncRequest = await req.json();

    if (!sheetId || !sheetName) {
      throw new Error("Missing sheetId or sheetName");
    }

    console.log(`Syncing sheet: ${sheetId}, tab: ${sheetName}`);

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);
    console.log("Got access token");

    // Fetch sheet data
    const rows = await fetchSheetData(accessToken, sheetId, sheetName);
    console.log(`Fetched ${rows.length} rows`);

    if (rows.length < 2) {
      return new Response(
        JSON.stringify({ success: true, message: "No data rows found", products: [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Skip header row, parse data rows
    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    // Map columns
    const mapping = columnMapping || {
      title: "A",
      category: "B",
      description: "C",
      image_url: "D",
      prompt: "E",
      platform: "F",
      product_type: "G",
    };

    const products: SheetRow[] = dataRows
      .filter((row) => row && row.length > 0)
      .map((row) => ({
        title: row[columnToIndex(mapping.title)] || "",
        category: row[columnToIndex(mapping.category)] || "",
        description: mapping.description ? row[columnToIndex(mapping.description)] || "" : "",
        image_url: row[columnToIndex(mapping.image_url)] || "",
        prompt: row[columnToIndex(mapping.prompt)] || "",
        platform: row[columnToIndex(mapping.platform)] || "other",
        product_type: mapping.product_type ? row[columnToIndex(mapping.product_type)] || "" : "",
      }))
      .filter((p) => p.title && p.image_url && p.prompt);

    console.log(`Parsed ${products.length} valid products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Found ${products.length} products`,
        products 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
