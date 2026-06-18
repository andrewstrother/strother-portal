// Lightweight cron-triggered query to keep the Supabase free-tier project from
// being paused for inactivity. Read-only count, no auth required, no sensitive data.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

export default async function handler(req, res) {
  try {
    // SELECT count(*) FROM clients
    const countRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=count`, {
      headers: sbHeaders,
    });
    if (!countRes.ok) throw new Error(await countRes.text());

    return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error("keep-alive error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
