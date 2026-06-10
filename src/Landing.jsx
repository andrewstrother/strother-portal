export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3", fontFamily: "'Jost', sans-serif", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e2e0", padding: "0 48px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase" }}>Andrew Strother Photography</span>
          <span style={{ width: 1, height: 14, background: "#ccc" }} />
          <span style={{ fontSize: 11, fontWeight: 300, letterSpacing: 2, textTransform: "uppercase", color: "#999" }}>Client Portal</span>
        </div>
      </header>

      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "48px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 48, margin: "0 0 20px", lineHeight: 1.1, color: "#1a1a1a" }}>
            This is a private client portal
          </h1>
          <p style={{ fontSize: 14, color: "#555", fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
            If you're a client, please use the link provided to you. If you need help accessing your portal, contact us at{" "}
            <a href="mailto:howdy@andrewstrother.com" style={{ color: "#1a1a1a", textDecoration: "none", borderBottom: "1px solid #1a1a1a", paddingBottom: 1 }}>howdy@andrewstrother.com</a>
          </p>
        </div>
      </main>
    </div>
  );
}
