import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const body = await req.json();

    // Supabase Database Webhook sends { type, table, record, old_record }
    const record = body.record ?? body;
    const { user_id, title, message, data, type } = record;

    if (!user_id || !title) {
      return new Response('Missing fields', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', user_id)
      .single();

    if (!profile?.push_token) {
      return new Response('No push token', { status: 200 });
    }

    const pushPayload = {
      to: profile.push_token,
      title,
      body: message,
      data: { ...(data ?? {}), type },
      sound: 'default',
      badge: 1,
      channelId: 'default',
    };

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(pushPayload),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
