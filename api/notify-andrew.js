const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ANDREW_EMAIL = process.env.ANDREW_EMAIL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

async function getClient(clientId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}&select=name,email`,
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

function buildEmail({ heading, rows, cta }) {
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
            <span style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1a1a1a;font-family:Helvetica Neue,Arial,sans-serif;">ANDREW STROTHER PHOTOGRAPHY</span>
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
            This notification was sent to you from your client portal system.<br>
            Reply to this email to reach Andrew directly.
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Verify webhook secret
  if (req.headers["x-webhook-secret"] !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type, record, old_record } = req.body;

  // Only handle content_ideas UPDATE
  if (type !== "UPDATE") return res.status(200).json({ skipped: true });

  const idea = record;
  const old = old_record || {};

  const noteChanged = idea.client_note && idea.client_note !== old.client_note;
  const statusChanged = idea.status !== old.status;
  const notableStatus = ["approved", "rejected", "schedule_requested"].includes(idea.status);

  if (!noteChanged && !(statusChanged && notableStatus)) {
    return res.status(200).json({ skipped: true });
  }

  const client = await getClient(idea.client_id);
  const clientName = client?.name || "Unknown client";

  let subject, heading, rows;

  if (statusChanged && idea.status === "schedule_requested") {
    const dateStr = formatDate(idea.proposed_date);
    subject = `Schedule requested${dateStr ? ` — ${dateStr}` : ""} · ${clientName}`;
    heading = "A client wants to schedule a shoot";
    rows = [
      ["Client", clientName],
      ["Idea", idea.title],
      ["Proposed date", dateStr || "Not specified"],
      ...(idea.client_note ? [["Note", idea.client_note]] : []),
    ];
  } else if (statusChanged && idea.status === "approved") {
    subject = `Idea approved by ${clientName}`;
    heading = "A client approved your content idea";
    rows = [
      ["Client", clientName],
      ["Idea", idea.title],
      ...(idea.client_note ? [["Note", idea.client_note]] : []),
    ];
  } else if (statusChanged && idea.status === "rejected") {
    subject = `Idea declined by ${clientName}`;
    heading = "A client declined your content idea";
    rows = [
      ["Client", clientName],
      ["Idea", idea.title],
      ...(idea.client_note ? [["Note", idea.client_note]] : []),
    ];
  } else {
    subject = `New note from ${clientName}`;
    heading = "A client left a note";
    rows = [
      ["Client", clientName],
      ["Idea", idea.title],
      ["Note", idea.client_note],
    ];
  }

  const html = buildEmail({
    subject,
    heading,
    rows,
    cta: { label: "Open Admin Portal", url: process.env.PORTAL_URL || "https://clients.andrewstrother.com" },
  });

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "clients@andrewstrother.com",
      reply_to: "howdy@andrewstrother.com",
      to: ANDREW_EMAIL,
      subject,
      html,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    console.error("Resend error:", err);
    return res.status(500).json({ error: err });
  }

  return res.status(200).json({ sent: true });
}
