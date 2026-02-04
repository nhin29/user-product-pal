import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client for storage operations
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Extract Google Drive file ID from various URL formats
function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  
  // Format: https://drive.google.com/file/d/FILE_ID/view?...
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) return driveFileMatch[1];
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) return driveOpenMatch[1];
  
  // Format: https://drive.google.com/uc?...&id=FILE_ID
  if (url.includes("drive.google.com/uc")) {
    try {
      const u = new URL(url);
      const id = u.searchParams.get("id");
      if (id) return id;
    } catch {
      const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
  }
  
  return null;
}

// Download image from Google Drive and upload to Supabase Storage
async function downloadAndUploadImage(
  driveAccessToken: string,
  imageUrl: string,
  productIndex: number
): Promise<string | null> {
  try {
    const fileId = extractGoogleDriveFileId(imageUrl);
    
    if (!fileId) {
      // Not a Google Drive URL, return as-is
      console.log(`Not a Google Drive URL, returning as-is: ${imageUrl.substring(0, 50)}...`);
      return imageUrl;
    }
    
    console.log(`Downloading Google Drive file: ${fileId}`);

    // Attempt #1: Drive API (requires the file be shared with the service account)
    const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    let downloadResponse = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${driveAccessToken}` },
      redirect: "follow",
    });

    // Attempt #2: Public link fallback (works when file is truly public but not shared with service account)
    if (!downloadResponse.ok) {
      console.warn(
        `Drive API download failed (${downloadResponse.status}). Trying public uc?export=download fallback...`
      );
      const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      downloadResponse = await fetch(publicUrl, { redirect: "follow" });
    }

    if (!downloadResponse.ok) {
      console.error(
        `Failed to download image (api+public): ${downloadResponse.status} ${downloadResponse.statusText}`
      );
      // Return the public URL as the last resort (UI may still render if Drive allows it)
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    const contentType = downloadResponse.headers.get("content-type") || "";
    const imageBuffer = await downloadResponse.arrayBuffer();

    console.log(`Downloaded ${imageBuffer.byteLength} bytes, content-type: ${contentType || "(none)"}`);

    // If Drive returned HTML, it usually means a permission/confirmation page, not the image bytes.
    if (contentType.includes("text/html") || imageBuffer.byteLength < 100) {
      console.warn(
        `Drive returned non-image payload (content-type=${contentType}, bytes=${imageBuffer.byteLength}). Returning Drive URL.`
      );
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    // Determine file extension from content type
    let extension = "jpg";
    if (contentType.includes("png")) extension = "png";
    else if (contentType.includes("gif")) extension = "gif";
    else if (contentType.includes("webp")) extension = "webp";
    else if (contentType.includes("svg")) extension = "svg";
    
    // Generate unique filename using timestamp and index
    const timestamp = Date.now();
    const filename = `sheets-import/${timestamp}-${productIndex}-${fileId.substring(0, 8)}.${extension}`;
    
    // Upload to Supabase Storage
    const supabase = getSupabaseClient();
    const fileBytes = new Uint8Array(imageBuffer);

    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(filename, fileBytes, {
        contentType: contentType || "application/octet-stream",
        cacheControl: "3600",
        upsert: true,
      });
    
    if (error) {
      console.error(`Failed to upload to Supabase Storage: ${error.message}`);
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filename);
    
    console.log(`Uploaded to Supabase Storage: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
    
  } catch (error) {
    console.error(`Error processing image: ${error}`);
    return imageUrl; // Return original URL as fallback
  }
}

interface SheetRow {
  category: string | null;
  image_url: string | null;
  prompt: string | null;
  platform: string;
  product_type: string | null;
  made_by: string | null;
  note: string | null;
}

interface SyncResponse {
  success: boolean;
  error?: string;
  message?: string;
  sheets?: { title: string; index: number }[];
  headers?: { name: string; index: number }[];
  products?: SheetRow[];
  warnings?: string[];
}

interface SyncRequest {
  sheetId: string;
  sheetName?: string;
  headerRow?: number;
  mode?: "sheets" | "headers" | "data";
  columnMapping?: {
    category: number;
    image_url: number;
    prompt: number;
    platform: number;
    product_type?: number;
    made_by?: number;
    note?: number;
  };
}

// Fetch spreadsheet metadata to get all sheet names
async function fetchSpreadsheetMetadata(
  accessToken: string,
  sheetId: string
): Promise<{ title: string; index: number }[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Sheets API metadata error:", error);
    throw new Error(`Failed to fetch spreadsheet: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const sheets = data.sheets || [];
  
  return sheets.map((sheet: any) => ({
    title: sheet.properties?.title || "Untitled",
    index: sheet.properties?.index ?? 0,
  })).sort((a: any, b: any) => a.index - b.index);
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
    
    // Check for sheet/tab not found error
    const errorMessage = error.error?.message || response.statusText;
    if (response.status === 400 && errorMessage.includes("Unable to parse range")) {
      throw new Error(`SHEET_NOT_FOUND:The tab "${sheetName}" was not found in this spreadsheet. Please check the tab name and try again.`);
    }
    
    throw new Error(`Failed to fetch sheet: ${errorMessage}`);
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

  // Prefer a direct content response for <img> usage.
  // `uc?export=view` often returns an HTML wrapper depending on file settings.
  // `uc?export=download` is more reliable for direct binary.
  
  // Handle various Google Drive URL formats
  // Format: https://drive.google.com/file/d/FILE_ID/view?...
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`;
  }
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`;
  }
  
  // Format: https://drive.google.com/uc?...&id=FILE_ID
  if (url.includes("drive.google.com/uc")) {
    try {
      const u = new URL(url);
      // Force export=download for reliability
      u.searchParams.set("export", "download");
      return u.toString();
    } catch {
      return url.replace("export=view", "export=download");
    }
  }

  // Format: https://drive.google.com/thumbnail?id=FILE_ID...
  // Keep as-is (already intended for images)
  if (url.includes("drive.google.com/thumbnail")) {
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

    if (!sheetId) {
      throw new Error("Missing sheetId");
    }

    const accessToken = await getAccessToken(serviceAccount);
    console.log("Got access token");

    // MODE: sheets - return list of all sheet/tab names
    if (mode === "sheets") {
      console.log(`Fetching sheet list for spreadsheet: ${sheetId}`);
      const sheets = await fetchSpreadsheetMetadata(accessToken, sheetId);
      console.log(`Found ${sheets.length} sheets:`, sheets.map(s => s.title).join(", "));
      
      return new Response(
        JSON.stringify({ success: true, sheets, warnings: [] } satisfies SyncResponse),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For headers and data modes, sheetName is required
    if (!sheetName) {
      throw new Error("Missing sheetName for headers/data mode");
    }

    const headerRowIndex = Math.max(0, headerRow - 1);
    console.log(`Mode: ${mode}, Sheet: ${sheetId}, Tab: ${sheetName}, Header Row: ${headerRow}`);

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

    const categoryIdx = getColumnIndex(columnMapping.category);
    const imageUrlIdx = getColumnIndex(columnMapping.image_url);
    const promptIdx = getColumnIndex(columnMapping.prompt);
    const platformIdx = getColumnIndex(columnMapping.platform);
    const productTypeIdx = columnMapping.product_type !== undefined ? getColumnIndex(columnMapping.product_type) : -1;
    const madeByIdx = columnMapping.made_by !== undefined ? getColumnIndex(columnMapping.made_by) : -1;
    const noteIdx = columnMapping.note !== undefined ? getColumnIndex(columnMapping.note) : -1;

    console.log(`Column indices - category: ${categoryIdx}, image_url: ${imageUrlIdx}, prompt: ${promptIdx}, platform: ${platformIdx}, product_type: ${productTypeIdx}, made_by: ${madeByIdx}, note: ${noteIdx}`);
    console.log(`Processing ${dataRows.length} data rows`);

    // Log first row's raw data
    if (dataRows.length > 0) {
      console.log(`First data row formatted: ${JSON.stringify(dataRows[0].slice(0, 10))}`);
      if (formulaDataRows[0]) {
        console.log(`First data row formulas: ${JSON.stringify(formulaDataRows[0].slice(0, 10))}`);
      }
    }

    // First pass: extract raw data without image processing
    const rawProducts = dataRows
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
              return imageUrl; // Return raw URL, will process later
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
            return hyperlink; // Return raw URL, will process later
          }
          
          // Return formatted value if it exists
          if (formattedVal === undefined || formattedVal === null || formattedVal === "") return null;
          
          const strVal = String(formattedVal).trim();
          return strVal;
        };

        const product = {
          category: getValue(categoryIdx),
          image_url: getValue(imageUrlIdx),
          prompt: getValue(promptIdx),
          platform: getValue(platformIdx)?.toLowerCase() || "other",
          product_type: getValue(productTypeIdx),
          made_by: getValue(madeByIdx),
          note: getValue(noteIdx),
        };
        
        console.log(`Row ${rowIndex + headerRow + 1}: image_url="${(product.image_url || '').substring(0, 80) || '(empty)'}"`);
        return { product, rowIndex };
      })
      .filter((p) => p.product.image_url || p.product.prompt || p.product.category);

    console.log(`Found ${rawProducts.length} raw products, now processing images...`);

    // Second pass: download Google Drive images to Supabase Storage
    const products: SheetRow[] = await Promise.all(
      rawProducts.map(async ({ product, rowIndex }) => {
        if (product.image_url && isUrl(product.image_url)) {
          const fileId = extractGoogleDriveFileId(product.image_url);
          if (fileId) {
            // It's a Google Drive URL - download and upload to Supabase
            const storageUrl = await downloadAndUploadImage(accessToken, product.image_url, rowIndex);
            if (storageUrl) {
              console.log(`Image for row ${rowIndex}: ${product.image_url.substring(0, 40)}... → ${storageUrl.substring(0, 60)}...`);
              product.image_url = storageUrl;
            }
          }
          // Non-Google-Drive URLs are kept as-is
        }
        return product;
      })
    );

    console.log(`Parsed ${products.length} products with processed images`);

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
