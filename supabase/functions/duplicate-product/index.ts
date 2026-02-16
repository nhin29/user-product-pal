import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { source_id, overrides } = await req.json();

  // Fetch source product
  const { data: source, error: fetchError } = await supabase
    .from("products")
    .select("*")
    .eq("id", source_id)
    .single();

  if (fetchError || !source) {
    return new Response(JSON.stringify({ error: "Product not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get max display_order for correct ordering
  const { data: maxOrderData } = await supabase
    .from("products")
    .select("display_order")
    .order("display_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrderData?.display_order ?? 0) + 1;

  // Remove id and timestamps
  const { id, created_at, updated_at, display_order, ...productData } = source;

  const { data, error } = await supabase
    .from("products")
    .insert({ ...productData, ...overrides, display_order: nextOrder })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
