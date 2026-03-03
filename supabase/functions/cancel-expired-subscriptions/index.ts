import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // Find active subscriptions past their period end
    const { data: expiredSubs, error: fetchError } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, product_id")
      .eq("status", "active")
      .not("current_period_end", "is", null)
      .lt("current_period_end", now);

    if (fetchError) throw fetchError;

    let canceledCount = 0;

    for (const sub of expiredSubs || []) {
      // Cancel subscription
      const { error: cancelError } = await supabase
        .from("user_subscriptions")
        .update({
          status: "canceled",
          canceled_at: now,
        })
        .eq("id", sub.id);

      if (cancelError) {
        console.error(`Failed to cancel sub ${sub.id}:`, cancelError);
        continue;
      }

      // Mark credits as expired
      const { error: creditError } = await supabase
        .from("user_credits")
        .update({
          status: "expired",
        })
        .eq("user_id", sub.user_id)
        .eq("status", "subscribed");

      if (creditError) {
        console.error(`Failed to update credits for ${sub.user_id}:`, creditError);
      }

      canceledCount++;
    }

    console.log(`Canceled ${canceledCount} expired subscriptions`);

    return new Response(
      JSON.stringify({ success: true, canceledCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
