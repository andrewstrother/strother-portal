const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORTAL_URL = process.env.PORTAL_URL || "https://clients.andrewstrother.com";

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

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const todayDay = today.getUTCDate();

    let updated = 0;
    let skipped = 0;
    let notified = 0;
    const errors = [];

    for (const client of clients) {
      const rolloverDay = client.rollover_day ?? 1;
      const monthlyCredits = client.monthly_credits ?? 4;
      const maxCredits = client.max_credits ?? 16;

      // Only roll over on the configured day, and only once per day
      if (todayDay !== rolloverDay) { skipped++; continue; }
      if (client.last_rollover_date === todayStr) { skipped++; continue; }

      const newCredits = Math.min((client.credits ?? 0) + monthlyCredits, maxCredits);

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${client.id}`, {
        method: "PATCH",
        headers: { ...sbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ credits: newCredits, last_rollover_date: todayStr }),
      });
      if (!patchRes.ok) {
        errors.push({ client: client.name, error: await patchRes.text() });
        continue;
      }
      updated++;

      // Reuse the existing "new credits" email via /api/notify-client
      try {
        const notifyRes = await fetch(`${PORTAL_URL}/api/notify-client`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-webhook-secret": WEBHOOK_SECRET },
          body: JSON.stringify({
            type: "UPDATE",
            table: "clients",
            record: { ...client, credits: newCredits },
            old_record: client,
          }),
        });
        const result = notifyRes.ok ? await notifyRes.json() : null;
        if (result?.sent) notified++;
      } catch (e) {
        errors.push({ client: client.name, error: `notify failed: ${e.message}` });
      }
    }

    return res.status(200).json({ total: clients.length, updated, skipped, notified, errors });
  } catch (e) {
    console.error("cron-credits error:", e);
    return res.status(500).json({ error: e.message });
  }
}
