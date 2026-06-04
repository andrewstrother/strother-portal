const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORTAL_URL = process.env.PORTAL_URL || "https://clients.andrewstrother.com";

async function getClient(clientId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}&select=name,email,notifications_enabled,unsubscribe_token,slug`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const data = await res.json();
  return data && data[0];
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function buildEmail({ subject, heading, rows, cta, unsubscribeUrl }) {
  const rowsHtml = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:6px 0;font-size:12px;color:#888;font-family:Helvetica Neue,Arial,sans-serif;width:130px;vertical-align:top;">${label}</td>
        <td style="padding:6px 0;font-size:13px;color:#1a1a1a;font-family:Helvetica Neue,Arial,sans-serif;vertical-align:top;">${value}</td>
      </tr>`)
    .join("");

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
            <span style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1a1a1a;font-family:Helvetica Neue,Arial,sans-serif;">ANDREW STROTHER</span>
            <span style="font-size:11px;color:#ccc;margin:0 8px;">|</span>
            <span style="font-size:11px;font-weight:300;letter-spacing:2px;text-transform:uppercase;color:#999;font-family:Helvetica Neue,Arial,sans-serif;">Client Portal</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#fff;border:1px solid #e2e2e0;border-radius:4px;padding:40px 44px;">
            <h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;color:#1a1a1a;margin:0 0 28px;line-height:1.2;">${heading}</h1>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f0f0ee;margin-bottom:28px;">
              <tbody>${rowsHtml}</tbody>
            </table>
            ${cta ? `<a href="${cta.url}" style="display:inline-block;background:#1a1a1a;color:#fff;font-family:Helvetica Neue,Arial,sans-serif;font-size:10px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;text-decoration:none;padding:12px 28px;border-radius:3px;">${cta.label}</a>` : ""}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;font-size:11px;color:#bbb;font-family:Helvetica Neue,Arial,sans-serif;text-align:center;line-height:1.6;">
            You're receiving this because you're a retainer client of Andrew Strother.<br>
            <a href="${unsubscribeUrl}" style="color:#bbb;">Unsubscribe from portal notifications</a>
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

  const { type, table, record, old_record } = req.body;
  const old = old_record || {};

  try {
    // ── New content idea posted ──
    if (table === "content_ideas" && type === "INSERT") {
      const client = await getClient(record.client_id);
      if (!client?.notifications_enabled || !client?.email) return res.status(200).json({ skipped: true });

      const unsubscribeUrl = `${PORTAL_URL}/unsubscribe?token=${client.unsubscribe_token}`;
      const portalUrl = client.slug ? `${PORTAL_URL}/client/${client.slug}` : PORTAL_URL;

      const html = buildEmail({
        heading: "Andrew shared a new content idea with you",
        rows: [
          ["Idea", record.title],
          ...(record.body ? [["Details", record.body]] : []),
        ],
        cta: { label: "View in Your Portal", url: portalUrl },
        unsubscribeUrl,
      });

      await sendEmail({ to: client.email, subject: `New content idea from Andrew — ${record.title}`, html });
      return res.status(200).json({ sent: true });
    }

    // ── Credits increased ──
    if (table === "clients" && type === "UPDATE") {
      const creditsIncreased = record.credits > (old.credits ?? 0);
      if (!creditsIncreased) return res.status(200).json({ skipped: true });

      const client = record;
      if (!client.notifications_enabled || !client.email) return res.status(200).json({ skipped: true });

      const unsubscribeUrl = `${PORTAL_URL}/unsubscribe?token=${client.unsubscribe_token}`;
      const portalUrl = client.slug ? `${PORTAL_URL}/client/${client.slug}` : PORTAL_URL;
      const added = record.credits - (old.credits ?? 0);

      const html = buildEmail({
        heading: "Your credits have been refreshed",
        rows: [
          ["Credits added", `${added}`],
          ["New balance", `${record.credits} credits`],
        ],
        cta: { label: "View Your Portal", url: portalUrl },
        unsubscribeUrl,
      });

      await sendEmail({ to: client.email, subject: `${added} credit${added !== 1 ? "s" : ""} added to your account`, html });
      return res.status(200).json({ sent: true });
    }

    // ── Shoot confirmed ──
    if (table === "content_ideas" && type === "UPDATE") {
      const justConfirmed = record.schedule_confirmed && !old.schedule_confirmed;
      if (!justConfirmed) return res.status(200).json({ skipped: true });

      const client = await getClient(record.client_id);
      if (!client?.notifications_enabled || !client?.email) return res.status(200).json({ skipped: true });

      const unsubscribeUrl = `${PORTAL_URL}/unsubscribe?token=${client.unsubscribe_token}`;
      const portalUrl = client.slug ? `${PORTAL_URL}/client/${client.slug}` : PORTAL_URL;
      const dateStr = formatDate(record.proposed_date);

      const html = buildEmail({
        heading: "Your shoot is confirmed",
        rows: [
          ["Shoot", record.title],
          ...(dateStr ? [["Date", dateStr]] : []),
        ],
        cta: { label: "View Your Portal", url: portalUrl },
        unsubscribeUrl,
      });

      await sendEmail({
        to: client.email,
        subject: `Shoot confirmed${dateStr ? ` — ${dateStr}` : ""} · Andrew Strother`,
        html,
      });
      return res.status(200).json({ sent: true });
    }

    return res.status(200).json({ skipped: true });
  } catch (e) {
    console.error("notify-client error:", e);
    return res.status(500).json({ error: e.message });
  }
}
