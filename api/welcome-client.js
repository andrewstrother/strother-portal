const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORTAL_URL = process.env.PORTAL_URL || "https://clients.andrewstrother.com";

async function getClient(clientId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}&select=id,name,email,slug,unsubscribe_token,welcome_sent`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const data = await res.json();
  return data && data[0];
}

async function markWelcomeSent(clientId) {
  await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ welcome_sent: true }),
  });
}

function buildEmail({ name, portalUrl, unsubscribeUrl }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:Helvetica Neue,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="padding-bottom:28px;">
            <span style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1a1a1a;font-family:Helvetica Neue,Arial,sans-serif;">ANDREW STROTHER PHOTOGRAPHY</span>
            <span style="font-size:11px;color:#ccc;margin:0 8px;">|</span>
            <span style="font-size:11px;font-weight:300;letter-spacing:2px;text-transform:uppercase;color:#999;font-family:Helvetica Neue,Arial,sans-serif;">Client Portal</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#fff;border:1px solid #e2e2e0;border-radius:4px;padding:40px 44px;">
            <h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;color:#1a1a1a;margin:0 0 20px;line-height:1.2;">Welcome, ${name}</h1>
            <p style="font-size:14px;color:#555;font-family:Helvetica Neue,Arial,sans-serif;line-height:1.7;margin:0 0 16px;">
              We're excited to have you on retainer. Your client portal is now live — it's where you can check your credit balance, browse your full shoot history with links to every gallery, and review and approve new content ideas as Andrew shares them with you.
            </p>
            <p style="font-size:14px;color:#555;font-family:Helvetica Neue,Arial,sans-serif;line-height:1.7;margin:0 0 16px;">
              You're starting with <strong style="color:#1a1a1a;">4 credits</strong>, refreshed every month — any unused credits simply roll over.
            </p>
            <p style="font-size:14px;color:#555;font-family:Helvetica Neue,Arial,sans-serif;line-height:1.7;margin:0 0 28px;">
              No password required — sign in anytime with this email address using a secure link or a 6-digit code.
            </p>
            <a href="${portalUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;font-family:Helvetica Neue,Arial,sans-serif;font-size:10px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;text-decoration:none;padding:12px 28px;border-radius:3px;">Visit Your Portal</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;font-size:11px;color:#999;font-family:Helvetica Neue,Arial,sans-serif;text-align:center;line-height:1.6;">
            You're receiving this because you're a retainer client of Andrew Strother Photography.<br>
            <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe from portal notifications</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "clients@andrewstrother.com",
      reply_to: "howdy@andrewstrother.com",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (req.headers["x-webhook-secret"] !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type, table, record, client_id } = req.body || {};

  // Supabase fires this as a DB webhook on clients INSERT; the admin panel's
  // "Resend Welcome Email" button calls it directly with just a client_id
  if (table && table !== "clients") return res.status(200).json({ skipped: true });
  if (type && type !== "INSERT") return res.status(200).json({ skipped: true });

  const clientId = client_id || record?.id;
  if (!clientId) return res.status(400).json({ error: "Missing client id" });

  try {
    const client = await getClient(clientId);
    if (!client?.email || !client?.slug || client.welcome_sent) {
      return res.status(200).json({ skipped: true });
    }

    const unsubscribeUrl = `${PORTAL_URL}/unsubscribe?token=${client.unsubscribe_token}`;
    const portalUrl = `${PORTAL_URL}/${client.slug}`;

    const html = buildEmail({ name: client.name, portalUrl, unsubscribeUrl });

    await sendEmail({ to: client.email, subject: `Welcome to your client portal, ${client.name}`, html });
    await markWelcomeSent(client.id);

    return res.status(200).json({ sent: true });
  } catch (e) {
    console.error("welcome-client error:", e);
    return res.status(500).json({ error: e.message });
  }
}
