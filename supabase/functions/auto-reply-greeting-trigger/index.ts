import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chat_id, question, user_id } = await req.json();
    
    console.log("Auto-reply trigger called for chat:", chat_id);
    console.log("Question:", question);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile for personalized greeting
    const { data: profiles } = await supabase.rpc("get_profiles_with_email");
    const userProfile = profiles?.find((p: any) => p.user_id === user_id);
    const userName = userProfile?.display_name || "there";

    console.log("Calling AI for user:", userName);

    // Call AI to generate response
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a friendly customer support assistant for PeelKit, a product design tool platform. 
Your task is to respond to user greetings warmly and helpfully.
Keep responses concise (1-2 sentences), friendly, and professional.
Greet the user back and ask how you can help them today.
The user's name is: ${userName}`,
          },
          {
            role: "user",
            content: question,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Hello! How can I help you today?";

    console.log("AI response:", aiResponse);

    // Update the support chat with the AI response
    const { error: updateError } = await supabase
      .from("support_chats")
      .update({
        answer: aiResponse,
        answered_at: new Date().toISOString(),
        answered_by: null, // null indicates auto-reply
        status: "answered",
      })
      .eq("id", chat_id);

    if (updateError) {
      console.error("Error updating chat:", updateError);
      throw updateError;
    }

    console.log("Successfully auto-replied to chat:", chat_id);

    return new Response(
      JSON.stringify({ success: true, answer: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-reply trigger error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
