import { useState, useEffect, useRef } from "react";

/* ─── API CONFIG ─────────────────────────────────────────── */
const API_BASE = "http://localhost:5000/api";
const API_KEY  = import.meta.env.VITE_API_KEY || "your-api-key";
const headers  = { "Content-Type": "application/json", "X-API-Key": API_KEY };

/* ─── ICONS (inline SVG components) ─────────────────────── */
const Icon = {
  Chart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Message: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Sparkle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
};

/* ─── TOAST ──────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#1a0a0a" : "#0a1a12",
          border: `1px solid ${t.type === "error" ? "#ef4444" : "#10b981"}`,
          color: t.type === "error" ? "#fca5a5" : "#6ee7b7",
          padding: "10px 16px", borderRadius: 8, fontSize: 13,
          fontFamily: "'DM Sans', sans-serif", maxWidth: 340,
          animation: "slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ─── SPINNER ────────────────────────────────────────────── */
function Spinner({ size = 16 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid rgba(255,255,255,0.15)`,
      borderTopColor: "#C8A96E",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

/* ─── STAT CARD ──────────────────────────────────────────── */
function StatCard({ label, value, sub, accent = false }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "20px 22px",
      transition: "border-color 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
    >
      <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5a6070", fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: accent ? "#C8A96E" : "#e8eaf0", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#3d4455", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ─── SCORE RING ─────────────────────────────────────────── */
function ScoreRing({ score }) {
  const r = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Healthy" : score >= 50 ? "Moderate" : "At Risk";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="26" fontWeight="700" fontFamily="'Sora', sans-serif">{score}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#5a6070" fontSize="11" fontFamily="'DM Sans', sans-serif">/100</text>
      </svg>
      <span style={{ fontSize: 12, color, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

/* ─── PILLAR BAR ─────────────────────────────────────────── */
function PillarBar({ label, score, max }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "#7a8090", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 600 }}>{score}<span style={{ color: "#3d4455" }}>/{max}</span></span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color, borderRadius: 999,
          transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: `0 0 8px ${color}60`,
        }} />
      </div>
    </div>
  );
}

/* ─── PROFILE FORM ───────────────────────────────────────── */
function ProfileForm({ onCreated, showToast }) {
  const [form, setForm] = useState({ age: "", income: "", expenses: "", savings: "", risk_appetite: "medium", financial_goals: "", debt_emi: "" });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      const body = { ...form, age: +form.age, income: +form.income, expenses: +form.expenses, savings: +form.savings };
      if (form.debt_emi) body.debt_emi = +form.debt_emi;
      const res = await fetch(`${API_BASE}/profile`, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      showToast("Profile created successfully", "success");
      onCreated(data.user_id);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const inp = (label, key, type = "text", placeholder = "") => (
    <div>
      <label style={{ display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 6, fontWeight: 500 }}>{label}</label>
      <input
        type={type} value={form[key]} placeholder={placeholder}
        onChange={e => set(key, e.target.value)}
        style={{
          width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8, padding: "10px 14px", color: "#e8eaf0", fontSize: 14,
          fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = "rgba(200,169,110,0.5)"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
      />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#e8eaf0", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}>Create Profile</h2>
        <p style={{ margin: "6px 0 0", color: "#5a6070", fontSize: 14 }}>Enter your financial details to get started</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {inp("Age", "age", "number", "25")}
        {inp("Monthly Income (₹)", "income", "number", "50000")}
        {inp("Monthly Expenses (₹)", "expenses", "number", "30000")}
        {inp("Monthly Savings (₹)", "savings", "number", "15000")}
        {inp("Monthly Debt / EMI (₹)", "debt_emi", "number", "Optional")}
        <div>
          <label style={{ display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 6, fontWeight: 500 }}>Risk Appetite</label>
          <select
            value={form.risk_appetite} onChange={e => set("risk_appetite", e.target.value)}
            style={{
              width: "100%", background: "#0c0f14", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "10px 14px", color: "#e8eaf0", fontSize: 14,
              fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box",
            }}
          >
            <option value="low">Low — Capital Preservation</option>
            <option value="medium">Medium — Balanced Growth</option>
            <option value="high">High — Maximum Returns</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 6, fontWeight: 500 }}>Financial Goals</label>
        <textarea
          value={form.financial_goals} onChange={e => set("financial_goals", e.target.value)}
          placeholder="e.g. Buy a house in 5 years, retire at 55, fund child's education..."
          rows={3}
          style={{
            width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, padding: "10px 14px", color: "#e8eaf0", fontSize: 14,
            fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(200,169,110,0.5)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
        />
      </div>

      <button
        onClick={submit} disabled={loading}
        style={{
          marginTop: 20, width: "100%", padding: "12px 24px",
          background: loading ? "rgba(200,169,110,0.3)" : "linear-gradient(135deg, #C8A96E, #a8894e)",
          border: "none", borderRadius: 8, color: "#0c0f14", fontSize: 14, fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif", cursor: loading ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          letterSpacing: "0.02em", transition: "opacity 0.2s",
        }}
      >
        {loading ? <><Spinner /> Creating Profile...</> : <>Create Profile <Icon.ArrowRight /></>}
      </button>
    </div>
  );
}

/* ─── USER SELECTOR ──────────────────────────────────────── */
function UserSelector({ activeId, onSelect, showToast, onDeleted }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers });
      const data = await res.json();
      setUsers(data.users || []);
    } catch { showToast("Could not load users", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const del = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/profile/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("Profile deleted", "success");
      if (activeId === id) onSelect(null);
      setUsers(u => u.filter(x => x.id !== id));
      onDeleted?.();
    } catch { showToast("Deletion failed", "error"); }
  };

  if (loading) return <div style={{ color: "#3d4455", fontSize: 13, padding: 16 }}>Loading profiles...</div>;
  if (!users.length) return <div style={{ color: "#3d4455", fontSize: 13, padding: 16 }}>No profiles yet. Create one above.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {users.map(u => (
        <div key={u.id}
          onClick={() => onSelect(u.id)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderRadius: 8, cursor: "pointer",
            background: activeId === u.id ? "rgba(200,169,110,0.1)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${activeId === u.id ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.06)"}`,
            transition: "all 0.15s",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: activeId === u.id ? "#C8A96E" : "#c0c4d0" }}>
              Profile #{u.id}
            </div>
            <div style={{ fontSize: 11, color: "#5a6070", marginTop: 1 }}>
              Age {u.age} · {u.risk_appetite} risk · ₹{(u.income || 0).toLocaleString()}/mo
            </div>
          </div>
          <button onClick={e => del(u.id, e)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#3d4455", padding: 4, display: "flex", borderRadius: 4, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "#3d4455"}
          >
            <span style={{ width: 14, height: 14, display: "block" }}><Icon.Trash /></span>
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── REPORT PANEL ───────────────────────────────────────── */
function ReportPanel({ userId, showToast }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const load = async () => {
      setFetching(true);
      try {
        const res = await fetch(`${API_BASE}/report/${userId}`, { headers });
        if (res.ok) { const d = await res.json(); setReport(d); }
      } catch {}
      finally { setFetching(false); }
    };
    load();
  }, [userId]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/generate-report`, { method: "POST", headers, body: JSON.stringify({ user_id: userId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReport(data);
      showToast("Report generated", "success");
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  const download = () => {
    window.open(`${API_BASE}/download-report/${userId}`, "_blank");
  };

  if (fetching) return <div style={{ color: "#3d4455", fontSize: 13 }}>Loading report...</div>;

  const PILLAR_META = [
    { key: "savings_rate", label: "Savings Rate", max: 25 },
    { key: "expense_control", label: "Expense Control", max: 20 },
    { key: "emergency_fund", label: "Emergency Fund", max: 20 },
    { key: "debt_ratio", label: "Debt-to-Income", max: 15 },
    { key: "retirement", label: "Retirement", max: 10 },
    { key: "tax_efficiency", label: "Tax Efficiency", max: 5 },
    { key: "surplus_buffer", label: "Surplus Buffer", max: 5 },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#e8eaf0", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}>Financial Report</h2>
          <p style={{ margin: "4px 0 0", color: "#5a6070", fontSize: 13 }}>Profile #{userId}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {report && (
            <button onClick={download}
              style={{ padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#c0c4d0", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
              <span style={{ width: 13, height: 13 }}><Icon.Download /></span> PDF
            </button>
          )}
          <button onClick={generate} disabled={loading}
            style={{ padding: "8px 14px", background: loading ? "rgba(200,169,110,0.2)" : "rgba(200,169,110,0.15)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: 7, color: "#C8A96E", fontSize: 12, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
            {loading ? <><Spinner size={12} /> Generating...</> : <><span style={{ width: 13, height: 13 }}><Icon.Refresh /></span>{report ? "Regenerate" : "Generate"}</>}
          </button>
        </div>
      </div>

      {!report ? (
        <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 12 }}>
          <div style={{ width: 40, height: 40, margin: "0 auto 16px", color: "#3d4455" }}><Icon.Chart /></div>
          <p style={{ color: "#5a6070", fontSize: 14, margin: 0 }}>No report yet. Click Generate to create your financial analysis.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Score + Pillars */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20 }}>
            <ScoreRing score={report.health?.score || 0} />
            <div>
              <div style={{ marginBottom: 12, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", fontWeight: 500 }}>Pillar Breakdown</div>
              {PILLAR_META.map(p => (
                <PillarBar key={p.key} label={p.label} score={report.health?.pillar_scores?.[p.key] || 0} max={p.max} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <StatCard label="Savings Rate" value={`${report.health?.savings_ratio || 0}%`} />
            <StatCard label="Expense Ratio" value={`${report.health?.expense_ratio || 0}%`} />
            <StatCard label="Emergency Fund" value={`${report.health?.emg_months || 0}mo`} />
          </div>

          {/* Insights */}
          {report.health?.insights?.length > 0 && (
            <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#10b981", marginBottom: 10, fontWeight: 600 }}>Strengths</div>
              {report.health.insights.map((i, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ color: "#10b981", flexShrink: 0, marginTop: 1, width: 14, height: 14 }}><Icon.Check /></span>
                  <span style={{ fontSize: 13, color: "#6ee7b7", lineHeight: "1.5" }}>{i}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {report.health?.warnings?.length > 0 && (
            <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f59e0b", marginBottom: 10, fontWeight: 600 }}>Areas to Improve</div>
              {report.health.warnings.map((w, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ color: "#f59e0b", flexShrink: 0, fontSize: 14, lineHeight: "1.5", fontWeight: 700 }}>!</span>
                  <span style={{ fontSize: 13, color: "#fde68a", lineHeight: "1.5" }}>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Report */}
          {report.ai_report && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C8A96E", marginBottom: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 13, height: 13 }}><Icon.Sparkle /></span> AI Advisory
              </div>
              <div style={{ fontSize: 13, color: "#8a909e", lineHeight: "1.8", whiteSpace: "pre-wrap", fontFamily: "'DM Sans', sans-serif" }}>
                {report.ai_report}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CHAT PANEL ─────────────────────────────────────────── */
function ChatPanel({ userId, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/chat/history/${userId}`, { headers });
        const data = await res.json();
        if (res.ok) setMessages(data.history || []);
      } catch {}
      finally { setFetching(false); }
    };
    load();
  }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", message: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, { method: "POST", headers, body: JSON.stringify({ user_id: userId, query: q }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessages(m => [...m, { role: "ai", message: data.response }]);
    } catch (e) {
      showToast(e.message, "error");
      setMessages(m => [...m, { role: "ai", message: "Sorry, something went wrong. Please try again." }]);
    } finally { setLoading(false); }
  };

  const clearHistory = async () => {
    try {
      await fetch(`${API_BASE}/chat/history/${userId}`, { method: "DELETE", headers });
      setMessages([]);
      showToast("Chat cleared", "success");
    } catch { showToast("Failed to clear", "error"); }
  };

  if (fetching) return <div style={{ color: "#3d4455", fontSize: 13 }}>Loading chat...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 480 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#e8eaf0", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}>AI Advisor</h2>
          <p style={{ margin: "4px 0 0", color: "#5a6070", fontSize: 13 }}>Ask anything about your finances</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory}
            style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#5a6070", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, paddingRight: 4 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#3d4455", fontSize: 13 }}>
            <div style={{ width: 36, height: 36, margin: "0 auto 12px", color: "#2d3240" }}><Icon.Message /></div>
            <p style={{ margin: 0 }}>Start a conversation with your AI financial advisor</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              background: m.role === "user" ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${m.role === "user" ? "rgba(200,169,110,0.25)" : "rgba(255,255,255,0.07)"}`,
              color: m.role === "user" ? "#e8d5a8" : "#9aa0b0",
              fontSize: 13, lineHeight: "1.7", fontFamily: "'DM Sans', sans-serif",
            }}>
              {m.role === "ai" && (
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C8A96E", marginBottom: 5, fontWeight: 600 }}>Advisor</div>
              )}
              <div style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 12, width: "fit-content" }}>
            <Spinner size={12} />
            <span style={{ fontSize: 12, color: "#5a6070" }}>Analyzing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about investments, budgeting, tax savings..."
          style={{
            flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, padding: "10px 14px", color: "#e8eaf0", fontSize: 13,
            fontFamily: "'DM Sans', sans-serif", outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(200,169,110,0.4)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{
            padding: "10px 14px", background: input.trim() && !loading ? "linear-gradient(135deg, #C8A96E, #a8894e)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
            color: input.trim() && !loading ? "#0c0f14" : "#3d4455",
            cursor: input.trim() && !loading ? "pointer" : "default",
            display: "flex", alignItems: "center", transition: "all 0.2s",
          }}>
          <span style={{ width: 16, height: 16 }}><Icon.Send /></span>
        </button>
      </div>
    </div>
  );
}

/* ─── GOAL PANEL ─────────────────────────────────────────── */
function GoalPanel({ userId, showToast }) {
  const [form, setForm] = useState({ target_amount: "", time_years: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const body = { user_id: userId, target_amount: +form.target_amount, time_years: +form.time_years };
      const res = await fetch(`${API_BASE}/goal-plan`, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#e8eaf0", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}>Goal Planner</h2>
        <p style={{ margin: "4px 0 0", color: "#5a6070", fontSize: 13 }}>SIP calculator with compound returns</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {[["Target Amount (₹)", "target_amount", "500000"], ["Time Horizon (years)", "time_years", "5"]].map(([label, key, ph]) => (
          <div key={key}>
            <label style={{ display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 6, fontWeight: 500 }}>{label}</label>
            <input
              type="number" value={form[key]} placeholder={ph} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#e8eaf0", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "rgba(200,169,110,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={loading || !form.target_amount || !form.time_years}
        style={{
          width: "100%", padding: "11px 24px",
          background: loading ? "rgba(200,169,110,0.2)" : "linear-gradient(135deg, #C8A96E, #a8894e)",
          border: "none", borderRadius: 8, color: "#0c0f14", fontSize: 14, fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif", cursor: loading ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        {loading ? <><Spinner /> Calculating...</> : <>Calculate Plan <Icon.ArrowRight /></>}
      </button>

      {result && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Feasibility Banner */}
          <div style={{
            padding: "14px 18px", borderRadius: 10,
            background: result.feasible ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${result.feasible ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
          }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: result.feasible ? "#10b981" : "#f59e0b", marginBottom: 5 }}>
              {result.feasible ? "✓ Goal Achievable" : "! Gap Detected"}
            </div>
            <div style={{ fontSize: 13, color: "#8a909e", lineHeight: "1.5" }}>{result.message}</div>
          </div>

          {/* SIP Scenarios */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 14, fontWeight: 500 }}>Required Monthly SIP</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                ["Conservative", result.sip_conservative, result.cagr_conservative, "#6ee7b7"],
                ["Moderate", result.sip_moderate, result.cagr_moderate, "#C8A96E"],
                ["Aggressive", result.sip_aggressive, result.cagr_aggressive, "#f87171"],
              ].map(([label, sip, cagr, color]) => (
                <div key={label} style={{ textAlign: "center", padding: "12px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 10, color: "#5a6070", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'Sora', sans-serif" }}>₹{(sip || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: "#3d4455", marginTop: 3 }}>@ {cagr} CAGR</div>
                </div>
              ))}
            </div>
          </div>

          {/* Coverage */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <StatCard label="Current Coverage" value={`${result.coverage_pct}%`} accent={result.coverage_pct >= 80} />
            <StatCard label="Projected Value" value={`₹${((result.projected_value || 0) / 100000).toFixed(1)}L`} />
          </div>

          {/* Recommendations */}
          <div style={{ background: "rgba(200,169,110,0.05)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C8A96E", marginBottom: 10, fontWeight: 600 }}>Recommended Strategy</div>
            <div style={{ fontSize: 13, color: "#8a909e", lineHeight: "1.6" }}>
              <strong style={{ color: "#c0c4d0" }}>Primary:</strong> {result.investment_suggestion}<br />
              <strong style={{ color: "#c0c4d0" }}>Secondary:</strong> {result.secondary_suggestion}<br />
              <span style={{ color: "#6a7080" }}>{result.rationale}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────── */
export default function FinancialAdvisor() {
  const [activeTab, setActiveTab] = useState("profile");
  const [activeUserId, setActiveUserId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const onUserCreated = (id) => {
    setActiveUserId(id);
    setRefreshKey(k => k + 1);
    setActiveTab("report");
  };

  const TABS = [
    { id: "profile", label: "Profile", icon: Icon.User },
    { id: "report",  label: "Report",  icon: Icon.Chart,   requiresUser: true },
    { id: "chat",    label: "Advisor", icon: Icon.Message, requiresUser: true },
    { id: "goal",    label: "Goals",   icon: Icon.Target,  requiresUser: true },
  ];

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input::placeholder, textarea::placeholder { color: #3d4455; }
        select option { background: #0c0f14; color: #e8eaf0; }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#080b10",
        fontFamily: "'DM Sans', sans-serif",
        color: "#e8eaf0",
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(200,169,110,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 80% 80%, rgba(16,185,129,0.04) 0%, transparent 50%)
        `,
      }}>

        {/* Header */}
        <header style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(8,11,16,0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 56, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #C8A96E, #a8894e)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 15, height: 15, color: "#0c0f14", display: "block" }}><Icon.Shield /></span>
              </div>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 16, color: "#e8eaf0", letterSpacing: "-0.02em" }}>FinanceAI</span>
              <span style={{ fontSize: 11, color: "#3d4455", marginLeft: 4 }}>Advisory</span>
            </div>

            {activeUserId && (
              <div style={{ fontSize: 12, color: "#5a6070", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "4px 10px" }}>
                Profile #{activeUserId} active
              </div>
            )}
          </div>
        </header>

        {/* Main Layout */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>

          {/* Left Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Navigation */}
            <nav style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 8 }}>
              {TABS.map(tab => {
                const disabled = tab.requiresUser && !activeUserId;
                const active = activeTab === tab.id;
                return (
                  <button key={tab.id}
                    onClick={() => !disabled && setActiveTab(tab.id)}
                    disabled={disabled}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", borderRadius: 8, border: "none",
                      background: active ? "rgba(200,169,110,0.12)" : "transparent",
                      color: active ? "#C8A96E" : disabled ? "#2d3240" : "#6a7080",
                      cursor: disabled ? "default" : "pointer",
                      fontSize: 13, fontWeight: active ? 500 : 400,
                      fontFamily: "'DM Sans', sans-serif",
                      textAlign: "left", transition: "all 0.15s",
                      marginBottom: 2,
                    }}
                    onMouseEnter={e => !disabled && !active && (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ width: 16, height: 16, flexShrink: 0 }}><tab.icon /></span>
                    {tab.label}
                    {disabled && <span style={{ marginLeft: "auto", fontSize: 10, color: "#2d3240" }}>Profile needed</span>}
                  </button>
                );
              })}
            </nav>

            {/* Saved Profiles */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4a5060", marginBottom: 10, fontWeight: 500 }}>Saved Profiles</div>
              <UserSelector
                key={refreshKey}
                activeId={activeUserId}
                onSelect={id => { setActiveUserId(id); if (id && activeTab === "profile") setActiveTab("report"); }}
                showToast={showToast}
                onDeleted={() => setActiveUserId(null)}
              />
            </div>
          </div>

          {/* Main Content */}
          <main style={{
            background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14, padding: 28,
            animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1)",
          }} key={activeTab}>
            {activeTab === "profile" && <ProfileForm onCreated={onUserCreated} showToast={showToast} />}
            {activeTab === "report" && activeUserId && <ReportPanel userId={activeUserId} showToast={showToast} />}
            {activeTab === "chat" && activeUserId && <ChatPanel userId={activeUserId} showToast={showToast} />}
            {activeTab === "goal" && activeUserId && <GoalPanel userId={activeUserId} showToast={showToast} />}
            {["report", "chat", "goal"].includes(activeTab) && !activeUserId && (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ width: 48, height: 48, margin: "0 auto 16px", color: "#2d3240" }}><Icon.User /></div>
                <p style={{ color: "#4a5060", margin: 0, fontSize: 14 }}>Select or create a profile to get started</p>
              </div>
            )}
          </main>
        </div>

        {/* Subtle grid pattern overlay */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)",
        }} />
      </div>
      <Toast toasts={toasts} />
    </>
  );
}