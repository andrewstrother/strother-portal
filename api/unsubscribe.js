const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const PAGE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed · Andrew Strother</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f5f5f3; font-family: 'Jost', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #fff; border: 1px solid #e2e2e0; border-radius: 4px; padding: 52px 56px; max-width: 480px; width: 100%; }
    .brand { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #1a1a1a; }
    .brand span { font-weight: 300; color: #999; letter-spacing: 2px; margin-left: 8px; }
    .divider { height: 1px; background: #e2e2e0; margin: 28px 0; }
    h1 { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 36px; color: #1a1a1a; line-height: 1.1; margin-bottom: 16px; }
    p { font-size: 13px; color: #888; line-height: 1.7; font-weight: 300; }
    .footer { margin-top: 32px; font-size: 11px; color: #bbb; }
    .footer a { color: #1a1a1a; text-decoration: none; border-bottom: 1px solid #1a1a1a; padding-bottom: 1px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Andrew Strother <span>| Client Portal</span></div>
    <div class="divider"></div>
    <h1>You've been unsubscribed.</h1>
    <p>You'll no longer receive email notifications from the client portal. You can still access your portal at any time via your direct link.</p>
    <div class="footer">
      Questions? <a href="mailto:howdy@andrewstrother.com">howdy@andrewstrother.com</a>
    </div>
  </div>
</body>
</html>`;

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) return res.status(400).send("Missing token");

  // GET — show confirmation page
  if (req.method === "GET") {
    // Immediately unsubscribe on page load (one-click unsubscribe)
    await fetch(
      `${SUPABASE_URL}/rest/v1/clients?unsubscribe_token=eq.${encodeURIComponent(token)}`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ notifications_enabled: false }),
      }
    );
    return res.status(200).setHeader("Content-Type", "text/html").send(PAGE_HTML);
  }

  // PATCH — programmatic unsubscribe
  if (req.method === "PATCH") {
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?unsubscribe_token=eq.${encodeURIComponent(token)}`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ notifications_enabled: false }),
      }
    );
    if (!supaRes.ok) return res.status(500).json({ error: "Failed to unsubscribe" });
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
