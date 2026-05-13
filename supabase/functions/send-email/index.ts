import nodemailer from 'npm:nodemailer@6';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

interface Attachment {
  filename: string;
  content: string; // base64-encoded
  contentType: string;
}

interface Recipient {
  email: string;
  name: string;
}

interface SendEmailPayload {
  recipients: Recipient[];
  subject: string;
  html: string;
  attachments?: Attachment[];
  account_id: string;
  log_id?: string;
}

function buildHtmlWithPixel(html: string, supabaseUrl: string, logId: string, recipientEmail: string): string {
  const pixelUrl = `${supabaseUrl}/functions/v1/track-open?log_id=${encodeURIComponent(logId)}&email=${encodeURIComponent(recipientEmail)}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0" alt="" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: SendEmailPayload = await req.json();

    if (!payload.recipients?.length) {
      return new Response(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!payload.subject?.trim() || !payload.html?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Subject and html are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!payload.account_id) {
      return new Response(
        JSON.stringify({ error: 'account_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: account, error: accountError } = await adminClient
      .from('sender_accounts')
      .select('from_name, from_email, smtp_host, smtp_port, smtp_user, smtp_pass')
      .eq('id', payload.account_id)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'Sender account not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_port === 465,
      auth: { user: account.smtp_user, pass: account.smtp_pass },
    });

    const nodemailerAttachments = (payload.attachments ?? []).map((a) => ({
      filename: a.filename,
      content: Uint8Array.from(atob(a.content), (c) => c.charCodeAt(0)),
      contentType: a.contentType,
    }));

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const recipient of payload.recipients) {
      const html = payload.log_id
        ? buildHtmlWithPixel(payload.html, supabaseUrl, payload.log_id, recipient.email)
        : payload.html;

      try {
        await transporter.sendMail({
          from: `"${account.from_name}" <${account.from_email}>`,
          to: recipient.name
            ? `"${recipient.name}" <${recipient.email}>`
            : recipient.email,
          subject: payload.subject,
          html,
          attachments: nodemailerAttachments,
        });
        results.push({ email: recipient.email, success: true });
      } catch (err) {
        results.push({ email: recipient.email, success: false, error: String(err) });
      }
    }

    const failed = results.filter((r) => !r.success);
    const status = failed.length === results.length ? 500 : 200;

    return new Response(
      JSON.stringify({ results, sent: results.length - failed.length, failed: failed.length }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
