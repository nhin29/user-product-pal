import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase env vars");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resend inbound webhook sends JSON payload
    const payload = await req.json();
    console.log("Inbound webhook payload:", JSON.stringify(payload));

    // Extract fields from Resend inbound email
    const toAddresses: string[] = Array.isArray(payload.to) ? payload.to : [payload.to];
    const fromEmail: string = payload.from || "";
    const textBody: string = payload.text || payload.html || "";
    const subject: string = payload.subject || "";

    // Extract conversation_id from the To address (support+{convo_id}@trypeelkit.com)
    let conversationId: string | null = null;
    for (const addr of toAddresses) {
      const match = addr.match(/support\+([a-f0-9-]+)@/i);
      if (match) {
        conversationId = match[1];
        break;
      }
    }

    if (!conversationId) {
      console.error("No conversation ID found in To addresses:", toAddresses);
      return new Response(JSON.stringify({ error: "No conversation ID in address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify conversation exists
    const { data: convo, error: convoError } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("id", conversationId)
      .single();

    if (convoError || !convo) {
      console.error("Conversation not found:", conversationId);
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean the reply text - remove quoted/forwarded content
    const cleanedMessage = cleanReplyText(textBody);

    if (!cleanedMessage.trim()) {
      return new Response(JSON.stringify({ error: "Empty reply" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find admin user by email
    const { data: adminUsers } = await supabase.auth.admin.listUsers();
    const adminUser = adminUsers?.users?.find(
      (u) => u.email === "support@trypeelkit.com"
    );

    // Insert message as admin reply
    const { error: insertError } = await supabase.from("chats").insert({
      conversation_id: conversationId,
      sender_id: adminUser?.id || convo.user_id, // fallback to user_id if admin not found
      sender_role: "admin",
      message: cleanedMessage,
    });

    if (insertError) {
      console.error("Failed to insert chat:", insertError);
      throw insertError;
    }

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Get user email to notify them
    const { data: profiles } = await supabase.rpc("get_profiles_with_email");
    const userProfile = profiles?.find((p: any) => p.user_id === convo.user_id);
    const userEmail = userProfile?.email;

    if (userEmail) {
      // Send notification email to user
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "PeelKit Support <support@trypeelkit.com>",
          to: [userEmail],
          subject: "You have a new reply from PeelKit Support",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Support Reply</h2>
              <p style="color: #666;">Our team has responded to your message:</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0; white-space: pre-wrap;">${cleanedMessage}</p>
              </div>
              <p style="color: #999; font-size: 12px;">
                You can view the full conversation in the app.
              </p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error("Failed to notify user via email:", errBody);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in resend-inbound-webhook:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Strip quoted reply text from an email body.
 * Removes lines starting with "> " and common reply headers like "On ... wrote:"
 */
function cleanReplyText(text: string): string {
  if (!text) return "";

  const lines = text.split("\n");
  const cleanLines: string[] = [];

  for (const line of lines) {
    // Stop at common reply delimiters
    if (
      line.match(/^On .+ wrote:$/i) ||
      line.match(/^-{3,}\s*Original Message/i) ||
      line.match(/^>{2,}/) ||
      line.match(/^From:\s/i) && cleanLines.length > 0
    ) {
      break;
    }
    // Skip quoted lines
    if (line.startsWith("> ")) continue;
    cleanLines.push(line);
  }

  return cleanLines.join("\n").trim();
}
