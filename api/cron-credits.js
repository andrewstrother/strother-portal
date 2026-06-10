const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const MONTHLY_CREDITS = 4;
const MAX_CREDITS = 16;

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const clientsRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=*`, { headers: sbHeaders });
    if (!clientsRes.ok) throw new Error(await clientsRes.text());
    const clients = await clientsRes.json();

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const client of clients) {
      const newCredits = Math.min((client.credits ?? 0) + MONTHLY_CREDITS, MAX_CREDITS);
      if (newCredits === client.credits) { skipped++; continue; }

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${client.id}`, {
        method: "PATCH",
        headers: { ...sbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ credits: newCredits }),
      });
      if (!patchRes.ok) {
        errors.push({ client: client.name, error: await patchRes.text() });
        continue;
      }
      updated++;
    }

    return res.status(200).json({ total: clients.length, updated, skipped, errors });
  } catch (e) {
    console.error("cron-credits error:", e);
    return res.status(500).json({ error: e.message });
  }
}
