import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SheetRow {
  title: string | null;
  category: string | null;
  image_url: string | null;
  prompt: string | null;
  platform: string;
  product_type: string | null;
}

interface SyncRequest {
  sheetId: string;
  sheetName: string;
  headerRow?: number; // 1-indexed row number for headers (default: 1)
  mode?: "headers" | "data";
  columnMapping?: {
    title: number;
    category: number;
    image_url: number;
    prompt: number;
    platform: number;
    product_type?: number;
  };
}

// Get Google Access Token using Service Account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat: now,
  };

  const toBase64Url = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = toBase64Url(header);
  const payloadB64 = toBase64Url(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

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

  const encoder = new TextEncoder();
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
    const { sheetId, sheetName, headerRow = 1, mode = "data", columnMapping }: SyncRequest = await req.json();

    if (!sheetId || !sheetName) {
      throw new Error("Missing sheetId or sheetName");
    }

    // Validate headerRow
    const headerRowIndex = Math.max(0, headerRow - 1); // Convert to 0-indexed

    console.log(`Mode: ${mode}, Sheet: ${sheetId}, Tab: ${sheetName}, Header Row: ${headerRow}`);

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);
    console.log("Got access token");

    // Fetch sheet data
    const rows = await fetchSheetData(accessToken, sheetId, sheetName);
    console.log(`Fetched ${rows.length} rows`);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, headers: [], products: [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if we have enough rows for the specified header row
    if (rows.length <= headerRowIndex) {
      return new Response(
        JSON.stringify({ success: false, error: `Sheet doesn't have enough rows. Header row ${headerRow} not found.` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const headerRowData = rows[headerRowIndex];

    // MODE: headers - just return column headers
    if (mode === "headers") {
      const headers = headerRowData.map((header: string, index: number) => ({
        name: (header && header.trim()) || `Column ${index + 1}`,
        index,
      }));
      
      console.log(`Returning ${headers.length} headers from row ${headerRow}:`, headers.map((h: any) => h.name).join(", "));
      return new Response(
        JSON.stringify({ success: true, headers }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // MODE: data - fetch products with column mapping
    // Data rows start after the header row
    const dataRows = rows.slice(headerRowIndex + 1);
    
    if (dataRows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No data rows found", products: [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!columnMapping) {
      throw new Error("columnMapping is required for data mode");
    }

    // Parse column mapping (can be index number or column name)
    const getColumnIndex = (value: string | number): number => {
      if (typeof value === "number") return value;
      const num = parseInt(value, 10);
      if (!isNaN(num)) return num;
      // Find by header name
      const idx = headerRowData.findIndex((h: string) => 
        h?.toLowerCase() === value?.toLowerCase()
      );
      return idx >= 0 ? idx : -1;
    };

    const titleIdx = getColumnIndex(columnMapping.title);
    const categoryIdx = getColumnIndex(columnMapping.category);
    const imageUrlIdx = getColumnIndex(columnMapping.image_url);
    const promptIdx = getColumnIndex(columnMapping.prompt);
    const platformIdx = getColumnIndex(columnMapping.platform);
    const productTypeIdx = columnMapping.product_type !== undefined ? getColumnIndex(columnMapping.product_type) : -1;

    console.log(`Column indices - title: ${titleIdx}, category: ${categoryIdx}, image_url: ${imageUrlIdx}, prompt: ${promptIdx}, platform: ${platformIdx}, product_type: ${productTypeIdx}`);
    console.log(`Processing ${dataRows.length} data rows`);

    const products: SheetRow[] = dataRows
      .filter((row) => row && row.length > 0)
      .map((row, rowIndex) => {
        const product = {
          title: titleIdx >= 0 && row[titleIdx] ? String(row[titleIdx]).trim() : null,
          category: categoryIdx >= 0 && row[categoryIdx] ? String(row[categoryIdx]).trim() : null,
          image_url: imageUrlIdx >= 0 && row[imageUrlIdx] ? String(row[imageUrlIdx]).trim() : null,
          prompt: promptIdx >= 0 && row[promptIdx] ? String(row[promptIdx]).trim() : null,
          platform: platformIdx >= 0 && row[platformIdx] ? String(row[platformIdx]).trim().toLowerCase() : "other",
          product_type: productTypeIdx >= 0 && row[productTypeIdx] ? String(row[productTypeIdx]).trim() : null,
        };
        console.log(`Row ${rowIndex + headerRow + 1}: title="${product.title}", image_url="${product.image_url?.substring(0, 50)}...", prompt length=${product.prompt?.length || 0}`);
        return product;
      })
      // Only filter out completely empty rows, not rows with some empty fields
      .filter((p) => p.title || p.image_url || p.prompt);

    console.log(`Parsed ${products.length} products (including those with some empty fields)`);

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
