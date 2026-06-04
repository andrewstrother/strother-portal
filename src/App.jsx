// ============================================================
// ANDREW STROTHER — CLIENT PORTAL
// Credentials are loaded from environment variables.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.
// ── Change your admin PIN here ──
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN;
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

import { useState, useEffect, useCallback, useRef } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

// ── Supabase REST client ──
async function sb(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
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

async function getClients() { return sb("clients?select=*&order=name.asc"); }
async function addClient(name, since, email, phone) {
  return sb("clients", { method: "POST", prefer: "return=representation", body: JSON.stringify({ name, since, email, phone, credits: 4 }) });
}
async function updateClient(clientId, patch) {
  return sb(`clients?id=eq.${clientId}`, { method: "PATCH", body: JSON.stringify(patch) });
}
async function deleteClient(clientId) {
  return sb(`clients?id=eq.${clientId}`, { method: "DELETE" });
}
async function updateCredits(clientId, credits) {
  return sb(`clients?id=eq.${clientId}`, { method: "PATCH", body: JSON.stringify({ credits }) });
}
async function getShoots(clientId) { return sb(`shoots?client_id=eq.${clientId}&order=date.desc`); }
async function addShoot(clientId, description, date, credits, month) {
  return sb("shoots", { method: "POST", body: JSON.stringify({ client_id: clientId, description, date, credits, month }) });
}
async function getIdeas(clientId) { return sb(`content_ideas?client_id=eq.${clientId}&order=created_at.desc`); }
async function addIdea(clientId, title, body) {
  return sb("content_ideas", { method: "POST", body: JSON.stringify({ client_id: clientId, title, body, status: "pending" }) });
}
async function updateIdea(ideaId, patch) {
  return sb(`content_ideas?id=eq.${ideaId}`, { method: "PATCH", body: JSON.stringify(patch) });
}

// ── Shared styles ──
const inputStyle = {
  width: "100%", border: "1px solid #e2e2e0", borderRadius: 3, padding: "9px 12px",
  fontSize: 13, fontFamily: "'Jost', sans-serif", color: "#1a1a1a", background: "#fff",
  outline: "none", boxSizing: "border-box",
};
const lbl = {
  fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase",
  color: "#888", display: "block", marginBottom: 6,
};
const btn = {
  background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 3,
  padding: "11px 26px", fontSize: 10, fontWeight: 500, letterSpacing: 2.5,
  textTransform: "uppercase", cursor: "pointer", fontFamily: "'Jost', sans-serif",
};

function Badge({ status }) {
  const m = { pending: ["#f5f5f3","#d0d0cc","#888","Pending"], approved: ["#f0faf4","#a8dab5","#2d7a4f","Approved"], rejected: ["#fdf2f2","#f0b8b8","#c0392b","Declined"] };
  const [bg, border, color, label] = m[status] || m.pending;
  return <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", background: bg, border: `1px solid ${border}`, color, padding: "3px 10px", borderRadius: 2 }}>{label}</span>;
}

// ── Calendar date picker ──
function DatePickerInput({ value, onChange, placeholder = "Select a date" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Parse stored YYYY-MM-DD string to Date object
  const selected = value ? new Date(value + "T00:00:00") : undefined;

  // Format for display
  const displayValue = selected
    ? selected.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (date) => {
    if (!date) return;
    // Store as YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          ...inputStyle,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
          color: displayValue ? "#1a1a1a" : "#bbb",
        }}
      >
        <span>{displayValue || placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" style={{ flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 100,
          background: "#fff",
          border: "1px solid #e2e2e0",
          borderRadius: 6,
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          padding: "8px",
        }}>
          <style>{`
            .rdp { --rdp-accent-color: #1a1a1a; --rdp-background-color: #f5f5f3; font-family: 'Jost', sans-serif; margin: 0; }
            .rdp-day_selected, .rdp-day_selected:hover { background-color: #1a1a1a; color: #fff; border-radius: 4px; }
            .rdp-day:hover:not(.rdp-day_selected) { background-color: #f5f5f3; border-radius: 4px; }
            .rdp-caption_label { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 17px; letter-spacing: 0.5px; }
            .rdp-head_cell { font-family: 'Jost', sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: #bbb; }
            .rdp-button:focus-visible { outline: 2px solid #1a1a1a; outline-offset: 2px; }
            .rdp-nav_button { border-radius: 3px; }
          `}</style>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected || new Date()}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}

// ── PIN Gate — shown as a modal overlay ──
function PinGate({ onUnlock, onCancel }) {
  const [pin, setPin] = useState(""), [err, setErr] = useState(false);
  const attempt = () => {
    if (pin === ADMIN_PIN) { onUnlock(); }
    else { setErr(true); setPin(""); setTimeout(() => setErr(false), 1400); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(245,245,243,0.96)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "'Jost', sans-serif" }}>
      <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 4, padding: "48px 52px", width: 320, textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#888", marginBottom: 8 }}>Admin Access</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "#1a1a1a", marginBottom: 32 }}>Andrew Strother</div>
        <input
          type="password" placeholder="Enter PIN" value={pin} autoFocus
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") attempt(); if (e.key === "Escape") onCancel(); }}
          style={{ ...inputStyle, textAlign: "center", fontSize: 18, letterSpacing: 6, marginBottom: 10, border: err ? "1px solid #c0392b" : "1px solid #e2e2e0" }}
        />
        {err && <div style={{ fontSize: 11, color: "#c0392b", marginBottom: 8 }}>Incorrect PIN — try again</div>}
        <button onClick={attempt} style={{ ...btn, width: "100%", padding: "11px 0", marginBottom: 10 }}>Enter</button>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 11, color: "#888", cursor: "pointer", fontFamily: "'Jost', sans-serif", letterSpacing: 1 }}>Cancel</button>
      </div>
    </div>
  );
}

export default function App() {
  const [clients, setClients]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [shoots, setShoots]     = useState([]);
  const [ideas, setIdeas]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dbError, setDbError]   = useState(null);

  const [mode, setMode]                   = useState("client");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showPin, setShowPin]             = useState(false);

  const [adminTab, setAdminTab]   = useState("log");
  const [clientTab, setClientTab] = useState("overview");
  const [toast, setToast]         = useState(null);

  const [logForm, setLogForm]             = useState({ description: "", credits: 1, date: "" });
  const [creditAdjust, setCreditAdjust]   = useState(0);
  const [newClientForm, setNewClientForm] = useState({ name: "", since: "", email: "", phone: "" });
  const [editForm, setEditForm]             = useState({ name: "", since: "", email: "", phone: "" });
  const [deleteConfirm, setDeleteConfirm]   = useState(false);
  const [ideaForm, setIdeaForm]           = useState({ title: "", body: "" });
  const [ideaNote, setIdeaNote]           = useState({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const loadClients = useCallback(async () => {
    try {
      const data = await getClients();
      setClients(data || []);
      setSelected(prev => {
        if (!prev && data && data.length > 0) return data[0];
        if (prev && data) return data.find(c => c.id === prev.id) || prev;
        return prev;
      });
      setDbError(null);
    } catch (e) {
      setDbError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  useEffect(() => {
    if (!selected) return;
    getShoots(selected.id).then(d => setShoots(d || [])).catch(() => setShoots([]));
    getIdeas(selected.id).then(d => setIdeas(d || [])).catch(() => setIdeas([]));
    setEditForm({ name: selected.name || "", since: selected.since || "", email: selected.email || "", phone: selected.phone || "" });
    setDeleteConfirm(false);
  }, [selected?.id]);

  const handleLogShoot = async () => {
    if (!logForm.description || !logForm.date) return;
    try {
      const shootMonth = logForm.date ? new Date(logForm.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
      await addShoot(selected.id, logForm.description, logForm.date, Number(logForm.credits), shootMonth);
      await updateCredits(selected.id, Math.max(0, selected.credits - Number(logForm.credits)));
      await loadClients();
      setShoots(await getShoots(selected.id));
      setLogForm({ description: "", credits: 1, date: "" });
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
    if (!newClientForm.name || !newClientForm.since) return;
    try {
      await addClient(newClientForm.name, newClientForm.since, newClientForm.email, newClientForm.phone);
      await loadClients();
      setNewClientForm({ name: "", since: "", email: "", phone: "" });
      showToast("Client added");
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleEditClient = async () => {
    try {
      await updateClient(selected.id, { name: editForm.name, since: editForm.since, email: editForm.email, phone: editForm.phone });
      await loadClients();
      showToast("Client updated");
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleDeleteClient = async () => {
    try {
      await deleteClient(selected.id);
      setSelected(null);
      await loadClients();
      setDeleteConfirm(false);
      setMode("client");
      showToast("Client deleted");
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleAddIdea = async () => {
    if (!ideaForm.title) return;
    try {
      await addIdea(selected.id, ideaForm.title, ideaForm.body);
      setIdeas(await getIdeas(selected.id));
      setIdeaForm({ title: "", body: "" });
      showToast("Idea posted to client");
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleIdeaAction = async (idea, action) => {
    const note = ideaNote[idea.id] ?? idea.client_note ?? "";
    const patch = action === "note" ? { client_note: note } : { status: action, client_note: note };
    try {
      await updateIdea(idea.id, patch);
      setIdeas(await getIdeas(selected.id));
      if (action !== "note") showToast(`Idea ${action}`);
      else showToast("Note saved");
    } catch (e) { showToast("Error: " + e.message); }
  };

  const grouped = (shoots || []).reduce((acc, s) => { (acc[s.month] = acc[s.month] || []).push(s); return acc; }, {});
  const totalRedeemed = (shoots || []).reduce((s, i) => s + i.credits, 0);
  const thisMonth = (shoots || []).filter(h => h.month === "April 2025").reduce((s, i) => s + i.credits, 0);
  const pendingCount = (ideas || []).filter(i => i.status === "pending").length;

  const switchToAdmin = () => { if (adminUnlocked) { setMode("admin"); } else { setShowPin(true); } };
  const handleUnlock = () => { setAdminUnlocked(true); setShowPin(false); setMode("admin"); };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3", fontFamily: "'Jost', sans-serif", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {showPin && <PinGate onUnlock={handleUnlock} onCancel={() => setShowPin(false)} />}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", padding: "10px 24px", borderRadius: 3, fontSize: 12, letterSpacing: 1, zIndex: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
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
          {[["client", "Client View"], ["admin", adminUnlocked ? "Admin" : "Admin 🔒"]].map(([m, label]) => (
            <button key={m}
              onClick={() => m === "admin" ? switchToAdmin() : setMode("client")}
              style={{ background: mode === m ? "#1a1a1a" : "transparent", color: mode === m ? "#fff" : "#999", border: "1px solid", borderColor: mode === m ? "#1a1a1a" : "#e2e2e0", borderRadius: 2, padding: "5px 14px", fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "'Jost', sans-serif" }}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>

        {/* Sidebar */}
        <aside style={{ width: 256, background: "#fff", borderRight: "1px solid #e2e2e0", paddingTop: 36, flexShrink: 0 }}>
          <div style={{ padding: "0 28px 14px", fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#c0c0bc" }}>Clients</div>
          {loading && <div style={{ padding: "0 28px", fontSize: 12, color: "#888" }}>Loading…</div>}
          {dbError && <div style={{ padding: "0 28px", fontSize: 11, color: "#c0392b", lineHeight: 1.5 }}>DB error — check Supabase credentials</div>}
          {clients.map(client => {
            const isActive = selected?.id === client.id;
            return (
              <div key={client.id} onClick={() => setSelected(client)}
                style={{ padding: "13px 28px", cursor: "pointer", background: isActive ? "#f5f5f3" : "transparent", borderLeft: `2px solid ${isActive ? "#1a1a1a" : "transparent"}`, transition: "all 0.15s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#fafaf8"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? "#1a1a1a" : "#666", marginBottom: 2 }}>{client.name}</div>
                <div style={{ fontSize: 11, color: "#666", fontWeight: 300 }}>
                  <span style={{ color: isActive ? "#1a1a1a" : "#999", fontWeight: 500 }}>{client.credits}</span> credits
                </div>
              </div>
            );
          })}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: "52px 64px", maxWidth: 900, overflowY: "auto" }}>

          {dbError && (
            <div style={{ background: "#fff", border: "1px solid #f0b8b8", borderRadius: 3, padding: "20px 24px", marginBottom: 32, fontSize: 13, color: "#c0392b", lineHeight: 1.6 }}>
              <strong>Database not connected.</strong> Open <code>src/App.jsx</code> and replace <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> at the top, then redeploy.
            </div>
          )}

          {mode === "admin" && !selected && (
            <div style={{ maxWidth: 400 }}>
              <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 10 }}>Admin Panel</div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 48, margin: "0 0 32px", lineHeight: 1.05 }}>Add Your First Client</h1>
              <div style={{ height: 1, background: "#e2e2e0", marginBottom: 32 }} />
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Client Name</label>
                <input style={inputStyle} placeholder="e.g. Acme Corp" value={newClientForm.name} onChange={e => setNewClientForm({ ...newClientForm, name: e.target.value })} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Retainer Since</label>
                <DatePickerInput value={newClientForm.since} onChange={val => setNewClientForm({ ...newClientForm, since: val })} placeholder="Select start date" />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Email</label>
                <input style={inputStyle} placeholder="client@example.com" value={newClientForm.email} onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Phone</label>
                <input style={inputStyle} placeholder="(555) 000-0000" value={newClientForm.phone} onChange={e => setNewClientForm({ ...newClientForm, phone: e.target.value })} />
              </div>
              <div style={{ padding: "12px 16px", background: "#fafaf8", border: "1px solid #e2e2e0", borderRadius: 3, marginBottom: 20, fontSize: 12, color: "#888" }}>
                New client starts with <strong style={{ color: "#1a1a1a" }}>4 credits</strong>.
              </div>
              <button onClick={handleAddClient} style={btn}>Add Client</button>
            </div>
          )}

          {selected && (
            <>
              {/* ══ CLIENT VIEW ══ */}
              {mode === "client" && (
                <>
                  <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 10, textAlign: "left" }}>Client since {selected.since ? new Date(selected.since + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ""}</div>
                  <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 52, margin: "0 0 28px", lineHeight: 1.05, textAlign: "left" }}>{selected.name}</h1>

                  <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #e2e2e0", marginBottom: 36 }}>
                    {[["overview","Overview"], ["ideas", `Content Ideas${pendingCount > 0 ? ` (${pendingCount})` : ""}`]].map(([tab, label]) => (
                      <button key={tab} onClick={() => setClientTab(tab)} style={{ background: "none", border: "none", borderBottom: clientTab === tab ? "2px solid #1a1a1a" : "2px solid transparent", padding: "10px 18px", fontSize: 10, fontWeight: clientTab === tab ? 500 : 400, letterSpacing: 2, textTransform: "uppercase", color: clientTab === tab ? "#1a1a1a" : "#aaa", cursor: "pointer", fontFamily: "'Jost', sans-serif", marginBottom: -1 }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {clientTab === "overview" && (
                    <>
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
                          <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 16 }}>Used This Month</div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 72, fontWeight: 300, lineHeight: 1, color: "#1a1a1a" }}>{thisMonth}</div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 16, fontWeight: 300 }}>of 4 monthly credits</div>
                        </div>
                        <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "28px 30px" }}>
                          <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 16 }}>Total Sessions</div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 72, fontWeight: 300, lineHeight: 1, color: "#1a1a1a" }}>{shoots.length}</div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 16, fontWeight: 300 }}>{totalRedeemed} credits redeemed total</div>
                        </div>
                      </div>

                      <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 28 }}>Shoot History</div>
                      {Object.keys(grouped).length === 0 && <div style={{ fontSize: 14, color: "#888", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>No shoots logged yet.</div>}
                      {Object.entries(grouped).map(([month, items]) => (
                        <div key={month} style={{ marginBottom: 36 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase" }}>{month}</span>
                            <div style={{ flex: 1, height: 1, background: "#e2e2e0" }} />
                          </div>
                          {items.map((item, idx) => (
                            <div key={item.id} style={{ display: "flex", alignItems: "center", padding: "15px 0", borderBottom: idx < items.length - 1 ? "1px solid #eeeeec" : "none", gap: 20 }}>
                              <div style={{ width: 30, height: 30, border: "1px solid #e2e2e0", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#fff" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 400, color: "#1a1a1a" }}>{item.description}</div>
                                <div style={{ fontSize: 11, color: "#888", marginTop: 3, fontWeight: 300 }}>{item.date ? new Date(item.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</div>
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", border: "1px solid #1a1a1a", padding: "4px 11px", borderRadius: 2, flexShrink: 0 }}>
                                {item.credits} {item.credits === 1 ? "credit" : "credits"}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  )}

                  {clientTab === "ideas" && (
                    <div>
                      {ideas.length === 0 && <div style={{ fontSize: 14, color: "#888", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>No content ideas posted yet.</div>}
                      {ideas.map(idea => (
                        <div key={idea.id} style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "24px 28px", marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
                            <div>
                              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: "#1a1a1a", marginBottom: 6 }}>{idea.title}</div>
                              {idea.body && <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6, fontWeight: 300 }}>{idea.body}</div>}
                            </div>
                            <Badge status={idea.status} />
                          </div>
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0ee" }}>
                            <label style={lbl}>Your Notes</label>
                            <textarea rows={2} placeholder="Leave a note for Andrew…"
                              value={ideaNote[idea.id] ?? (idea.client_note || "")}
                              onChange={e => setIdeaNote(n => ({ ...n, [idea.id]: e.target.value }))}
                              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
                          </div>
                          {idea.status === "pending" ? (
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                              <button onClick={() => handleIdeaAction(idea, "approved")} style={{ ...btn, background: "#2d7a4f", padding: "8px 18px", fontSize: 9 }}>✓ Approve</button>
                              <button onClick={() => handleIdeaAction(idea, "rejected")} style={{ ...btn, background: "#c0392b", padding: "8px 18px", fontSize: 9 }}>✕ Decline</button>
                              <button onClick={() => handleIdeaAction(idea, "note")} style={{ ...btn, background: "transparent", color: "#888", border: "1px solid #e2e2e0", padding: "8px 18px", fontSize: 9 }}>Save Note</button>
                            </div>
                          ) : (
                            <button onClick={() => handleIdeaAction(idea, "note")} style={{ ...btn, background: "transparent", color: "#888", border: "1px solid #e2e2e0", padding: "8px 18px", fontSize: 9, marginTop: 12 }}>Save Note</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ══ ADMIN VIEW ══ */}
              {mode === "admin" && (
                <>
                  <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 10, textAlign: "left" }}>Admin · {selected.name}</div>
                  <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 48, margin: "0 0 8px", lineHeight: 1.05, textAlign: "left" }}>{selected.name}</h1>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 32 }}>
                    <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{selected.credits}</span> credits remaining
                  </div>
                  <div style={{ height: 1, background: "#e2e2e0", marginBottom: 32 }} />

                  <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #e2e2e0", marginBottom: 36 }}>
                    {[["log","Log Shoot"],["credits","Adjust Credits"],["ideas","Content Ideas"],["edit","Edit Client"],["clients","Add Client"]].map(([tab, label]) => (
                      <button key={tab} onClick={() => setAdminTab(tab)} style={{ background: "none", border: "none", borderBottom: adminTab === tab ? "2px solid #1a1a1a" : "2px solid transparent", padding: "10px 18px", fontSize: 10, fontWeight: adminTab === tab ? 500 : 400, letterSpacing: 2, textTransform: "uppercase", color: adminTab === tab ? "#1a1a1a" : "#aaa", cursor: "pointer", fontFamily: "'Jost', sans-serif", marginBottom: -1 }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {adminTab === "log" && (
                    <div style={{ maxWidth: 480 }}>
                      <div style={{ marginBottom: 18 }}>
                        <label style={lbl}>Shoot Description</label>
                        <input style={inputStyle} placeholder="e.g. Product launch shoot — studio" value={logForm.description} onChange={e => setLogForm({ ...logForm, description: e.target.value })} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                        <div>
                          <label style={lbl}>Date</label>
                          <DatePickerInput value={logForm.date} onChange={val => setLogForm({ ...logForm, date: val })} placeholder="Select shoot date" />
                        </div>
                        <div>
                          <label style={lbl}>Credits Used</label>
                          <input type="number" min="1" max="12" style={inputStyle} value={logForm.credits} onChange={e => setLogForm({ ...logForm, credits: Number(e.target.value) })} />
                        </div>
                      </div>

                      <div style={{ padding: "13px 16px", background: "#fafaf8", border: "1px solid #e2e2e0", borderRadius: 3, marginBottom: 20, fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                        Deducts <strong style={{ color: "#1a1a1a" }}>{logForm.credits} credit{logForm.credits !== 1 ? "s" : ""}</strong> from <strong style={{ color: "#1a1a1a" }}>{selected.name}</strong> — leaving <strong style={{ color: "#1a1a1a" }}>{Math.max(0, selected.credits - Number(logForm.credits))}</strong> remaining.
                      </div>
                      <button onClick={handleLogShoot} style={btn}>Log Shoot</button>
                    </div>
                  )}

                  {adminTab === "credits" && (
                    <div style={{ maxWidth: 380 }}>
                      <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "24px 28px", marginBottom: 24 }}>
                        <div style={{ fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 8 }}>Current Balance</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 56, fontWeight: 300, color: "#1a1a1a", lineHeight: 1 }}>{selected.credits}</div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>credits</div>
                      </div>
                      <label style={lbl}>Adjust Amount</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
                        <button onClick={() => setCreditAdjust(v => v - 1)} style={{ width: 36, height: 36, border: "1px solid #e2e2e0", borderRadius: 3, background: "#fff", fontSize: 18, cursor: "pointer", color: "#555" }}>−</button>
                        <input type="number" style={{ ...inputStyle, textAlign: "center", width: 80 }} value={creditAdjust} onChange={e => setCreditAdjust(Number(e.target.value))} />
                        <button onClick={() => setCreditAdjust(v => v + 1)} style={{ width: 36, height: 36, border: "1px solid #e2e2e0", borderRadius: 3, background: "#fff", fontSize: 18, cursor: "pointer", color: "#555" }}>+</button>
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 16 }}>Positive = add · Negative = remove</div>
                      {creditAdjust !== 0 && (
                        <div style={{ padding: "12px 16px", background: "#fafaf8", border: "1px solid #e2e2e0", borderRadius: 3, marginBottom: 20, fontSize: 12, color: "#888" }}>
                          New balance: <strong style={{ color: "#1a1a1a" }}>{Math.max(0, selected.credits + Number(creditAdjust))}</strong>
                        </div>
                      )}
                      <button onClick={handleAdjustCredits} style={btn}>Apply</button>
                    </div>
                  )}

                  {adminTab === "ideas" && (
                    <div style={{ maxWidth: 580 }}>
                      <div style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "24px 28px", marginBottom: 32 }}>
                        <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 16 }}>Post New Idea</div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={lbl}>Title</label>
                          <input style={inputStyle} placeholder="e.g. Behind-the-scenes Reels series" value={ideaForm.title} onChange={e => setIdeaForm({ ...ideaForm, title: e.target.value })} />
                        </div>
                        <div style={{ marginBottom: 18 }}>
                          <label style={lbl}>Details (optional)</label>
                          <textarea rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} placeholder="Describe the concept, platform, timing, etc." value={ideaForm.body} onChange={e => setIdeaForm({ ...ideaForm, body: e.target.value })} />
                        </div>
                        <button onClick={handleAddIdea} style={btn}>Post to Client</button>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 20 }}>Submitted Ideas</div>
                      {ideas.length === 0 && <div style={{ fontSize: 14, color: "#888", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>None yet.</div>}
                      {ideas.map(idea => (
                        <div key={idea.id} style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "20px 24px", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 400, color: "#1a1a1a" }}>{idea.title}</div>
                            <Badge status={idea.status} />
                          </div>
                          {idea.body && <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 8 }}>{idea.body}</div>}
                          {idea.client_note && (
                            <div style={{ marginTop: 10, padding: "10px 14px", background: "#fafaf8", border: "1px solid #e2e2e0", borderRadius: 3, fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                              <span style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#888", display: "block", marginBottom: 4 }}>Client note</span>
                              {idea.client_note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {adminTab === "edit" && (
                    <div style={{ maxWidth: 480 }}>
                      <div style={{ marginBottom: 18 }}>
                        <label style={lbl}>Client Name</label>
                        <input style={inputStyle} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                      </div>
                      <div style={{ marginBottom: 18 }}>
                        <label style={lbl}>Retainer Since</label>
                        <DatePickerInput value={editForm.since} onChange={val => setEditForm({ ...editForm, since: val })} placeholder="Select start date" />
                      </div>
                      <div style={{ marginBottom: 18 }}>
                        <label style={lbl}>Email</label>
                        <input style={inputStyle} placeholder="client@example.com" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={lbl}>Phone</label>
                        <input style={inputStyle} placeholder="(555) 000-0000" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                      </div>
                      <button onClick={handleEditClient} style={{ ...btn, marginBottom: 40 }}>Save Changes</button>

                      <div style={{ borderTop: "1px solid #e2e2e0", paddingTop: 32 }}>
                        <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 12 }}>Danger Zone</div>
                        {!deleteConfirm ? (
                          <button onClick={() => setDeleteConfirm(true)}
                            style={{ ...btn, background: "transparent", color: "#c0392b", border: "1px solid #c0392b", padding: "10px 22px" }}>
                            Delete Client
                          </button>
                        ) : (
                          <div style={{ background: "#fdf2f2", border: "1px solid #f0b8b8", borderRadius: 3, padding: "16px 20px" }}>
                            <div style={{ fontSize: 13, color: "#c0392b", marginBottom: 14, lineHeight: 1.5 }}>
                              Permanently delete <strong>{selected.name}</strong> and all their shoots and content ideas? This cannot be undone.
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                              <button onClick={handleDeleteClient} style={{ ...btn, background: "#c0392b", padding: "9px 20px", fontSize: 9 }}>Yes, Delete</button>
                              <button onClick={() => setDeleteConfirm(false)} style={{ ...btn, background: "transparent", color: "#888", border: "1px solid #e2e2e0", padding: "9px 20px", fontSize: 9 }}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === "clients" && (
                    <div style={{ maxWidth: 400 }}>
                      <div style={{ marginBottom: 18 }}>
                        <label style={lbl}>Client Name</label>
                        <input style={inputStyle} placeholder="e.g. Acme Corp" value={newClientForm.name} onChange={e => setNewClientForm({ ...newClientForm, name: e.target.value })} />
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={lbl}>Retainer Since</label>
                        <DatePickerInput value={newClientForm.since} onChange={val => setNewClientForm({ ...newClientForm, since: val })} placeholder="Select start date" />
                      </div>
                      <div style={{ marginBottom: 18 }}>
                        <label style={lbl}>Email</label>
                        <input style={inputStyle} placeholder="client@example.com" value={newClientForm.email} onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })} />
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={lbl}>Phone</label>
                        <input style={inputStyle} placeholder="(555) 000-0000" value={newClientForm.phone} onChange={e => setNewClientForm({ ...newClientForm, phone: e.target.value })} />
                      </div>
                      <div style={{ padding: "12px 16px", background: "#fafaf8", border: "1px solid #e2e2e0", borderRadius: 3, marginBottom: 20, fontSize: 12, color: "#888" }}>
                        New client starts with <strong style={{ color: "#1a1a1a" }}>4 credits</strong>.
                      </div>
                      <button onClick={handleAddClient} style={btn}>Add Client</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!loading && clients.length === 0 && !dbError && (
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#888", fontStyle: "italic" }}>
              No clients yet. Switch to Admin → Add Client to get started.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}