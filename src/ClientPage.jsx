import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function getClientBySlug(slug) {
  const data = await sb(`clients?slug=eq.${encodeURIComponent(slug)}&select=*`);
  return data && data.length > 0 ? data[0] : null;
}
async function getShoots(clientId) { return sb(`shoots?client_id=eq.${clientId}&order=date.desc`); }
async function getIdeas(clientId) { return sb(`content_ideas?client_id=eq.${clientId}&order=created_at.desc`); }
async function updateIdea(ideaId, patch) {
  return sb(`content_ideas?id=eq.${ideaId}`, { method: "PATCH", body: JSON.stringify(patch) });
}
async function getComments(ideaId) {
  return sb(`idea_comments?idea_id=eq.${ideaId}&order=created_at.asc`);
}
async function addComment(ideaId, author, content) {
  return sb("idea_comments", { method: "POST", body: JSON.stringify({ idea_id: ideaId, author, content }) });
}

const inputStyle = {
  width: "100%", border: "1px solid #e2e2e0", borderRadius: 3, padding: "9px 12px",
  fontSize: 13, fontFamily: "'Jost', sans-serif", color: "#1a1a1a", background: "#fff",
  outline: "none", boxSizing: "border-box",
};
const lbl = {
  fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase",
  color: "#888", display: "block", marginBottom: 6, textAlign: "left",
};
const btn = {
  background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 3,
  padding: "11px 26px", fontSize: 10, fontWeight: 500, letterSpacing: 2.5,
  textTransform: "uppercase", cursor: "pointer", fontFamily: "'Jost', sans-serif",
  display: "block",
};

function formatCommentTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function CommentThread({ comments, draft, onDraftChange, onSend }) {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: comments.length ? 14 : 0 }}>
        {comments.map(c => {
          const isAndrew = c.author === "andrew";
          return (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: isAndrew ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "78%", padding: "9px 13px", borderRadius: 8, lineHeight: 1.5, fontSize: 13,
                background: isAndrew ? "#1a1a1a" : "#fff",
                color: isAndrew ? "#fff" : "#1a1a1a",
                border: isAndrew ? "none" : "1px solid #e2e2e0",
                fontWeight: 300,
              }}>{c.content}</div>
              <div style={{ fontSize: 10, color: "#bbb", marginTop: 3, fontWeight: 300 }}>{formatCommentTime(c.created_at)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea rows={2} placeholder="Write a message…"
          value={draft}
          onChange={e => onDraftChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend(); }}
          style={{ flex: 1, border: "1px solid #e2e2e0", borderRadius: 3, padding: "8px 10px", fontSize: 13, fontFamily: "'Jost', sans-serif", color: "#1a1a1a", background: "#fff", outline: "none", boxSizing: "border-box", resize: "none", lineHeight: 1.5, textAlign: "left" }} />
        <button onClick={onSend}
          style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 3, padding: "9px 16px", fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "'Jost', sans-serif", flexShrink: 0 }}>
          Send
        </button>
      </div>
    </div>
  );
}

function Badge({ status, proposedDate }) {
  const m = {
    pending: ["#f5f5f3", "#d0d0cc", "#888", "Pending"],
    approved: ["#f0faf4", "#a8dab5", "#2d7a4f", "Approved"],
    rejected: ["#fdf2f2", "#f0b8b8", "#c0392b", "Declined"],
    schedule_requested: ["#fdf6ee", "#f5d5a0", "#b5710a", null],
    confirmed: ["#f0faf4", "#a8dab5", "#2d7a4f", "Confirmed"],
  };
  const [bg, border, color, label] = m[status] || m.pending;
  const displayLabel = status === "schedule_requested"
    ? `Schedule Requested${proposedDate ? ` — ${new Date(proposedDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}`
    : label;
  return (
    <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", background: bg, border: `1px solid ${border}`, color, padding: "3px 10px", borderRadius: 2 }}>
      {displayLabel}
    </span>
  );
}

function DatePickerInput({ value, onChange, placeholder = "Select a date" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  const displayValue = selected
    ? selected.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (date) => {
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none", color: displayValue ? "#1a1a1a" : "#bbb" }}>
        <span>{displayValue || placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" style={{ flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100, background: "#fff", border: "1px solid #e2e2e0", borderRadius: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.10)", padding: 8 }}>
          <style>{`
            .rdp { --rdp-accent-color: #1a1a1a; --rdp-background-color: #f5f5f3; font-family: 'Jost', sans-serif; margin: 0; }
            .rdp-day_selected, .rdp-day_selected:hover { background-color: #1a1a1a; color: #fff; border-radius: 4px; }
            .rdp-day:hover:not(.rdp-day_selected) { background-color: #f5f5f3; border-radius: 4px; }
            .rdp-caption_label { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 17px; letter-spacing: 0.5px; }
            .rdp-head_cell { font-family: 'Jost', sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: #bbb; }
          `}</style>
          <DayPicker mode="single" selected={selected} onSelect={handleSelect} defaultMonth={selected || new Date()} showOutsideDays />
        </div>
      )}
    </div>
  );
}

export default function ClientPage() {
  const { slug } = useParams();
  const [client, setClient] = useState(null);
  const [shoots, setShoots] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [clientTab, setClientTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [ideaNote, setIdeaNote] = useState({});
  const [scheduleOpen, setScheduleOpen] = useState({});
  const [scheduleDate, setScheduleDate] = useState({});
  const [declineOpen, setDeclineOpen] = useState({});
  const [declineReason, setDeclineReason] = useState({});
  const [threadOpen, setThreadOpen] = useState({});
  const [comments, setComments] = useState({});
  const [commentDraft, setCommentDraft] = useState({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    async function load() {
      try {
        const c = await getClientBySlug(slug);
        if (!c) { setNotFound(true); setLoading(false); return; }
        setClient(c);
        const [s, i] = await Promise.all([getShoots(c.id), getIdeas(c.id)]);
        setShoots(s || []);
        setIdeas(i || []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const handleIdeaAction = async (idea, action) => {
    const note = ideaNote[idea.id] ?? idea.client_note ?? "";
    const patch = action === "note" ? { client_note: note } : { status: action, client_note: note };
    try {
      await updateIdea(idea.id, patch);
      const fresh = await getIdeas(client.id);
      setIdeas(fresh || []);
      showToast(action === "note" ? "Note saved" : `Idea ${action}`);
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleDeclineIdea = async (idea) => {
    const reason = declineReason[idea.id] ?? "";
    try {
      await updateIdea(idea.id, { status: "rejected", decline_reason: reason || null });
      const fresh = await getIdeas(client.id);
      setIdeas(fresh || []);
      setDeclineOpen(s => ({ ...s, [idea.id]: false }));
      showToast("Idea declined");
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleToggleThread = async (idea) => {
    const nowOpen = !threadOpen[idea.id];
    setThreadOpen(s => ({ ...s, [idea.id]: nowOpen }));
    if (nowOpen && !comments[idea.id]) {
      const data = await getComments(idea.id).catch(() => []);
      setComments(s => ({ ...s, [idea.id]: data || [] }));
    }
  };

  const handleSendComment = async (idea) => {
    const content = (commentDraft[idea.id] || "").trim();
    if (!content) return;
    try {
      await addComment(idea.id, "client", content);
      const data = await getComments(idea.id);
      setComments(s => ({ ...s, [idea.id]: data || [] }));
      setCommentDraft(d => ({ ...d, [idea.id]: "" }));
      fetch("/api/notify-andrew", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-webhook-secret": import.meta.env.VITE_WEBHOOK_SECRET || "" },
        body: JSON.stringify({ type: "UPDATE", record: { ...idea, client_note: content }, old_record: idea }),
      }).catch(() => {});
    } catch (e) { showToast("Error: " + e.message); }
  };

  const handleRequestSchedule = async (idea) => {
    const date = scheduleDate[idea.id];
    if (!date) { showToast("Please select a date first"); return; }
    try {
      await updateIdea(idea.id, { status: "schedule_requested", proposed_date: date });
      const fresh = await getIdeas(client.id);
      setIdeas(fresh || []);
      setScheduleOpen(o => ({ ...o, [idea.id]: false }));
      showToast("Schedule request sent to Andrew");
    } catch (e) { showToast("Error: " + e.message); }
  };

  const grouped = (shoots || []).reduce((acc, s) => { (acc[s.month] = acc[s.month] || []).push(s); return acc; }, {});
  const totalRedeemed = (shoots || []).reduce((s, i) => s + i.credits, 0);
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const thisMonth = (shoots || []).filter(h => h.month === currentMonth).reduce((s, i) => s + i.credits, 0);
  const pendingCount = (ideas || []).filter(i => i.status === "pending").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3", fontFamily: "'Jost', sans-serif", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @media (max-width: 640px) {
          html, body { overflow-x: hidden; }
          .portal-header { padding: 0 20px !important; }
          .portal-main { padding: 28px 20px !important; max-width: 100% !important; }
          .portal-stats-grid { grid-template-columns: 1fr !important; }
          .portal-hero { font-size: 32px !important; }
          .portal-since { text-align: left !important; }
          .portal-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .portal-tabs button { white-space: nowrap; flex-shrink: 0; }
          .portal-shoot-row { flex-wrap: wrap; align-items: flex-start !important; gap: 12px !important; }
          .portal-shoot-badge { flex-shrink: 0; }
          .portal-idea-card-header { flex-wrap: wrap; gap: 10px !important; }
          .portal-idea-actions { flex-wrap: wrap; }
        }
      `}</style>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", padding: "10px 24px", borderRadius: 3, fontSize: 12, letterSpacing: 1, zIndex: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="portal-header" style={{ background: "#fff", borderBottom: "1px solid #e2e2e0", padding: "0 48px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase" }}>Andrew Strother Photography</span>
          <span style={{ width: 1, height: 14, background: "#ccc" }} />
          <span style={{ fontSize: 11, fontWeight: 300, letterSpacing: 2, textTransform: "uppercase", color: "#999" }}>Client Portal</span>
        </div>
      </header>

      <main className="portal-main" style={{ maxWidth: 900, margin: "0 auto", padding: "52px 64px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#888", fontStyle: "italic" }}>
            Loading…
          </div>
        )}

        {/* Not found */}
        {!loading && notFound && (
          <div style={{ paddingTop: 40 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: "#bbb", marginBottom: 12 }}>404</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 52, margin: "0 0 20px", lineHeight: 1.05 }}>Page not found</h1>
            <div style={{ height: 1, background: "#e2e2e0", marginBottom: 24, maxWidth: 400 }} />
            <p style={{ fontSize: 13, color: "#888", fontWeight: 300, lineHeight: 1.7, maxWidth: 400 }}>
              This portal link doesn't match any active client. Please check the URL or contact Andrew directly.
            </p>
          </div>
        )}

        {/* Client view */}
        {!loading && client && (
          <>
            <div className="portal-since" style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: "#888", marginBottom: 10 }}>
              Client since {client.since ? new Date(client.since + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
            </div>
            <h1 className="portal-hero" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 52, margin: "0 0 28px", lineHeight: 1.05 }}>
              {client.name}
            </h1>

            {/* Tabs */}
            <div className="portal-tabs" style={{ display: "flex", gap: 2, borderBottom: "1px solid #e2e2e0", marginBottom: 36 }}>
              {[["overview", "Overview"], ["ideas", `Content Ideas${pendingCount > 0 ? ` (${pendingCount})` : ""}`]].map(([tab, label]) => (
                <button key={tab} onClick={() => setClientTab(tab)}
                  style={{ background: "none", border: "none", borderBottom: clientTab === tab ? "2px solid #1a1a1a" : "2px solid transparent", padding: "10px 18px", fontSize: 10, fontWeight: clientTab === tab ? 500 : 400, letterSpacing: 2, textTransform: "uppercase", color: clientTab === tab ? "#1a1a1a" : "#aaa", cursor: "pointer", fontFamily: "'Jost', sans-serif", marginBottom: -1 }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {clientTab === "overview" && (
              <>
                <div className="portal-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 52 }}>
                  <div style={{ background: "#1a1a1a", borderRadius: 3, padding: "28px 30px" }}>
                    <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>Credits Available</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 72, fontWeight: 300, lineHeight: 1, color: "#fff" }}>{client.credits}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 14 }}>
                      {Array.from({ length: Math.min(client.credits, 16) }).map((_, i) => (
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
                {Object.keys(grouped).length === 0 && (
                  <div style={{ fontSize: 14, color: "#888", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>No shoots logged yet.</div>
                )}
                {Object.entries(grouped).map(([month, items]) => (
                  <div key={month} style={{ marginBottom: 36 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase" }}>{month}</span>
                      <div style={{ flex: 1, height: 1, background: "#e2e2e0" }} />
                    </div>
                    {items.map((item, idx) => (
                      <div key={item.id} className="portal-shoot-row" style={{ display: "flex", alignItems: "center", padding: "15px 0", borderBottom: idx < items.length - 1 ? "1px solid #eeeeec" : "none", gap: 20 }}>
                        <div style={{ width: 30, height: 30, border: "1px solid #e2e2e0", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#fff" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 400, color: "#1a1a1a" }}>{item.description}</div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 3, fontWeight: 300, display: "flex", alignItems: "center", gap: 12 }}>
                            <span>{item.date ? new Date(item.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</span>
                            {item.gallery_url && (
                              <a href={item.gallery_url} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", color: "#1a1a1a", textDecoration: "none", borderBottom: "1px solid #1a1a1a", paddingBottom: 1 }}>
                                View Gallery →
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="portal-shoot-badge" style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", border: "1px solid #1a1a1a", padding: "4px 11px", borderRadius: 2, flexShrink: 0 }}>
                          {item.credits} {item.credits === 1 ? "credit" : "credits"}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {/* Content Ideas tab */}
            {clientTab === "ideas" && (
              <div>
                {ideas.length === 0 && (
                  <div style={{ fontSize: 14, color: "#888", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>No content ideas posted yet.</div>
                )}
                {ideas.map(idea => (
                  <div key={idea.id} style={{ background: "#fff", border: "1px solid #e2e2e0", borderRadius: 3, padding: "24px 28px", marginBottom: 16, textAlign: "left" }}>
                    <div className="portal-idea-card-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: "#1a1a1a", marginBottom: 6, textAlign: "left" }}>{idea.title}</div>
                        {idea.body && <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6, fontWeight: 300, textAlign: "left" }}>{idea.body}</div>}
                      </div>
                      <Badge status={idea.status} proposedDate={idea.proposed_date} />
                    </div>
                    {idea.status === "pending" ? (
                      <>
                        <div className="portal-idea-actions" style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                          <button onClick={() => handleIdeaAction(idea, "approved")} style={{ ...btn, background: "#2d7a4f", padding: "8px 18px", fontSize: 9 }}>✓ Approve</button>
                          <button onClick={() => setDeclineOpen(s => ({ ...s, [idea.id]: !s[idea.id] }))} style={{ ...btn, background: "#c0392b", padding: "8px 18px", fontSize: 9 }}>✕ Decline</button>
                          <button onClick={() => setScheduleOpen(o => ({ ...o, [idea.id]: !o[idea.id] }))} style={{ ...btn, background: "transparent", color: "#1a1a1a", border: "1px solid #1a1a1a", padding: "8px 18px", fontSize: 9 }}>Request to Schedule</button>
                        </div>
                        {declineOpen[idea.id] && (
                          <div style={{ marginTop: 14, padding: "16px 18px", background: "#fdf2f2", border: "1px solid #f0b8b8", borderRadius: 3 }}>
                            <label style={{ ...lbl, color: "#c0392b" }}>Would you like to explain why? (optional)</label>
                            <textarea rows={2} placeholder="Share any feedback…"
                              value={declineReason[idea.id] ?? ""}
                              onChange={e => setDeclineReason(r => ({ ...r, [idea.id]: e.target.value }))}
                              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, marginBottom: 10, textAlign: "left" }} />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => handleDeclineIdea(idea)} style={{ ...btn, background: "#c0392b", padding: "8px 18px", fontSize: 9 }}>Confirm Decline</button>
                              <button onClick={() => setDeclineOpen(s => ({ ...s, [idea.id]: false }))} style={{ ...btn, background: "transparent", color: "#888", border: "1px solid #e2e2e0", padding: "8px 18px", fontSize: 9 }}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : idea.status === "approved" ? (
                      <div className="portal-idea-actions" style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <button onClick={() => setScheduleOpen(o => ({ ...o, [idea.id]: !o[idea.id] }))} style={{ ...btn, background: "transparent", color: "#1a1a1a", border: "1px solid #1a1a1a", padding: "8px 18px", fontSize: 9 }}>Request to Schedule</button>
                      </div>
                    ) : null}
                    {scheduleOpen[idea.id] && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0ee" }}>
                        <label style={lbl}>Proposed shoot date</label>
                        <div style={{ maxWidth: 280, marginBottom: 12 }}>
                          <DatePickerInput
                            value={scheduleDate[idea.id] || ""}
                            onChange={val => setScheduleDate(d => ({ ...d, [idea.id]: val }))}
                            placeholder="Select a date"
                          />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleRequestSchedule(idea)} style={{ ...btn, padding: "8px 18px", fontSize: 9 }}>Send Request</button>
                          <button onClick={() => setScheduleOpen(o => ({ ...o, [idea.id]: false }))} style={{ ...btn, background: "transparent", color: "#888", border: "1px solid #e2e2e0", padding: "8px 18px", fontSize: 9 }}>Cancel</button>
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f0ee" }}>
                      <button onClick={() => handleToggleThread(idea)}
                        style={{ background: "none", border: "none", fontSize: 10, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", color: "#888", cursor: "pointer", fontFamily: "'Jost', sans-serif", padding: 0 }}>
                        {threadOpen[idea.id] ? "Hide conversation" : (comments[idea.id]?.length ? `View conversation (${comments[idea.id].length})` : "Start a conversation")}
                      </button>
                      {threadOpen[idea.id] && (
                        <div style={{ marginTop: 12 }}>
                          <CommentThread
                            comments={comments[idea.id] || []}
                            draft={commentDraft[idea.id] || ""}
                            onDraftChange={v => setCommentDraft(d => ({ ...d, [idea.id]: v }))}
                            onSend={() => handleSendComment(idea)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
