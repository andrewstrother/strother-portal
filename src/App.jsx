// ============================================================
// ANDREW STROTHER — CLIENT PORTAL
// Supabase-connected: credits, shoot history, content ideas
// ============================================================
//
// SETUP: Replace the two lines below with your Supabase credentials.
// Get them from: supabase.com → your project → Settings → API
//
const SUPABASE_URL = "https://vavpdxzxvvzlvlmvolcf.supabase.co/";
const SUPABASE_ANON_KEY = "sb_publishable_7NtIMNOWuMcomZD-yiCSGA_4nXh9bk8";
//
// ============================================================

import { useState, useEffect, useCallback } from "react";

const ADMIN_PIN = "1138"; // Change this to your preferred PIN

// ── Supabase client (no npm needed — uses the CDN REST API directly) ──
async function sb(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Tiny helpers ──
const q = (params) => "?" + new URLSearchParams(params).toString();

async function getClients() {
  return sb("clients?select=*&order=name.asc");
}
async function addClient(name, since) {
  return sb("clients", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ name, since, credits: 4 }),
  });
}
async function updateCredits(clientId, credits) {
  return sb(`clients?id=eq.${clientId}`, {
    method: "PATCH",
    body: JSON.stringify({ credits }),
  });
}
async function getShoots(clientId) {
  return sb(`shoots?client_id=eq.${clientId}&order=date.desc`);
}
async function addShoot(clientId, description, date, credits, month) {
  return sb("shoots", {
    method: "POST",
    body: JSON.stringify({ client_id: clientId, description, date, credits, month }),
  });
}
async function getIdeas(clientId) {
  return sb(`content_ideas?client_id=eq.${clientId}&order=created_at.desc`);
}
async function addIdea(clientId, title, body) {
  return sb("content_ideas", {
    method: "POST",
    body: JSON.stringify({ client_id: clientId, title, body, status: "pending" }),
  });
}
async function updateIdea(ideaId, patch) {
  return sb(`content_ideas?id=eq.${ideaId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// ── Shared styles ──
const inputStyle = {
  width: "100%", border: "1px solid #e2e2e0", borderRadius: 3,
  padding: "9px 12px", fontSize: 13, fontFamily: "'Jost', sans-serif",
  color: "#1a1a1a", background: "#fff", outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase",
  color: "#bbb", display: "block", marginBottom: 6,
};
const btnPrimary = {
  background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 3,
  padding: "11px 26px", fontSize: 10, fontWeight: 500, letterSpacing: 2.5,
  textTransform: "uppercase", cursor: "pointer", fontFamily: "'Jost', sans-serif",
};
const MONTHS = [
  "April 2025","March 2025","February 2025","January 2025",
  "December 2024","November 2024","October 2024",
];

// ── Status badge ──
function StatusBadge({ status }) {
  const map = {
    pending:  { bg: "#f5f5f3", border: "#d0d0cc", color: "#888",    label: "Pending" },
    approved: { bg: "#f0faf4", border: "#a8dab5", color: "#2d7a4f", label: "Approved" },
    rejected: { bg: "#fdf2f2", border: "#f0b8b8", color: "#c0392b", label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      padding: "3px 10px", borderRadius: 2,
    }}>{s.label}</span>
  );
}

// ── PIN gate ──
function PinGate({ onUnlock }) {
  const [pin, setPin] = useState(""), [err, setErr] = useState(false);
  const attempt = () => {
    if (pin === ADMIN_PIN) { onUnlock(); }
    else { setErr(true); setPin(""); setTimeout(() => setErr(false), 1400); }
  };
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Jost', sans-serif" }}>
      <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 4, padding: "48px 52px", width: 320, textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>Admin Access</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "#1a1a1a", marginBottom: 32 }}>Andrew Strother</div>
        <input type="password" placeholder="Enter PIN" value={pin}
          onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && attempt()}
          style={{ ...inputStyle, textAlign: "center", fontSize: 18, letterSpacing: 6, marginBottom: 10, border: err ? "1px solid #c0392b" : "1px solid #e2e2e0" }}
        />
        {err && <div style={{ fontSize: 11, color: "#c0392b", marginBottom: 8 }}>Incorrect PIN</div>}
        <button onClick={attempt} style={{ ...btnPrimary, width: "100%", padding: "11px 0" }}>Enter</button>
      </div>
    </div>
  );
}

// ── Main app ──
export default function App() {
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [shoots, setShoots] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("client");       // "client" | "admin"
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [adminTab, setAdminTab] = useState("log");  // "log" | "credits" | "ideas" | "clients"
  const [clientTab, setClientTab] = useState("overview"); // "overview" | "ideas"
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  // Admin form state
  const [logForm, setLogForm] = useState({ description: "", credits: 1, date: "", month: "March 2025" });
  const [creditAdjust, setCreditAdjust] = useState(0);
  const [newClient, setNewClient] = useState({ name: "", since: "" });
  const [ideaForm, setIdeaForm] = useState({ title: "", body: "" });
  const [ideaNote, setIdeaNotes] = useState({});   // ideaId → draft note text

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  // ── Load clients ──
  const loadClients = useCallback(async () => {
    try {
      const data = await getClients();
      setClients(data);
      if (!selected && data.length > 0) setSelected(data[0]);
      else if (selected) {
        const fresh = data.find(c => c.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (e) {
      setError("Could not connect to database. Check your Supabase credentials.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  // ── Load shoots + ideas when client changes ──
  useEffect(() => {
    if (!selected) return;
    getShoots(selected.id).then(setShoots).catch(() => setShoots([]));
    getIdeas(selected.id).then(setIdeas).catch(() => setIdeas([]));
  }, [selected]);

  // ── Actions ──
  const handleLogShoot = async () => {
    if (!logForm.description || !logForm.date) return;
    try {
      await addShoot(selected.id, logForm.description, logForm.date, Number(logForm.credits), logForm.month);
      const newCredits = Math.max(0, selected.credits - Number(logForm.credits));
      await updateCredits(selected.id, newCredits);
      await loadClients();
      setShoots(await getShoots(selected.id));
      setLogForm({ description: "", credits: 1, date: "", month: "March 2025" });
      showToast("Shoot logged");
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleAdjustCredits = async () => {
    const delta = Number(creditAdjust);
    if (!delta) return;
    try {
      await updateCredits(selected.id, Math.max(0, selected.credits + delta));
      await loadClients();
      setCreditAdjust(0);
      showToast(`Credits ${delta > 0 ? "added" : "removed"}: ${Math.abs(delta)}`);
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.since) return;
    try {
      await addClient(newClient.name, newClient.since);
      await loadClients();
      setNewClient({ name: "", since: "" });
      showToast("Client added");
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleAddIdea = async () => {
    if (!ideaForm.title) return;
    try {
      await addIdea(selected.id, ideaForm.title, ideaForm.body);
      setIdeas(await getIdeas(selected.id));
      setIdeaForm({ title: "", body: "" });
      showToast("Content idea posted");
    } catch (e) { showToast("Error: " + e.message); }
  };

  // Client-side: approve / reject / leave note
  const handleIdeaAction = async (idea, action) => {
    const note = ideaNote[idea.id] || idea.client_note || "";
    const patch = action === "note"
      ? { client_note: note }
      : { status: action, client_note: note };
    try {
      await updateIdea(idea.id, patch);
      setIdeas(await getIdeas(selected.id));
      if (action !== "note") showToast(`Idea ${action}`);
    } catch (e) { showToast("Error: " + e.message); }
  };

  // ── Derived data ──
  const grouped = (shoots || []).reduce((acc, s) => {
    if (!acc[s.month]) acc[s.month] = [];
    acc[s.month].push(s);
    return acc;
  }, {});
  const totalRedeemed = (shoots || []).reduce((s, i) => s + i.credits, 0);
  const thisMonth = (shoots || []).filter(h => h.month === "March 2025").reduce((s, i) => s + i.credits, 0);
  const pendingIdeas = (ideas || []).filter(i => i.status === "pending").length;

  // ── Error screen ──
  if (error) return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Jost', sans-serif", padding: 40 }}>
      <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 4, padding: "40px 48px", maxWidth: 500, textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: "#c0392b", marginBottom: 12 }}>Connection Error</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, marginBottom: 16 }}>{error}</div>
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7 }}>
          Open this file and update <code style={{ background: "#f5f5f3", padding: "1px 6px", borderRadius: 2 }}>SUPABASE_URL</code> and{" "}
          <code style={{ background: "#f5f5f3", padding: "1px 6px", borderRadius: 2 }}>SUPABASE_ANON_KEY</code> at the top.
        </div>
      </div>
    </div>
  );

  if (showPin) return <PinGate onUnlock={() => { setAdminUnlocked(true); setShowPin(false); setMode("admin"); }} />;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3", fontFamily: "'Jost', sans-serif", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", padding: "10px 24px", borderRadius: 3, fontSize: 12, letterSpacing: 1, zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e2e0", padding: "0 48px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase" }}>Andrew Strother</span>
          <span style={{ width: 1, height: 14, background: "#ccc" }} />
          <span style={{ fontSize: 11, fontWeight: 300, letterSpacing: 2, textTransform: "uppercase", color: "#999" }}>Client Portal</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["client", "admin"].map(m => (
            <button key={m} onClick={() => { if (m === "admin" && !adminUnlocked) { setShowPin(true); return; } setMode(m); }}
              style={{ background: mode === m ? "#1a1a1a" : "transparent", color: mode === m ? "#fff" : "#999", border: "1px solid", borderColor: mode === m ? "#1a1a1a" : "#e2e2e0", borderRadius: 2, padding: "5px 14px", fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "'Jost', sans-serif" }}>
              {m === "admin" ? (adminUnlocked ? "Admin" : "Admin 🔒") : "Client View"}
            </button>
          ))}
        </div>
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>

        {/* Sidebar */}
        <aside style={{ width: 256, background: "#fff", borderRight: "1px solid #e2e2e0", paddingTop: 36, flexShrink: 0 }}>
          <div style={{ padding: "0 28px 14px", fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#c0c0bc" }}>Clients</div>
          {loading && <div style={{ padding: "0 28px", fontSize: 12, color: "#bbb" }}>Loading…</div>}
          {clients.map(client => {
            const isActive = selected?.id === client.id;
            return (
              <div key={client.id} onClick={() => setSelected(client)}
                style={{ padding: "13px 28px", cursor: "pointer", background: isActive ? "#f5f5f3" : "transparent", borderLeft: `2px solid ${isActive ? "#1a1a1a" : "transparent"}`, transition: "all 0.15s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#fafaf8"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? "#1a1a1a" : "#666", marginBottom: 2 }}>{client.name}</div>
                <div style={{ fontSize: 11, color: "#bbb", fontWeight: 300 }}>
                  <span style={{ color: isActive ? "#1a1a1a" : "#999", fontWeight: 500 }}>{client.credits}</span> credits
                </div>
              </div>
            );
          })}
        </aside>

        {/* Main */}
        {selected && (
          <main style={{ flex: 1, padding: "52px 64px", maxWidth: 900, overflowY: "auto" }}>

            {/* ════════════ CLIENT VIEW ════════════ */}
            {mode === "client" && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: "#bbb", marginBottom: 10 }}>Client since {selected.since}</div>
                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 52, margin: "0 0 28px", lineHeight: 1.05 }}>{selected.name}</h1>

                {/* Client tabs */}
                <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #e2e2e0", marginBottom: 36 }}>
                  {[["overview", "Overview"], ["ideas", `Content Ideas${pendingIdeas > 0 ? ` (${pendingIdeas})` : ""}`]].map(([tab, label]) => (
                    <button key={tab} onClick={() => setClientTab(tab)} style={{ background: "none", border: "none", borderBottom: clientTab === tab ? "2px solid #1a1a1a" : "2px solid transparent", padding: "10px 18px", fontSize: 10, fontWeight: clientTab === tab ? 500 : 400, letterSpacing: 2, textTransform: "uppercase", color: clientTab === tab ? "#1a1a1a" : "#aaa", cursor: "pointer", fontFamily: "'Jost', sans-serif", marginBottom: -1 }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Overview */}
                {clientTab === "overview" && (
                  <>
                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 52 }}>
                      <div style={{ background: "#1a1a1a", borderRadius: 3, padding: "28px 30px" }}>
                        <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>Credits Available</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 72, fontWeight: 300, lineHeight: 1, color: "#fff" }}>{selected.credits}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 14 }}>
                          {Array.from({ length: Math.min(selected.credits, 16) }).map((_, i) => (
                            <div key={i} style={{ width: 9, height: 9, borderRadius: 1, background: "rgba(255,255,255,0.5)" }} />
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 14, fontWeight: 300 }}>4 credits / month · unused roll over</div>
                      </div>
                      <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "28px 30px" }}>
                        <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#bbb", marginBottom: 16 }}>Used This Month</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 72, fontWeight: 300, lineHeight: 1, color: "#1a1a1a" }}>{thisMonth}</div>
                        <div style={{ fontSize: 11, color: "#bbb", marginTop: 16, fontWeight: 300 }}>of 4 monthly credits</div>
                      </div>
                      <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "28px 30px" }}>
                        <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#bbb", marginBottom: 16 }}>Total Sessions</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 72, fontWeight: 300, lineHeight: 1, color: "#1a1a1a" }}>{shoots.length}</div>
                        <div style={{ fontSize: 11, color: "#bbb", marginTop: 16, fontWeight: 300 }}>{totalRedeemed} credits redeemed total</div>
                      </div>
                    </div>

                    {/* Shoot history */}
                    <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#bbb", marginBottom: 28 }}>Shoot History</div>
                    {Object.keys(grouped).length === 0 && <div style={{ fontSize: 14, color: "#bbb", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>No shoots logged yet.</div>}
                    {Object.entries(grouped).map(([month, items]) => (
                      <div key={month} style={{ marginBottom: 36 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: "#1a1a1a" }}>{month}</span>
                          <div style={{ flex: 1, height: 1, background: "#e2e2e0" }} />
                        </div>
                        {items.map((item, idx) => (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", padding: "15px 0", borderBottom: idx < items.length - 1 ? "1px solid #eeeeec" : "none", gap: 20 }}>
                            <div style={{ width: 30, height: 30, border: "1px solid #e2e2e0", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#fff" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                              </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 400, color: "#1a1a1a", lineHeight: 1.2 }}>{item.description}</div>
                              <div style={{ fontSize: 11, color: "#bbb", marginTop: 3, fontWeight: 300 }}>{item.date}</div>
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: "#1a1a1a", border: "1px solid #1a1a1a", padding: "4px 11px", borderRadius: 2, flexShrink: 0 }}>
                              {item.credits} {item.credits === 1 ? "credit" : "credits"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}

                {/* Content ideas — client view */}
                {clientTab === "ideas" && (
                  <div>
                    {ideas.length === 0 && <div style={{ fontSize: 14, color: "#bbb", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>No content ideas posted yet.</div>}
                    {ideas.map(idea => (
                      <div key={idea.id} style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "24px 28px", marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
                          <div>
                            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: "#1a1a1a", lineHeight: 1.2, marginBottom: 6 }}>{idea.title}</div>
                            {idea.body && <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6, fontWeight: 300 }}>{idea.body}</div>}
                          </div>
                          <StatusBadge status={idea.status} />
                        </div>

                        {/* Client note input */}
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0ee" }}>
                          <label style={labelStyle}>Your Notes</label>
                          <textarea
                            rows={2}
                            placeholder="Leave a note for Andrew…"
                            value={ideaNote[idea.id] ?? (idea.client_note || "")}
                            onChange={e => setIdeaNotes(n => ({ ...n, [idea.id]: e.target.value }))}
                            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                          />
                        </div>

                        {idea.status === "pending" && (
                          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            <button onClick={() => handleIdeaAction(idea, "approved")}
                              style={{ ...btnPrimary, background: "#2d7a4f", padding: "8px 18px", fontSize: 9 }}>
                              ✓ Approve
                            </button>
                            <button onClick={() => handleIdeaAction(idea, "rejected")}
                              style={{ ...btnPrimary, background: "#c0392b", padding: "8px 18px", fontSize: 9 }}>
                              ✕ Decline
                            </button>
                            <button onClick={() => handleIdeaAction(idea, "note")}
                              style={{ ...btnPrimary, background: "transparent", color: "#888", border: "1px solid #e2e2e0", padding: "8px 18px", fontSize: 9 }}>
                              Save Note
                            </button>
                          </div>
                        )}
                        {idea.status !== "pending" && (
                          <button onClick={() => handleIdeaAction(idea, "note")}
                            style={{ ...btnPrimary, background: "transparent", color: "#888", border: "1px solid #e2e2e0", padding: "8px 18px", fontSize: 9, marginTop: 12 }}>
                            Save Note
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ════════════ ADMIN VIEW ════════════ */}
            {mode === "admin" && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: "#bbb", marginBottom: 10 }}>Admin · {selected.name}</div>
                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 48, margin: "0 0 8px", lineHeight: 1.05 }}>{selected.name}</h1>
                <div style={{ fontSize: 13, color: "#bbb", marginBottom: 32 }}>
                  <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{selected.credits}</span> credits remaining
                </div>
                <div style={{ height: 1, background: "#e2e2e0", marginBottom: 32 }} />

                {/* Admin tabs */}
                <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #e2e2e0", marginBottom: 36 }}>
                  {[["log","Log Shoot"],["credits","Adjust Credits"],["ideas","Content Ideas"],["clients","Add Client"]].map(([tab, label]) => (
                    <button key={tab} onClick={() => setAdminTab(tab)} style={{ background: "none", border: "none", borderBottom: adminTab === tab ? "2px solid #1a1a1a" : "2px solid transparent", padding: "10px 18px", fontSize: 10, fontWeight: adminTab === tab ? 500 : 400, letterSpacing: 2, textTransform: "uppercase", color: adminTab === tab ? "#1a1a1a" : "#aaa", cursor: "pointer", fontFamily: "'Jost', sans-serif", marginBottom: -1 }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Log Shoot */}
                {adminTab === "log" && (
                  <div style={{ maxWidth: 480 }}>
                    <div style={{ marginBottom: 18 }}>
                      <label style={labelStyle}>Shoot Description</label>
                      <input style={inputStyle} placeholder="e.g. Product launch shoot — studio" value={logForm.description}
                        onChange={e => setLogForm({ ...logForm, description: e.target.value })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                      <div>
                        <label style={labelStyle}>Date</label>
                        <input type="date" style={inputStyle} value={logForm.date}
                          onChange={e => setLogForm({ ...logForm, date: e.target.value })} />
                      </div>
                      <div>
                        <label style={labelStyle}>Credits Used</label>
                        <input type="number" min="1" max="8" style={inputStyle} value={logForm.credits}
                          onChange={e => setLogForm({ ...logForm, credits: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={labelStyle}>Month</label>
                      <select style={inputStyle} value={logForm.month}
                        onChange={e => setLogForm({ ...logForm, month: e.target.value })}>
                        {MONTHS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div style={{ padding: "13px 16px", background: "#fafaf8", border: "1px solid #e2e2e0", borderRadius: 3, marginBottom: 20, fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                      Deducts <strong style={{ color: "#1a1a1a" }}>{logForm.credits} credit{logForm.credits !== 1 ? "s" : ""}</strong> from <strong style={{ color: "#1a1a1a" }}>{selected.name}</strong> — leaving <strong style={{ color: "#1a1a1a" }}>{Math.max(0, selected.credits - Number(logForm.credits))}</strong> remaining.
                    </div>
                    <button onClick={handleLogShoot} style={btnPrimary}>Log Shoot</button>
                  </div>
                )}

                {/* Adjust Credits */}
                {adminTab === "credits" && (
                  <div style={{ maxWidth: 380 }}>
                    <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "24px 28px", marginBottom: 24 }}>
                      <div style={{ fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>Current Balance</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 56, fontWeight: 300, color: "#1a1a1a", lineHeight: 1 }}>{selected.credits}</div>
                      <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>credits</div>
                    </div>
                    <label style={labelStyle}>Adjust Amount</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
                      <button onClick={() => setCreditAdjust(v => v - 1)} style={{ width: 36, height: 36, border: "1px solid #e2e2e0", borderRadius: 3, background: "#fff", fontSize: 18, cursor: "pointer", color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <input type="number" style={{ ...inputStyle, textAlign: "center", width: 80 }} value={creditAdjust}
                        onChange={e => setCreditAdjust(Number(e.target.value))} />
                      <button onClick={() => setCreditAdjust(v => v + 1)} style={{ width: 36, height: 36, border: "1px solid #e2e2e0", borderRadius: 3, background: "#fff", fontSize: 18, cursor: "pointer", color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 16 }}>Positive = add · Negative = remove</div>
                    {creditAdjust !== 0 && (
                      <div style={{ padding: "12px 16px", background: "#fafaf8", border: "1px solid #e2e2e0", borderRadius: 3, marginBottom: 20, fontSize: 12, color: "#888" }}>
                        New balance: <strong style={{ color: "#1a1a1a" }}>{Math.max(0, selected.credits + Number(creditAdjust))}</strong>
                      </div>
                    )}
                    <button onClick={handleAdjustCredits} style={btnPrimary}>Apply</button>
                  </div>
                )}

                {/* Content Ideas — admin */}
                {adminTab === "ideas" && (
                  <div style={{ maxWidth: 580 }}>
                    {/* Post new idea */}
                    <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "24px 28px", marginBottom: 32 }}>
                      <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#bbb", marginBottom: 16 }}>Post New Idea</div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>Title</label>
                        <input style={inputStyle} placeholder="e.g. Behind-the-scenes Reels series" value={ideaForm.title}
                          onChange={e => setIdeaForm({ ...ideaForm, title: e.target.value })} />
                      </div>
                      <div style={{ marginBottom: 18 }}>
                        <label style={labelStyle}>Details (optional)</label>
                        <textarea rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                          placeholder="Describe the concept, platform, timing, etc."
                          value={ideaForm.body} onChange={e => setIdeaForm({ ...ideaForm, body: e.target.value })} />
                      </div>
                      <button onClick={handleAddIdea} style={btnPrimary}>Post to Client</button>
                    </div>

                    {/* Existing ideas */}
                    <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#bbb", marginBottom: 20 }}>Submitted Ideas</div>
                    {ideas.length === 0 && <div style={{ fontSize: 14, color: "#bbb", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>None yet.</div>}
                    {ideas.map(idea => (
                      <div key={idea.id} style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "20px 24px", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 400, color: "#1a1a1a" }}>{idea.title}</div>
                          <StatusBadge status={idea.status} />
                        </div>
                        {idea.body && <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 8 }}>{idea.body}</div>}
                        {idea.client_note && (
                          <div style={{ marginTop: 10, padding: "10px 14px", background: "#fafaf8", border: "1px solid #e2e2e0", borderRadius: 3, fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                            <span style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#bbb", display: "block", marginBottom: 4 }}>Client note</span>
                            {idea.client_note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Client */}
                {adminTab === "clients" && (
                  <div style={{ maxWidth: 400 }}>
                    <div style={{ marginBottom: 18 }}>
                      <label style={labelStyle}>Client Name</label>
                      <input style={inputStyle} placeholder="e.g. Acme Corp" value={newClient.name}
                        onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={labelStyle}>Retainer Since</label>
                      <input style={inputStyle} placeholder="e.g. April 2025" value={newClient.since}
                        onChange={e => setNewClient({ ...newClient, since: e.target.value })} />
                    </div>
                    <div style={{ padding: "12px 16px", background: "#fafaf8", border: "1px solid #e2e2e0", borderRadius: 3, marginBottom: 20, fontSize: 12, color: "#888" }}>
                      New client starts with <strong style={{ color: "#1a1a1a" }}>4 credits</strong>.
                    </div>
                    <button onClick={handleAddClient} style={btnPrimary}>Add Client</button>
                  </div>
                )}
              </>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
