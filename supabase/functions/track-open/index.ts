import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

// 1x1 transparent PNG
const PIXEL = Uint8Array.from(atob(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
), c => c.charCodeAt(0));

const PIXEL_RESPONSE = () => new Response(PIXEL, {
  status: 200,
  headers: {
    ...corsHeaders,
    'Content-Type': 'image/png',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Content-Length': String(PIXEL.length),
  },
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const logId = url.searchParams.get('log_id');
    const email = url.searchParams.get('email');

    if (!logId || !email) return PIXEL_RESPONSE();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    adminClient.from('email_opens').insert({
      email_log_id: logId,
      recipient_email: email,
    }).then(({ error }) => {
      if (error) console.error('track-open insert:', error);
    });
  } catch (err) {
    console.error('track-open error:', err);
  }

  return PIXEL_RESPONSE();
});
