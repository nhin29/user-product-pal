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

interface SyncResponse {
  success: boolean;
  error?: string;
  message?: string;
  headers?: { name: string; index: number }[];
  products?: SheetRow[];
  warnings?: string[];
}

interface SyncRequest {
  sheetId: string;
  sheetName: string;
  headerRow?: number;
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
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly",
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

// Fetch data from Google Sheets with specified render option
async function fetchSheetValues(
  accessToken: string,
  sheetId: string,
  sheetName: string,
  valueRenderOption: string = "FORMATTED_VALUE"
): Promise<any[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?valueRenderOption=${valueRenderOption}`;
  
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

// Fetch spreadsheet with grid data to get embedded images
async function fetchSheetWithGridData(
  accessToken: string,
  sheetId: string,
  sheetName: string
): Promise<any> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?ranges=${encodeURIComponent(sheetName)}&includeGridData=true`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Sheets API grid data error:", error);
    return null;
  }

  return await response.json();
}

// Extract URL from IMAGE() formula
function extractImageUrlFromFormula(formula: string): string | null {
  if (!formula || typeof formula !== "string") return null;
  
  // Match =IMAGE("url") or =IMAGE("url", ...) patterns
  const patterns = [
    /=IMAGE\s*\(\s*"([^"]+)"/i,
    /=IMAGE\s*\(\s*'([^']+)'/i,
  ];
  
  for (const pattern of patterns) {
    const match = formula.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Check if value looks like a URL
function isUrl(value: string): boolean {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//");
}

// Convert Google Drive sharing link to direct image URL
function convertGoogleDriveUrl(url: string): string {
  if (!url) return url;
  
  // Handle various Google Drive URL formats
  // Format: https://drive.google.com/file/d/FILE_ID/view?...
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveFileMatch[1]}`;
  }
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveOpenMatch[1]}`;
  }
  
  // Format: https://drive.google.com/uc?id=FILE_ID (already correct)
  if (url.includes("drive.google.com/uc")) {
    return url;
  }
  
  return url;
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

    const headerRowIndex = Math.max(0, headerRow - 1);
    console.log(`Mode: ${mode}, Sheet: ${sheetId}, Tab: ${sheetName}, Header Row: ${headerRow}`);

    const accessToken = await getAccessToken(serviceAccount);
    console.log("Got access token");

    // Fetch both formatted values and formulas
    const [formattedRows, formulaRows, gridData] = await Promise.all([
      fetchSheetValues(accessToken, sheetId, sheetName, "FORMATTED_VALUE"),
      fetchSheetValues(accessToken, sheetId, sheetName, "FORMULA"),
      mode === "data" ? fetchSheetWithGridData(accessToken, sheetId, sheetName) : null,
    ]);

    console.log(`Fetched ${formattedRows.length} rows (formatted), ${formulaRows.length} rows (formulas)`);

    const rows = formattedRows;
    
     if (rows.length === 0) {
      return new Response(
         JSON.stringify({ success: true, headers: [], products: [], warnings: [] } satisfies SyncResponse),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (rows.length <= headerRowIndex) {
      return new Response(
        JSON.stringify({ success: false, error: `Sheet doesn't have enough rows. Header row ${headerRow} not found.` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const headerRowData = rows[headerRowIndex];

    // MODE: headers
    if (mode === "headers") {
      const headers = headerRowData.map((header: string, index: number) => ({
        name: (header && header.trim()) || `Column ${index + 1}`,
        index,
      }));
      
      console.log(`Returning ${headers.length} headers from row ${headerRow}:`, headers.map((h: any) => h.name).join(", "));
      return new Response(
         JSON.stringify({ success: true, headers, warnings: [] } satisfies SyncResponse),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // MODE: data
    const dataRows = rows.slice(headerRowIndex + 1);
    const formulaDataRows = formulaRows.slice(headerRowIndex + 1);
    
    // Extract embedded images from grid data
    let embeddedImages: Map<string, string> = new Map();
    let cellHyperlinks: Map<string, string> = new Map();
     const warnings: string[] = [];
    if (gridData?.sheets?.[0]?.data?.[0]?.rowData) {
      const rowData = gridData.sheets[0].data[0].rowData;
      rowData.forEach((row: any, rowIdx: number) => {
        if (row?.values) {
          row.values.forEach((cell: any, colIdx: number) => {
            // Check for cell image (userEnteredValue with image)
            if (cell?.userEnteredValue?.image?.sourceUri) {
              embeddedImages.set(`${rowIdx}-${colIdx}`, cell.userEnteredValue.image.sourceUri);
              console.log(`Found embedded image at ${rowIdx}-${colIdx}: ${cell.userEnteredValue.image.sourceUri}`);
            }
            // Capture hyperlinks (often used when the visible cell value is empty)
            if (cell?.hyperlink && typeof cell.hyperlink === "string") {
              cellHyperlinks.set(`${rowIdx}-${colIdx}`, cell.hyperlink);
              console.log(`Found hyperlink at ${rowIdx}-${colIdx}: ${cell.hyperlink}`);
            }
          });
        }
      });
    }
    console.log(`Found ${embeddedImages.size} embedded images in grid data`);
    console.log(`Found ${cellHyperlinks.size} hyperlinks in grid data`);
    
    if (dataRows.length === 0) {
      return new Response(
         JSON.stringify({ success: true, message: "No data rows found", products: [], warnings: [] } satisfies SyncResponse),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!columnMapping) {
      throw new Error("columnMapping is required for data mode");
    }

    const getColumnIndex = (value: string | number): number => {
      if (typeof value === "number") return value;
      const num = parseInt(value, 10);
      if (!isNaN(num)) return num;
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

    // Log first row's raw data
    if (dataRows.length > 0) {
      console.log(`First data row formatted: ${JSON.stringify(dataRows[0].slice(0, 10))}`);
      if (formulaDataRows[0]) {
        console.log(`First data row formulas: ${JSON.stringify(formulaDataRows[0].slice(0, 10))}`);
      }
    }

    const products: SheetRow[] = dataRows
      .filter((row) => row && row.length > 0)
      .map((row, rowIndex) => {
        const formulaRow = formulaDataRows[rowIndex] || [];
        
        const getValue = (idx: number): string | null => {
          if (idx < 0) return null;
          
          // First check formatted value
          const formattedVal = idx < row.length ? row[idx] : undefined;
          const formulaVal = idx < formulaRow.length ? formulaRow[idx] : undefined;
          
          // Try to extract image URL from formula (e.g., =IMAGE("url"))
          if (formulaVal && typeof formulaVal === "string" && formulaVal.toUpperCase().includes("IMAGE(")) {
            const imageUrl = extractImageUrlFromFormula(formulaVal);
            if (imageUrl) {
              console.log(`Extracted image URL from formula: ${imageUrl}`);
              return convertGoogleDriveUrl(imageUrl);
            }
          }
          
          // Row index in grid data = headerRowIndex + 1 + rowIndex
          const gridRowIdx = headerRowIndex + 1 + rowIndex;

          // Prefer embedded image sourceUri when present
          const embeddedImageKey = `${gridRowIdx}-${idx}`;
          if (embeddedImages.has(embeddedImageKey)) {
            return embeddedImages.get(embeddedImageKey)!;
          }

          // If the cell is a hyperlink (common for Drive links) and formatted value is empty,
          // use the hyperlink as the actual value.
          const hyperlinkKey = `${gridRowIdx}-${idx}`;
          const hyperlink = cellHyperlinks.get(hyperlinkKey);
          if (hyperlink && (!formattedVal || String(formattedVal).trim() === "")) {
            return convertGoogleDriveUrl(hyperlink);
          }
          
          // Return formatted value if it exists
          if (formattedVal === undefined || formattedVal === null || formattedVal === "") return null;
          
          const strVal = String(formattedVal).trim();
          
          // Convert Google Drive URLs to direct image URLs
          if (isUrl(strVal)) {
            return convertGoogleDriveUrl(strVal);
          }
          
          return strVal;
        };

        const product = {
          title: getValue(titleIdx),
          category: getValue(categoryIdx),
          image_url: getValue(imageUrlIdx),
          prompt: getValue(promptIdx),
          platform: getValue(platformIdx)?.toLowerCase() || "other",
          product_type: getValue(productTypeIdx),
        };
        
        console.log(`Row ${rowIndex + headerRow + 1}: title="${product.title || '(empty)'}", category="${product.category || '(empty)'}", image_url="${(product.image_url || '').substring(0, 80) || '(empty)'}", prompt length=${product.prompt?.length || 0}`);
        return product;
      })
      .filter((p) => p.title || p.image_url || p.prompt || p.category);

    console.log(`Parsed ${products.length} products`);

     // If user mapped an image column but we never found any URLs nor embedded image URLs,
     // it is very likely the sheet uses "Insert > Image" (image-in-cell) which does NOT
     // provide a retrievable URL in the Sheets API.
     if (
       imageUrlIdx >= 0 &&
       embeddedImages.size === 0 &&
       products.length > 0 &&
       products.every((p) => !p.image_url)
     ) {
       const headerName = headerRowData?.[imageUrlIdx] || `Column ${imageUrlIdx + 1}`;
       warnings.push(
         `The mapped image column "${headerName}" appears to contain inserted images (not URLs). Google Sheets API cannot extract those images. Use a column with a public image URL / Google Drive link, or store the image as an =IMAGE("url") formula.`
       );
     }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Found ${products.length} products`,
         products,
         warnings,
       } satisfies SyncResponse),
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
