import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function can be invoked via cron (pg_cron / Supabase dashboard)
// or called manually from the admin dashboard.
//
// To schedule daily at 8 AM UTC, run in SQL Editor:
//   SELECT cron.schedule(
//     'check-document-expiry',
//     '0 8 * * *',
//     $$SELECT check_and_expire_documents()$$
//   );
//
// Alternatively, this edge function wraps the SQL function for HTTP invocation.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Call the database function that handles all expiry logic
    const { data, error } = await supabase.rpc("check_and_expire_documents");

    if (error) {
      return new Response(
        JSON.stringify({ error: "Failed to check document expiry", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
