import { useState, useEffect, useRef } from "react";

const API = "http://127.0.0.1:5000/api";

/* ── Google Fonts ── */
if (!document.getElementById("fa-fonts")) {
  const l = document.createElement("link");
  l.id = "fa-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
  document.head.appendChild(l);
}

/* ── Design tokens ── */
const T = {
  font: "'DM Sans', sans-serif",
  fontDisplay: "'DM Serif Display', serif",
  bg0: "#0c0e12", bg1: "#111318", bg2: "#181c22",
  bg3: "#1f2430", bg4: "#272d3a",
  border: "rgba(255,255,255,0.06)",
  borderMid: "rgba(255,255,255,0.11)",
  text: "#eef0f4", textMuted: "#7e8899", textFaint: "#424a5a",
  accent: "#e9a83c", accentDim: "rgba(233,168,60,0.1)", accentBorder: "rgba(233,168,60,0.28)",
  green: "#34d399", greenDim: "rgba(52,211,153,0.08)", greenBorder: "rgba(52,211,153,0.22)",
  red: "#f87171", redDim: "rgba(248,113,113,0.08)", redBorder: "rgba(248,113,113,0.22)",
  yellow: "#fbbf24", yellowDim: "rgba(251,191,36,0.08)", yellowBorder: "rgba(251,191,36,0.22)",
  blue: "#60a5fa", blueDim: "rgba(96,165,250,0.08)",
  r: "10px", rLg: "14px",
};

/* ── Inject global CSS once ── */
if (!document.getElementById("fa-style")) {
  const s = document.createElement("style");
  s.id = "fa-style";
  s.textContent = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:${T.bg0};color:${T.text};font-family:${T.font}}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:${T.bg4};border-radius:99px}
    input,select,textarea{
      background:${T.bg3};border:1px solid ${T.border};color:${T.text};
      border-radius:${T.r};padding:9px 13px;font-family:${T.font};
      font-size:13px;width:100%;outline:none;transition:border 0.18s;
    }
    input:focus,select:focus,textarea:focus{border-color:${T.accentBorder}}
    input::placeholder,textarea::placeholder{color:${T.textFaint}}
    select option{background:${T.bg3}}
    button{font-family:${T.font};cursor:pointer}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes scoreIn{from{stroke-dashoffset:440}}
    .fu{animation:fadeUp 0.3s ease both}
    .fu1{animation:fadeUp 0.3s 0.05s ease both}
    .fu2{animation:fadeUp 0.3s 0.1s ease both}
    .fu3{animation:fadeUp 0.3s 0.15s ease both}
    .fu4{animation:fadeUp 0.3s 0.2s ease both}
    .fu5{animation:fadeUp 0.3s 0.25s ease both}
  `;
  document.head.appendChild(s);
}

/* ── Utilities ── */
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const sKey = (uid, t) => `fa_${uid}_${t}`;
const save = (uid, t, d) => { try { localStorage.setItem(sKey(uid, t), JSON.stringify(d)); } catch {} };
const load = (uid, t) => { try { const v = localStorage.getItem(sKey(uid, t)); return v ? JSON.parse(v) : null; } catch { return null; } };
const hexRgb = (h) => { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "255,255,255"; };

/* ── Primitives ── */
const Card = ({ children, style = {}, cls = "" }) => (
  <div className={cls} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.rLg, padding: "1.25rem", ...style }}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: T.textFaint, marginBottom: 5 }}>
    {children}
  </div>
);

const Spinner = ({ size = 17, color = T.accent }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}>
    <circle cx={9} cy={9} r={7} fill="none" stroke={T.bg4} strokeWidth={2} />
    <path d="M9 2 A7 7 0 0 1 16 9" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const Btn = ({ children, onClick, disabled, variant = "primary", style: s = {} }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "9px 18px", borderRadius: T.r, fontFamily: T.font,
    fontSize: 13, fontWeight: 500, border: "1px solid",
    opacity: disabled ? 0.42 : 1, cursor: disabled ? "not-allowed" : "pointer",
    transition: "opacity 0.15s, background 0.15s", ...s,
  };
  const variants = {
    primary: { background: T.accent, color: "#0c0e12", borderColor: T.accent },
    ghost: { background: "transparent", color: T.textMuted, borderColor: T.border },
    outline: { background: "transparent", color: T.text, borderColor: T.borderMid },
  };
  return <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Pill = ({ children, color = T.accent }) => (
  <span style={{
    background: `rgba(${hexRgb(color)},0.1)`, color,
    border: `1px solid rgba(${hexRgb(color)},0.22)`,
    borderRadius: 99, fontSize: 11, fontWeight: 500, padding: "3px 9px",
  }}>{children}</span>
);

/* ── Score Wheel ── */
function ScoreWheel({ score }) {
  const R = 58, CX = 72, CY = 72, circ = 2 * Math.PI * R;
  const off = circ - (score / 100) * circ;
  const col = score >= 70 ? T.green : score >= 50 ? T.yellow : T.red;
  const lbl = score >= 70 ? "Healthy" : score >= 50 ? "Moderate" : "At risk";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.75rem", flexWrap: "wrap" }}>
      <svg width={144} height={144} viewBox="0 0 144 144" style={{ flexShrink: 0 }}>
        {/* bg ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={T.bg4} strokeWidth={11} />
        {/* score arc */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={col} strokeWidth={11}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ animation: "scoreIn 1.2s ease both", transition: "stroke-dashoffset 1s ease" }} />
        {/* tick marks */}
        {[0,25,50,75,100].map(p => {
          const a = (p / 100) * 2 * Math.PI - Math.PI / 2;
          return <line key={p}
            x1={CX + (R - 8) * Math.cos(a)} y1={CY + (R - 8) * Math.sin(a)}
            x2={CX + (R + 2) * Math.cos(a)} y2={CY + (R + 2) * Math.sin(a)}
            stroke={T.bg0} strokeWidth={2} />;
        })}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize={30} fontFamily={T.fontDisplay} fill={col}>{score}</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize={11} fill={T.textMuted}>out of 100</text>
        <text x={CX} y={CY + 28} textAnchor="middle" fontSize={11} fontWeight={500} fill={col}>{lbl}</text>
      </svg>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 18, color: col, marginBottom: 6 }}>{lbl} finances</div>
        <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.65, marginBottom: 12 }}>
          Your score reflects savings discipline, expense control, and emergency fund strength — out of 100 possible points.
        </div>
        {/* mini bar breakdown */}
        {[["Savings ratio", Math.min(100, score >= 70 ? 95 : score >= 50 ? 70 : 40)],
          ["Expense control", Math.min(100, score >= 70 ? 85 : score >= 50 ? 65 : 35)],
          ["Emergency fund", Math.min(100, score >= 70 ? 90 : score >= 50 ? 60 : 30)]].map(([lbl2, v]) => (
          <div key={lbl2} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: T.textFaint }}>{lbl2}</span>
              <span style={{ fontSize: 11, color: T.textMuted }}>{v}%</span>
            </div>
            <div style={{ height: 4, background: T.bg4, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${v}%`, background: col, borderRadius: 99, transition: "width 1.2s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Stat card ── */
const StatCard = ({ label, value, sub, color = T.text, cls = "" }) => (
  <div className={cls} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "13px 15px" }}>
    <SectionLabel>{label}</SectionLabel>
    <div style={{ fontSize: 20, fontWeight: 600, fontFamily: T.fontDisplay, color, letterSpacing: "-0.02em" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.textFaint, marginTop: 3 }}>{sub}</div>}
  </div>
);

/* ── Insight/warning list ── */
const InsightList = ({ items, type }) => {
  if (!items?.length) return <div style={{ fontSize: 13, color: T.textFaint }}>None recorded.</div>;
  const col = type === "good" ? T.green : T.yellow;
  const dimBg = type === "good" ? T.greenDim : T.yellowDim;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start",
          background: dimBg, borderRadius: T.r, padding: "8px 12px",
          border: `1px solid ${type === "good" ? T.greenBorder : T.yellowBorder}` }}>
          <span style={{ color: col, fontSize: 11, marginTop: 2, flexShrink: 0, fontWeight: 700 }}>
            {type === "good" ? "✓" : "!"}
          </span>
          <span style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.55 }}>{item}</span>
        </div>
      ))}
    </div>
  );
};

/* ── AI report with section parsing ── */
const AIReport = ({ text }) => {
  if (!text) return null;
  const sections = text.split(/\n(?=\d+\.\s)/).filter(Boolean);
  if (sections.length <= 1) return (
    <div style={{ fontSize: 13, lineHeight: 1.8, color: T.textMuted, whiteSpace: "pre-wrap" }}>{text}</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {sections.map((sec, i) => {
        const lines = sec.split("\n");
        const head = lines[0]; const body = lines.slice(1).join("\n").trim();
        return (
          <div key={i} style={{ borderLeft: `2px solid ${T.accentBorder}`, paddingLeft: "1rem" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.accent, marginBottom: 5 }}>{head}</div>
            {body && <div style={{ fontSize: 13, lineHeight: 1.8, color: T.textMuted }}>{body}</div>}
          </div>
        );
      })}
    </div>
  );
};

/* ── Chat ── */
function ChatSection({ userId }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { const s = load(userId, "chat"); setMsgs(s || []); }, [userId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const persist = (m) => { setMsgs(m); save(userId, "chat", m); };

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim(); setInput("");
    const next = [...msgs, { role: "user", text: q }];
    persist(next); setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const d = await res.json();
      persist([...next, { role: "ai", text: d.response || d.error || "No response." }]);
    } catch { persist([...next, { role: "ai", text: "Could not reach the advisor. Check that Flask is running." }]); }
    setLoading(false);
  };

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <SectionLabel>AI Advisor</SectionLabel>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Ask anything about your finances</div>
        </div>
        {msgs.length > 0 && (
          <Btn variant="ghost" onClick={() => persist([])} style={{ fontSize: 12, padding: "6px 12px" }}>Clear history</Btn>
        )}
      </div>

      <div style={{
        height: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10,
        padding: "0.75rem", background: T.bg1, borderRadius: T.r, border: `1px solid ${T.border}`,
        marginBottom: "0.75rem",
      }}>
        {msgs.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center" }}>
            <div style={{ fontSize: 32, opacity: 0.18, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 13, color: T.textFaint }}>Ask about investments, tax, savings goals, SIPs…</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            {m.role === "ai" && <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 3, paddingLeft: 3 }}>AI Advisor</div>}
            <div style={{
              background: m.role === "user" ? T.accentDim : T.bg3,
              color: m.role === "user" ? T.accent : T.text,
              border: `1px solid ${m.role === "user" ? T.accentBorder : T.border}`,
              borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              padding: "9px 13px", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap",
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start" }}>
            <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: "12px 12px 12px 2px", padding: "9px 13px", display: "flex", gap: 7, alignItems: "center" }}>
              <Spinner size={13} /> <span style={{ fontSize: 12, color: T.textFaint }}>Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Type your question and press Enter…" style={{ flex: 1 }} />
        <Btn onClick={send} disabled={loading || !input.trim()}>
          {loading ? <Spinner size={13} color="#0c0e12" /> : null} Send
        </Btn>
      </div>
    </Card>
  );
}

/* ── Goal planner ── */
function GoalPlanner() {
  const [target, setTarget] = useState(""); const [years, setYears] = useState("");
  const [result, setResult] = useState(null); const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calc = async () => {
    if (!target || !years) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API}/goal-plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_amount: parseFloat(target), time_years: parseFloat(years) }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Error"); return; }
      setResult(d);
    } catch { setError("Cannot connect to backend."); }
    finally { setLoading(false); }
  };

  const pct = result ? Math.min(100, Math.round((result.current_monthly_saving / result.required_monthly_saving) * 100)) : 0;

  return (
    <Card>
      <SectionLabel>Goal planner</SectionLabel>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: "1rem" }}>Map your financial goal</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "0.9rem" }}>
        <div>
          <SectionLabel>Target amount (₹)</SectionLabel>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 500000" />
        </div>
        <div>
          <SectionLabel>Time horizon (years)</SectionLabel>
          <input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="e.g. 2" />
        </div>
      </div>

      <Btn onClick={calc} disabled={loading || !target || !years}>
        {loading && <Spinner size={13} color="#0c0e12" />}
        {loading ? "Calculating…" : "Calculate plan"}
      </Btn>

      {error && <div style={{ marginTop: 10, color: T.red, fontSize: 13 }}>{error}</div>}

      {result && (
        <div className="fu" style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <StatCard label="Required monthly" value={`₹${fmt(result.required_monthly_saving)}`} />
            <StatCard label="Your monthly saving" value={`₹${fmt(result.current_monthly_saving)}`}
              color={result.feasible ? T.green : T.red} />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: T.textFaint }}>Savings coverage towards goal</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: result.feasible ? T.green : T.yellow }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: T.bg4, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: result.feasible ? T.green : T.yellow, borderRadius: 99, transition: "width 1s ease" }} />
            </div>
          </div>

          <div style={{
            display: "flex", gap: 11, alignItems: "flex-start",
            background: result.feasible ? T.greenDim : T.yellowDim,
            border: `1px solid ${result.feasible ? T.greenBorder : T.yellowBorder}`,
            borderRadius: T.r, padding: "10px 13px",
          }}>
            <span style={{ color: result.feasible ? T.green : T.yellow, fontSize: 13, marginTop: 1 }}>
              {result.feasible ? "✓" : "⚠"}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: result.feasible ? T.green : T.yellow, marginBottom: 2 }}>
                {result.feasible ? "Goal is achievable" : "Savings gap detected"}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted }}>{result.message}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: T.textMuted }}>
            Recommended: <span style={{ color: T.accent, fontWeight: 500 }}>{result.investment_suggestion}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Dashboard ── */
function Dashboard({ user }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!user?.id) return;
    const saved = load(user.id, "report");
    if (saved) setReport(saved);
    else setReport(null);
    setTab("overview");
    setError("");
  }, [user?.id]);

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/generate-report`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Error generating report."); return; }
      setReport(d); save(user.id, "report", d);
    } catch { setError("Cannot connect to backend. Make sure Flask is running on port 5000."); }
    finally { setLoading(false); }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/download-report`);
      if (!res.ok) { alert("Generate a report first."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `financial_report_profile_${user.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Download failed."); }
    finally { setDownloading(false); }
  };

  const riskCol = { low: T.green, medium: T.yellow, high: T.red }[user?.risk_appetite] || T.textMuted;
  const savRate = user?.income > 0 ? Math.round((user.savings / user.income) * 100) : 0;
  const TABS = ["overview", "ai report", "goals", "chat"];

  return (
    <div style={{ padding: "1.75rem 2rem 3rem", maxWidth: 920, margin: "0 auto" }}>
      {/* Header */}
      <div className="fu" style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textFaint, marginBottom: 4 }}>
              Profile #{user?.id}
            </div>
            <h1 style={{ fontFamily: T.fontDisplay, fontSize: 30, fontWeight: 400, lineHeight: 1.15, color: T.text, marginBottom: 5 }}>
              Financial Dashboard
            </h1>
            <div style={{ fontSize: 13, color: T.textMuted }}>{user?.financial_goals || "No goal set"}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
            {report && (
              <Btn variant="ghost" onClick={download} disabled={downloading} style={{ fontSize: 12 }}>
                {downloading ? <Spinner size={13} /> : "↓"} Download PDF
              </Btn>
            )}
            <Btn onClick={generate} disabled={loading}>
              {loading && <Spinner size={13} color="#0c0e12" />}
              {loading ? "Generating…" : report ? "Regenerate" : "Generate report"}
            </Btn>
          </div>
        </div>
      </div>

      {/* Metric strip */}
      <div className="fu1" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
        <StatCard label="Monthly income" value={`₹${fmt(user?.income)}`} />
        <StatCard label="Monthly expenses" value={`₹${fmt(user?.expenses)}`} color={T.red} />
        <StatCard label="Monthly savings" value={`₹${fmt(user?.savings)}`} color={T.green}
          sub={`${savRate}% of income saved`} />
        <StatCard label="Risk appetite"
          value={(user?.risk_appetite || "—").charAt(0).toUpperCase() + (user?.risk_appetite || "").slice(1)}
          color={riskCol} />
      </div>

      {/* Error */}
      {error && (
        <div className="fu" style={{
          background: T.redDim, border: `1px solid ${T.redBorder}`,
          borderRadius: T.r, padding: "10px 14px", fontSize: 13, color: T.red, marginBottom: "1rem",
        }}>{error}</div>
      )}

      {/* Loading state */}
      {loading && (
        <Card style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "2.5rem" }}>
          <Spinner size={22} /> <span style={{ color: T.textMuted, fontSize: 14 }}>Generating your financial report…</span>
        </Card>
      )}

      {/* Tab bar */}
      {!loading && (
        <div className="fu2">
          <div style={{
            display: "flex", gap: 2, marginBottom: "1.25rem",
            background: T.bg2, border: `1px solid ${T.border}`,
            borderRadius: T.r, padding: 4, width: "fit-content",
          }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none",
                background: tab === t ? T.bg4 : "transparent",
                color: tab === t ? T.text : T.textFaint,
                textTransform: "capitalize", cursor: "pointer", transition: "all 0.15s",
              }}>{t}</button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div className="fu" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {report ? (
                <>
                  <Card>
                    <SectionLabel>Health score</SectionLabel>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: "1.25rem" }}>Financial wellness overview</div>
                    <ScoreWheel score={report.health?.score || 0} />
                  </Card>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <Card>
                      <SectionLabel>Strengths</SectionLabel>
                      <InsightList items={report.health?.insights} type="good" />
                    </Card>
                    <Card>
                      <SectionLabel>Areas to improve</SectionLabel>
                      <InsightList items={report.health?.warnings} type="warn" />
                    </Card>
                  </div>
                </>
              ) : (
                <Card style={{ textAlign: "center", padding: "3.5rem 2rem" }}>
                  <div style={{ fontSize: 40, opacity: 0.15, marginBottom: 14 }}>📊</div>
                  <div style={{ fontFamily: T.fontDisplay, fontSize: 20, marginBottom: 6 }}>No report yet</div>
                  <div style={{ fontSize: 13, color: T.textFaint, marginBottom: "1.5rem" }}>
                    Click "Generate report" above to get your AI-powered financial analysis.
                  </div>
                  <Btn onClick={generate}>Generate report</Btn>
                </Card>
              )}
            </div>
          )}

          {/* ── AI REPORT TAB ── */}
          {tab === "ai report" && (
            <div className="fu">
              {report ? (
                <Card>
                  <SectionLabel>AI-generated analysis</SectionLabel>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: "1.25rem" }}>Personalised financial advice</div>
                  <AIReport text={report.ai_report} />
                </Card>
              ) : (
                <Card style={{ textAlign: "center", padding: "3rem" }}>
                  <div style={{ fontSize: 13, color: T.textFaint }}>Generate a report first to view AI advice.</div>
                </Card>
              )}
            </div>
          )}

          {/* ── GOALS TAB ── */}
          {tab === "goals" && <div className="fu"><GoalPlanner /></div>}

          {/* ── CHAT TAB ── */}
          {tab === "chat" && <div className="fu"><ChatSection userId={user?.id} /></div>}
        </div>
      )}
    </div>
  );
}

/* ── Profile form ── */
function ProfileForm({ onSuccess }) {
  const [form, setForm] = useState({ age: "", income: "", expenses: "", savings: "", risk_appetite: "medium", financial_goals: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/profile`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to save profile."); return; }
      onSuccess(d);
    } catch { setError("Cannot connect to backend. Make sure Flask is running on port 5000."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 500 }}>
        <div className="fu" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 40, color: T.accent, marginBottom: 6, letterSpacing: "-0.01em" }}>FinanceAI</div>
          <div style={{ fontSize: 13, color: T.textMuted }}>Your AI-powered financial advisor</div>
        </div>

        <Card cls="fu1" style={{ padding: "2rem" }}>
          <h2 style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 400, marginBottom: 4 }}>Create your profile</h2>
          <p style={{ fontSize: 13, color: T.textMuted, marginBottom: "1.5rem", lineHeight: 1.6 }}>
            We'll analyse your finances and give you personalised AI-driven advice.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <SectionLabel>Age</SectionLabel>
              <input type="number" value={form.age} onChange={set("age")} placeholder="e.g. 25" />
            </div>
            <div>
              <SectionLabel>Risk appetite</SectionLabel>
              <select value={form.risk_appetite} onChange={set("risk_appetite")}>
                <option value="low">Low — safe & steady</option>
                <option value="medium">Medium — balanced</option>
                <option value="high">High — aggressive growth</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[["Monthly income (₹)", "income"], ["Monthly expenses (₹)", "expenses"], ["Monthly savings (₹)", "savings"]].map(([lbl, k]) => (
              <div key={k}>
                <SectionLabel>{lbl}</SectionLabel>
                <input type="number" value={form[k]} onChange={set(k)} placeholder="₹ 0" />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <SectionLabel>Financial goals</SectionLabel>
            <input type="text" value={form.financial_goals} onChange={set("financial_goals")}
              placeholder="e.g. Buy a car in 2 years, retire at 50…" />
          </div>

          {error && (
            <div style={{ background: T.redDim, border: `1px solid ${T.redBorder}`, borderRadius: T.r, padding: "9px 12px", color: T.red, fontSize: 13, marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <Btn onClick={submit} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
            {loading && <Spinner size={14} color="#0c0e12" />}
            {loading ? "Saving…" : "Save & open dashboard →"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

/* ── Sidebar ── */
function Sidebar({ users, activeUser, onSelect, onNewProfile, page }) {
  const rCol = { low: T.green, medium: T.yellow, high: T.red };
  return (
    <aside style={{
      width: 235, minHeight: "100vh", flexShrink: 0,
      background: T.bg1, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column",
    }}>
      {/* Brand */}
      <div style={{ padding: "1.5rem 1.25rem 1.15rem", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 22, color: T.accent }}>FinanceAI</div>
        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>AI financial advisor</div>
      </div>

      {/* New profile button */}
      <div style={{ padding: "0.75rem 0.75rem 0.5rem" }}>
        <button onClick={onNewProfile} style={{
          width: "100%", textAlign: "left", padding: "9px 11px",
          borderRadius: T.r, fontSize: 13, fontWeight: 500,
          background: page === "profile" ? T.accentDim : "transparent",
          border: `1px solid ${page === "profile" ? T.accentBorder : "transparent"}`,
          color: page === "profile" ? T.accent : T.textMuted,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 9, transition: "all 0.15s",
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> New profile
        </button>
      </div>

      {/* Profiles */}
      <div style={{ padding: "0.5rem 0.75rem", flex: 1, overflowY: "auto" }}>
        <SectionLabel style={{ paddingLeft: 4 }}>Saved profiles</SectionLabel>
        {users.length === 0 && (
          <div style={{ fontSize: 12, color: T.textFaint, padding: "5px 5px" }}>No profiles yet</div>
        )}
        {users.map(u => {
          const active = activeUser?.id === u.id;
          const savRate = u.income > 0 ? Math.round((u.savings / u.income) * 100) : 0;
          return (
            <button key={u.id} onClick={() => onSelect(u)} style={{
              width: "100%", textAlign: "left", padding: "10px 11px",
              borderRadius: T.r, marginBottom: 3,
              background: active ? T.bg3 : "transparent",
              border: `1px solid ${active ? T.borderMid : "transparent"}`,
              cursor: "pointer", transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: active ? T.text : T.textMuted }}>Profile #{u.id}</span>
                {active && <span style={{ width: 6, height: 6, borderRadius: 99, background: T.accent }} />}
              </div>
              <div style={{ fontSize: 11, color: T.textFaint, lineHeight: 1.4, marginBottom: 6 }}>
                {(u.financial_goals || "No goal").slice(0, 28)}{(u.financial_goals || "").length > 28 ? "…" : ""}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: T.textFaint, background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 99, padding: "2px 7px" }}>
                  {savRate}% saved
                </span>
                {u.risk_appetite && (
                  <span style={{ fontSize: 10, color: rCol[u.risk_appetite] || T.textFaint, background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 99, padding: "2px 7px" }}>
                    {u.risk_appetite}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ padding: "0.75rem 1.25rem", borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 11, color: T.textFaint }}>Powered by Gemini AI</div>
      </div>
    </aside>
  );
}

/* ── Root ── */
export default function App() {
  const [page, setPage] = useState("profile");
  const [activeUser, setActiveUser] = useState(null);
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fa_users") || "[]"); } catch { return []; }
  });

  const persistUsers = (list) => {
    setUsers(list);
    try { localStorage.setItem("fa_users", JSON.stringify(list)); } catch {}
  };

  const handleProfileSuccess = (data) => {
    const u = { id: data.user_id, ...data.profile };
    persistUsers([...users.filter(x => x.id !== u.id), u].sort((a, b) => a.id - b.id));
    setActiveUser(u); setPage("dashboard");
  };

  const handleSelect = (u) => { setActiveUser(u); setPage("dashboard"); };
  const handleNewProfile = () => setPage("profile");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg0, fontFamily: T.font }}>
      <Sidebar users={users} activeUser={activeUser} onSelect={handleSelect} onNewProfile={handleNewProfile} page={page} />
      <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        {page === "profile" && <ProfileForm onSuccess={handleProfileSuccess} />}
        {page === "dashboard" && activeUser && <Dashboard user={activeUser} />}
        {page === "dashboard" && !activeUser && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, opacity: 0.15, marginBottom: 12 }}>←</div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 22, marginBottom: 6 }}>No profile selected</div>
              <div style={{ fontSize: 13, color: T.textFaint }}>Pick one from the sidebar or create a new profile.</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}