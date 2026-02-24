import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Missing env vars", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!supabaseAnonKey,
        hasServiceRole: !!serviceRoleKey,
      });
      return json(500, { error: "Server misconfigured" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify JWT using signing-keys compatible validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Invalid token", { claimsError, hasClaims: !!claimsData?.claims });
      return json(401, { error: "Invalid token" });
    }

    const requestingUserId = claimsData.claims.sub;

    // Use service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check requester role (server-side)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single();

    if (roleError) {
      console.error("Role lookup failed", roleError);
      return json(403, { error: "Unauthorized" });
    }

    if (roleData?.role !== "admin") {
      return json(403, { error: "Unauthorized - admin only" });
    }

    const { userId } = await req.json();
    if (!userId) {
      return json(400, { error: "userId is required" });
    }

    // Get user email for stripe_subscribers cleanup
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email;

    // Delete all related data from every table
    // First delete chats via conversations
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("user_id", userId);

    if (conversations && conversations.length > 0) {
      const convIds = conversations.map((c) => c.id);
      await supabaseAdmin.from("chats").delete().in("conversation_id", convIds);
      await supabaseAdmin.from("conversations").delete().eq("user_id", userId);
    }

    // Delete reviews first (references generated_images)
    await supabaseAdmin.from("reviews").delete().eq("user_id", userId);

    // Delete all user data from each table
    await Promise.all([
      supabaseAdmin.from("analytics_events").delete().eq("user_id", userId),
      supabaseAdmin.from("bookmarks").delete().eq("user_id", userId),
      supabaseAdmin.from("daily_time_tracking").delete().eq("user_id", userId),
      supabaseAdmin.from("device_sessions").delete().eq("user_id", userId),
      supabaseAdmin.from("generated_images").delete().eq("user_id", userId),
      supabaseAdmin.from("onboarding_responses").delete().eq("user_id", userId),
      supabaseAdmin.from("prompt_interactions").delete().eq("user_id", userId),
      supabaseAdmin.from("prompt_requests").delete().eq("user_id", userId),
      supabaseAdmin.from("support_chats").delete().eq("user_id", userId),
      supabaseAdmin.from("user_credits").delete().eq("user_id", userId),
      supabaseAdmin.from("user_product_seen").delete().eq("user_id", userId),
      supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
      supabaseAdmin.from("project_reviews").delete().eq("user_id", userId),
    ]);

    // Delete stripe subscriber by email
    if (userEmail) {
      await supabaseAdmin.from("stripe_subscribers").delete().eq("email", userEmail);
    }

    // Delete profile
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

    // Finally delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return json(500, { error: deleteError.message });
    }

    return json(200, { success: true });
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(500, { error: message });
  }
});
