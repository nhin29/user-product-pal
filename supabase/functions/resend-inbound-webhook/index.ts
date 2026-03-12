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

    const payload = await req.json();
    console.log("Inbound webhook payload type:", payload.type || "unknown");

    // Only process actual inbound email events
    if (payload.type && payload.type !== "email.received") {
      console.log(`Ignoring non-inbound event type: ${payload.type}`);
      return new Response(JSON.stringify({ ok: true, skipped: payload.type }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailData = payload.data || payload;

    const toAddresses: string[] = Array.isArray(emailData.to)
      ? emailData.to
      : typeof emailData.to === "string"
      ? [emailData.to]
      : [];
    const fromEmail: string = extractEmailAddress(emailData.from || "");
    const textBody: string = emailData.text || emailData.html || "";
    const subject: string = emailData.subject || "";

    console.log("Processing inbound email - From:", fromEmail, "To:", toAddresses, "Subject:", subject);

    if (!fromEmail) {
      console.error("No sender email found");
      return new Response(JSON.stringify({ error: "No sender email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to extract conversation_id from To address (reply flow)
    let conversationId: string | null = null;
    for (const addr of toAddresses) {
      const match = addr.match(/support\+([a-f0-9-]+)@/i);
      if (match) {
        conversationId = match[1];
        break;
      }
    }

    // Also check headers for Reply-To containing conversation ID
    if (!conversationId && emailData.headers) {
      const headers = Array.isArray(emailData.headers) ? emailData.headers : [];
      for (const h of headers) {
        if (h.name === "In-Reply-To" || h.name === "References") {
          const match = h.value?.match(/support\+([a-f0-9-]+)@/i);
          if (match) {
            conversationId = match[1];
            break;
          }
        }
      }
    }

    const cleanedMessage = cleanReplyText(textBody);
    if (!cleanedMessage.trim()) {
      return new Response(JSON.stringify({ error: "Empty message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // CASE 1: Reply to existing conversation (has conversation ID)
    // ============================================================
    if (conversationId) {
      console.log("Reply flow - conversation ID:", conversationId);
      return await handleReply(supabase, conversationId, fromEmail, cleanedMessage, RESEND_API_KEY);
    }

    // ============================================================
    // CASE 2: Direct email (no conversation ID) - create new conversation
    // ============================================================
    console.log("Direct email flow - from:", fromEmail);
    return await handleDirectEmail(supabase, fromEmail, cleanedMessage, subject, RESEND_API_KEY);

  } catch (error: unknown) {
    console.error("Error in resend-inbound-webhook:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---- Reply to existing conversation (admin replying via email) ----
async function handleReply(
  supabase: any,
  conversationId: string,
  fromEmail: string,
  message: string,
  resendApiKey: string
) {
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

  // Find admin user by email
  const { data: adminUsers } = await supabase.auth.admin.listUsers();
  const adminUser = adminUsers?.users?.find(
    (u: any) => u.email === "support@trypeelkit.com"
  );

  const { error: insertError } = await supabase.from("chats").insert({
    conversation_id: conversationId,
    sender_id: adminUser?.id || convo.user_id,
    sender_role: "admin",
    message,
  });

  if (insertError) {
    console.error("Failed to insert chat:", insertError);
    throw insertError;
  }

  console.log("Inserted admin reply for conversation:", conversationId);

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Notify user via email
  await notifyUserByEmail(supabase, convo.user_id, message, resendApiKey);

  return new Response(JSON.stringify({ success: true, flow: "reply" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- Direct email from user - create conversation ----
async function handleDirectEmail(
  supabase: any,
  fromEmail: string,
  message: string,
  subject: string,
  resendApiKey: string
) {
  // Look up user by email
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const matchedUser = authUsers?.users?.find(
    (u: any) => u.email?.toLowerCase() === fromEmail.toLowerCase()
  );

  if (!matchedUser) {
    console.log("No registered user found for email:", fromEmail);
    // Still accept the email - notify admin about unregistered sender
    await sendUnregisteredNotification(fromEmail, message, subject, resendApiKey);
    return new Response(
      JSON.stringify({ success: true, flow: "direct_unregistered", note: "Sender not registered" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = matchedUser.id;
  console.log("Matched user:", userId, "email:", fromEmail);

  // Check for existing open conversation
  const { data: existingConvos } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1);

  let conversationId: string;

  if (existingConvos && existingConvos.length > 0) {
    conversationId = existingConvos[0].id;
    console.log("Using existing conversation:", conversationId);
  } else {
    // Create new conversation
    const { data: newConvo, error: convoCreateError } = await supabase
      .from("conversations")
      .insert({ user_id: userId, status: "open" })
      .select("id")
      .single();

    if (convoCreateError || !newConvo) {
      console.error("Failed to create conversation:", convoCreateError);
      throw convoCreateError || new Error("Failed to create conversation");
    }
    conversationId = newConvo.id;
    console.log("Created new conversation:", conversationId);
  }

  // Insert the message as a user message
  const { error: insertError } = await supabase.from("chats").insert({
    conversation_id: conversationId,
    sender_id: userId,
    sender_role: "user",
    message: subject ? `[${subject}]\n\n${message}` : message,
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

  console.log("Inserted direct email message for conversation:", conversationId);

  return new Response(
    JSON.stringify({ success: true, flow: "direct_registered", conversationId }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ---- Notify user by email when admin replies ----
async function notifyUserByEmail(
  supabase: any,
  userId: string,
  message: string,
  resendApiKey: string
) {
  const { data: profiles } = await supabase.rpc("get_profiles_with_email");
  const userProfile = profiles?.find((p: any) => p.user_id === userId);
  const userEmail = userProfile?.email;

  if (!userEmail) {
    console.log("No email found for user:", userId);
    return;
  }

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
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
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
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

// ---- Notify admin about unregistered email sender ----
async function sendUnregisteredNotification(
  fromEmail: string,
  message: string,
  subject: string,
  resendApiKey: string
) {
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "PeelKit Support <noreply@trypeelkit.com>",
      to: ["support@trypeelkit.com"],
      subject: `Direct email from unregistered user: ${fromEmail}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email from Unregistered User</h2>
          <p style="color: #666;">From: <strong>${fromEmail}</strong></p>
          ${subject ? `<p style="color: #666;">Subject: ${subject}</p>` : ""}
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="color: #999; font-size: 12px;">
            This sender is not a registered user. Reply directly to this email to respond.
          </p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const errBody = await emailRes.text();
    console.error("Failed to send unregistered notification:", errBody);
  }
}

// ---- Utility: extract email from "Name <email>" format ----
function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  if (from.includes("@")) return from.trim().toLowerCase();
  return "";
}

// ---- Utility: strip quoted reply text ----
function cleanReplyText(text: string): string {
  if (!text) return "";

  const lines = text.split("\n");
  const cleanLines: string[] = [];

  for (const line of lines) {
    if (
      line.match(/^On .+ wrote:$/i) ||
      line.match(/^-{3,}\s*Original Message/i) ||
      line.match(/^>{2,}/) ||
      (line.match(/^From:\s/i) && cleanLines.length > 0)
    ) {
      break;
    }
    if (line.startsWith("> ")) continue;
    cleanLines.push(line);
  }

  return cleanLines.join("\n").trim();
}
