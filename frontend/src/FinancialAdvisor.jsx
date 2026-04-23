import { useState, useEffect, useRef, useCallback } from "react";

/* ─── API CONFIG ─────────────────────────────────────────── */
const API_BASE = "http://localhost:5000/api";
const API_KEY  = import.meta.env.VITE_API_KEY || "your-api-key";
const headers  = { "Content-Type": "application/json", "X-API-Key": API_KEY };

/* ─── ICONS (inline SVG) ─────────────────────────────────── */
const IconSVG = ({ children, size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

const Icon = {
  Chart:      ({ size = 16 }) => <IconSVG size={size}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></IconSVG>,
  User:       ({ size = 16 }) => <IconSVG size={size}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></IconSVG>,
  Message:    ({ size = 16 }) => <IconSVG size={size}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></IconSVG>,
  Target:     ({ size = 16 }) => <IconSVG size={size}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></IconSVG>,
  Download:   ({ size = 16 }) => <IconSVG size={size}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></IconSVG>,
  Send:       ({ size = 16 }) => <IconSVG size={size}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></IconSVG>,
  Sparkle:    ({ size = 16 }) => <IconSVG size={size}><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></IconSVG>,
  Shield:     ({ size = 16 }) => <IconSVG size={size}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></IconSVG>,
  Check:      ({ size = 16 }) => <IconSVG size={size}><polyline points="20 6 9 17 4 12"/></IconSVG>,
  Trash:      ({ size = 16 }) => <IconSVG size={size}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></IconSVG>,
  ArrowRight: ({ size = 16 }) => <IconSVG size={size}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></IconSVG>,
  Refresh:    ({ size = 16 }) => <IconSVG size={size}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></IconSVG>,
  Plus:       ({ size = 16 }) => <IconSVG size={size}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></IconSVG>,
};

/* ─── MARKDOWN RENDERER ──────────────────────────────────── */
function escHtml(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function inlineMd(text) {
  if (!text) return "";
  return escHtml(text)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "<span style='color:#C8A96E'>$1</span>")
    .replace(/\*{3}(.+?)\*{3}/g, "<strong><em>$1</em></strong>")
    .replace(/\*{2}(.+?)\*{2}/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code style='background:rgba(200,169,110,0.12);color:#C8A96E;padding:1px 5px;border-radius:4px;font-size:0.9em'>$1</code>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>");
}

function MarkdownRenderer({ content }) {
  const html = parseMarkdown(content || "");
  return (
    <div
      className="md-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function parseMarkdown(md) {
  if (!md) return "";
  const lines = md.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const s   = raw.trim();

    // ── Fenced code block ──
    if (/^(`{3,}|~{3,})/.test(s)) {
      const fence = s.match(/^(`{3,}|~{3,})/)[0];
      const lang  = s.slice(fence.length).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      out.push(`<pre style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px 16px;overflow-x:auto;margin:12px 0"><code style="font-family:monospace;font-size:12.5px;color:#C8A96E;line-height:1.7">${escHtml(codeLines.join("\n"))}</code></pre>`);
      i++;
      continue;
    }

    // ── HR ──
    if (/^([-*_]){3,}$/.test(s)) {
      out.push('<hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:16px 0"/>');
      i++; continue;
    }

    // ── Heading ──
    const hm = s.match(/^(#{1,4})\s+(.*)/);
    if (hm) {
      const lvl = hm[1].length;
      const sizes   = ["1.3em","1.15em","1.05em","1em"];
      const margins = ["18px 0 8px","14px 0 6px","12px 0 5px","10px 0 4px"];
      const colors  = ["#e8eaf0","#C8A96E","#c0c4d0","#8a909e"];
      out.push(`<h${lvl} style="font-size:${sizes[lvl-1]};margin:${margins[lvl-1]};color:${colors[lvl-1]};font-family:'Sora',sans-serif;font-weight:600;letter-spacing:-0.01em">${inlineMd(hm[2])}</h${lvl}>`);
      if (lvl <= 2) out.push(`<div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:8px"></div>`);
      i++; continue;
    }

    // ── Blockquote ──
    if (/^>/.test(s)) {
      const bqLines = [];
      while (i < lines.length && /^>/.test(lines[i].trim())) {
        bqLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote style="border-left:3px solid #C8A96E;margin:10px 0;padding:8px 14px;background:rgba(200,169,110,0.06);border-radius:0 6px 6px 0;color:#9aa0b0;font-size:13px;line-height:1.7">${bqLines.map(l => inlineMd(l)).join("<br/>")}</blockquote>`);
      continue;
    }

    // ── GFM table ──
    if (s.includes("|") && !/^[\s|:\-]+$/.test(s)) {
      const tblLines = [];
      while (i < lines.length && lines[i].includes("|")) {
        tblLines.push(lines[i]);
        i++;
      }
      if (tblLines.length >= 2) {
        const parseCells = row => {
          const parts = row.split("|").map(c => c.trim());
          return parts[0] === "" ? parts.slice(1, parts[parts.length-1] === "" ? -1 : undefined) : parts;
        };
        const hdrs = parseCells(tblLines[0]);
        const rows = tblLines.slice(2).map(parseCells);
        let t = `<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>`;
        hdrs.forEach(h => { t += `<th style="padding:8px 12px;text-align:left;color:#C8A96E;border-bottom:1px solid rgba(200,169,110,0.2);font-weight:600;background:rgba(200,169,110,0.05)">${inlineMd(h)}</th>`; });
        t += `</tr></thead><tbody>`;
        rows.forEach((row, ri) => {
          t += `<tr style="background:${ri%2?"rgba(255,255,255,0.01)":"transparent"}">`;
          hdrs.forEach((_, ci) => { t += `<td style="padding:7px 12px;color:#8a909e;border-bottom:1px solid rgba(255,255,255,0.04)">${inlineMd(row[ci]||"")}</td>`; });
          t += "</tr>";
        });
        t += `</tbody></table></div>`;
        out.push(t);
        continue;
      }
    }

    // ── Table separator ──
    if (/^[\s|:\-]+$/.test(s) && s.includes("|")) { i++; continue; }

    // ── Unordered list ──
    if (/^(\s*)[-*+]\s+/.test(raw)) {
      const items = [];
      while (i < lines.length && /^(\s*)[-*+]\s+/.test(lines[i])) {
        const depth = Math.floor((lines[i].match(/^(\s*)/)[1].length) / 2);
        items.push({ depth, text: lines[i].replace(/^\s*[-*+]\s+/, "") });
        i++;
      }
      let l = `<ul style="margin:8px 0;padding-left:0;list-style:none">`;
      items.forEach(({ depth, text }) => {
        l += `<li style="display:flex;align-items:flex-start;gap:8px;padding:3px 0;padding-left:${depth*16}px;color:#8a909e;font-size:13px;line-height:1.65"><span style="color:#C8A96E;margin-top:6px;flex-shrink:0;font-size:7px">●</span><span>${inlineMd(text)}</span></li>`;
      });
      l += `</ul>`;
      out.push(l); continue;
    }

    // ── Ordered list ──
    if (/^(\s*)\d+[.)]\s+/.test(raw)) {
      const items = [];
      let counter = {};
      while (i < lines.length && /^(\s*)\d+[.)]\s+/.test(lines[i])) {
        const depth = Math.floor((lines[i].match(/^(\s*)/)[1].length) / 2);
        counter[depth] = (counter[depth] || 0) + 1;
        items.push({ depth, text: lines[i].replace(/^\s*\d+[.)]\s+/, ""), num: counter[depth] });
        i++;
      }
      let l = `<ol style="margin:8px 0;padding-left:0;list-style:none">`;
      items.forEach(({ depth, text, num }) => {
        l += `<li style="display:flex;align-items:flex-start;gap:10px;padding:4px 0;padding-left:${depth*16}px;color:#8a909e;font-size:13px;line-height:1.65"><span style="color:#C8A96E;font-weight:600;font-size:12px;flex-shrink:0;min-width:18px;padding-top:1px">${num}.</span><span>${inlineMd(text)}</span></li>`;
      });
      l += `</ol>`;
      out.push(l); continue;
    }

    // ── Blank line ──
    if (!s) { out.push('<div style="height:6px"></div>'); i++; continue; }

    // ── Paragraph ──
    out.push(`<p style="margin:4px 0 8px;color:#8a909e;font-size:13px;line-height:1.75">${inlineMd(s)}</p>`);
    i++;
  }

  return out.join("\n");
}

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
      borderTopColor: "#C8A96E", borderRadius: "50%",
      animation: "spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

/* ─── STAT CARD ──────────────────────────────────────────── */
function StatCard({ label, value, sub, accent = false }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "20px 22px", transition: "border-color 0.2s",
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
  const circ  = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color  = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label  = score >= 70 ? "Healthy" : score >= 50 ? "Moderate" : "At Risk";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 64 64)"
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
  const pct   = max > 0 ? Math.round((score / max) * 100) : 0;
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "#7a8090", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 600 }}>
          {score}<span style={{ color: "#3d4455" }}>/{max}</span>
        </span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color, borderRadius: 999,
          transition: "width 1s cubic-bezier(0.16,1,0.3,1)", boxShadow: `0 0 8px ${color}60`,
        }} />
      </div>
    </div>
  );
}

/* ─── INPUT FIELD ────────────────────────────────────────── */
function InputField({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 6, fontWeight: 500 }}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
          padding: "10px 14px", color: "#e8eaf0", fontSize: 14,
          fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = "rgba(200,169,110,0.5)"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
      />
    </div>
  );
}

/* ─── PROFILE TITLE HELPER ───────────────────────────────── */
// FIX: Show financial_goals as the profile title instead of "Profile #ID"
function profileTitle(user) {
  if (!user) return "";
  const goals = (user.financial_goals || "").trim();
  if (!goals) return `Profile #${user.id}`;
  return goals.length > 52 ? goals.slice(0, 49) + "…" : goals;
}

/* ─── PROFILE FORM ───────────────────────────────────────── */
function ProfileForm({ onCreated, showToast }) {
  const [form, setForm] = useState({
    age: "", income: "", expenses: "", savings: "",
    risk_appetite: "medium", financial_goals: "", debt_emi: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.age || !form.income || !form.expenses || !form.savings) {
      showToast("Please fill in all required fields", "error"); return;
    }
    if (!form.financial_goals.trim()) {
      showToast("Please enter your financial goals", "error"); return;
    }
    setLoading(true);
    try {
      const body = {
        age:             parseInt(form.age, 10),
        income:          parseFloat(form.income),
        expenses:        parseFloat(form.expenses),
        savings:         parseFloat(form.savings),
        risk_appetite:   form.risk_appetite,
        financial_goals: form.financial_goals.trim(),
      };
      const parsedDebtEmi = parseFloat(form.debt_emi);
      if (form.debt_emi.trim() !== "" && !isNaN(parsedDebtEmi) && parsedDebtEmi >= 0) {
        body.debt_emi = parsedDebtEmi;
      }
      const res  = await fetch(`${API_BASE}/profile`, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details ? Object.values(data.details).flat().join("; ") : data.error || "Failed to create profile";
        throw new Error(msg);
      }
      showToast("Profile created successfully", "success");
      onCreated(data.user_id);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#e8eaf0", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}>Create Profile</h2>
        <p style={{ margin: "6px 0 0", color: "#5a6070", fontSize: 14 }}>Enter your financial details to get started</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <InputField label="Age" type="number" value={form.age} onChange={v => set("age", v)} placeholder="25" />
        <InputField label="Monthly Income (₹)" type="number" value={form.income} onChange={v => set("income", v)} placeholder="50000" />
        <InputField label="Monthly Expenses (₹)" type="number" value={form.expenses} onChange={v => set("expenses", v)} placeholder="30000" />
        <InputField label="Monthly Savings (₹)" type="number" value={form.savings} onChange={v => set("savings", v)} placeholder="15000" />
        <InputField label="Monthly Debt / EMI (₹)" type="number" value={form.debt_emi} onChange={v => set("debt_emi", v)} placeholder="Optional" />
        <div>
          <label style={{ display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 6, fontWeight: 500 }}>Risk Appetite</label>
          <select value={form.risk_appetite} onChange={e => set("risk_appetite", e.target.value)}
            style={{ width: "100%", background: "#0c0f14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#e8eaf0", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }}>
            <option value="low">Low — Capital Preservation</option>
            <option value="medium">Medium — Balanced Growth</option>
            <option value="high">High — Maximum Returns</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 6, fontWeight: 500 }}>Financial Goals</label>
        <textarea value={form.financial_goals} onChange={e => set("financial_goals", e.target.value)}
          placeholder="e.g. Buy a house in 5 years, retire at 55, fund child's education..."
          rows={3}
          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#e8eaf0", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "rgba(200,169,110,0.5)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
        />
      </div>
      <button onClick={submit} disabled={loading}
        style={{ marginTop: 20, width: "100%", padding: "12px 24px", background: loading ? "rgba(200,169,110,0.3)" : "linear-gradient(135deg, #C8A96E, #a8894e)", border: "none", borderRadius: 8, color: "#0c0f14", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.02em" }}>
        {loading ? <><Spinner size={16} /> Creating Profile...</> : <><span>Create Profile</span><Icon.ArrowRight size={16} /></>}
      </button>
    </div>
  );
}

/* ─── USER SELECTOR ──────────────────────────────────────── */
function UserSelector({ activeId, onSelect, showToast, onDeleted }) {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/users`, { headers });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      showToast(`Could not load users: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const del = async (id, e) => {
    e.stopPropagation();
    try {
      const res  = await fetch(`${API_BASE}/profile/${id}`, { method: "DELETE", headers });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to delete"); }
      showToast("Profile deleted", "success");
      if (activeId === id) onSelect(null);
      setUsers(u => u.filter(x => x.id !== id));
      onDeleted?.();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  if (loading) return <div style={{ color: "#3d4455", fontSize: 13, padding: "8px 0" }}>Loading profiles...</div>;
  if (!users.length) return <div style={{ color: "#3d4455", fontSize: 13, padding: "8px 0" }}>No profiles yet. Create one above.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {users.map(u => (
        <div key={u.id} onClick={() => onSelect(u.id)}
          style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            padding: "10px 14px", borderRadius: 8, cursor: "pointer",
            background: activeId === u.id ? "rgba(200,169,110,0.1)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${activeId === u.id ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.06)"}`,
            transition: "all 0.15s",
          }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* FIX: Show goal text as profile title */}
            <div style={{ fontSize: 13, fontWeight: 500, color: activeId === u.id ? "#C8A96E" : "#c0c4d0", wordBreak: "break-word", lineHeight: 1.4 }}>
              {profileTitle(u)}
            </div>
            <div style={{ fontSize: 11, color: "#5a6070", marginTop: 3 }}>
              Age {u.age} · {u.risk_appetite} risk · ₹{(u.income || 0).toLocaleString()}/mo
            </div>
          </div>
          <button onClick={e => del(u.id, e)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#3d4455", padding: 4, display: "flex", alignItems: "center", borderRadius: 4, transition: "color 0.15s", flexShrink: 0, marginLeft: 8 }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "#3d4455"}>
            <Icon.Trash size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── REPORT PANEL ───────────────────────────────────────── */

// FIX: Track per-userId "no report" toasts outside component to survive re-renders
const shownNoReportToast = new Set();

function ReportPanel({ userId, userGoal, showToast }) {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const load = async () => {
      setFetching(true);
      setReport(null);
      try {
        const res = await fetch(`${API_BASE}/report/${userId}`, { headers });
        if (res.ok) {
          const d = await res.json();
          // FIX: Normalise the response — GET /report/:id returns { health, ai_report }
          // but the health object may come back flat from older DB rows.
          // Always ensure pillar_scores exists.
          const health = d.health || {};
          if (!health.pillar_scores) health.pillar_scores = {};
          setReport({ health, ai_report: d.ai_report });
        } else {
          // FIX: Only show "no report" toast ONCE per profile, regardless of how many
          // times the user opens the Report tab for that profile.
          if (!shownNoReportToast.has(userId)) {
            shownNoReportToast.add(userId);
            showToast("No report yet — click Generate to create one", "error");
          }
        }
      } catch {
        showToast("Could not load report", "error");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [userId]);

  const generate = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/generate-report`, {
        method: "POST", headers, body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details ? Object.values(data.details).flat().join("; ") : data.error || "Failed to generate report";
        throw new Error(msg);
      }
      // FIX: POST returns { user_id, health, ai_report } — health always has pillar_scores
      const health = data.health || {};
      if (!health.pillar_scores) health.pillar_scores = {};
      setReport({ health, ai_report: data.ai_report });
      // Clear the "already shown" flag so the next fresh load doesn't suppress a real error
      shownNoReportToast.delete(userId);
      showToast("Report generated", "success");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    fetch(`${API_BASE}/download-report/${userId}`, { headers })
      .then(res => { if (!res.ok) throw new Error("No report to download"); return res.blob(); })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = `financial_report_profile_${userId}.pdf`; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(e => showToast(e.message, "error"));
  };

  const PILLAR_META = [
    { key: "savings_rate",    label: "Savings Rate",    max: 25 },
    { key: "expense_control", label: "Expense Control", max: 20 },
    { key: "emergency_fund",  label: "Emergency Fund",  max: 20 },
    { key: "debt_ratio",      label: "Debt-to-Income",  max: 15 },
    { key: "retirement",      label: "Retirement",      max: 10 },
    { key: "tax_efficiency",  label: "Tax Efficiency",  max:  5 },
    { key: "surplus_buffer",  label: "Surplus Buffer",  max:  5 },
  ];

  if (fetching) return <div style={{ color: "#3d4455", fontSize: 13 }}>Loading report...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#e8eaf0", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}>
            Financial Report
          </h2>
          {/* FIX: Show goal as subtitle instead of "Profile #ID" */}
          <p style={{ margin: "4px 0 0", color: "#5a6070", fontSize: 13, wordBreak: "break-word" }}>
            {userGoal || `Profile #${userId}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {report && (
            <button onClick={download}
              style={{ padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#c0c4d0", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
              <Icon.Download size={13} /> PDF
            </button>
          )}
          <button onClick={generate} disabled={loading}
            style={{ padding: "8px 14px", background: loading ? "rgba(200,169,110,0.2)" : "rgba(200,169,110,0.15)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: 7, color: "#C8A96E", fontSize: 12, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
            {loading ? <><Spinner size={12} /> Generating...</> : <><Icon.Refresh size={13} />{report ? "Regenerate" : "Generate"}</>}
          </button>
        </div>
      </div>

      {!report ? (
        <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, color: "#3d4455" }}><Icon.Chart size={40} /></div>
          <p style={{ color: "#5a6070", fontSize: 14, margin: 0 }}>No report yet. Click Generate to create your financial analysis.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Score + Pillars */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20 }}>
            <ScoreRing score={report.health?.score || 0} />
            <div>
              <div style={{ marginBottom: 12, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", fontWeight: 500 }}>Pillar Breakdown</div>
              {/* FIX: Use nullish coalescing with explicit 0 fallback so bars render correctly */}
              {PILLAR_META.map(p => (
                <PillarBar
                  key={p.key}
                  label={p.label}
                  score={report.health?.pillar_scores?.[p.key] ?? 0}
                  max={p.max}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {/* FIX: health_service returns savings_ratio/expense_ratio already as % floats
                (e.g. 37.5 not 0.375), and emg_months as a plain float. Display directly. */}
            <StatCard label="Savings Rate"   value={`${report.health?.savings_ratio ?? 0}%`} />
            <StatCard label="Expense Ratio"  value={`${report.health?.expense_ratio ?? 0}%`} />
            <StatCard label="Emergency Fund" value={`${report.health?.emg_months ?? 0} mo`} />
          </div>

          {/* Insights */}
          {(report.health?.insights?.length > 0) && (
            <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#10b981", marginBottom: 10, fontWeight: 600 }}>Strengths</div>
              {report.health.insights.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ color: "#10b981", flexShrink: 0, marginTop: 1 }}><Icon.Check size={14} /></span>
                  <span style={{ fontSize: 13, color: "#6ee7b7", lineHeight: "1.5" }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {(report.health?.warnings?.length > 0) && (
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

          {/* FIX: AI Report — render with full markdown instead of plain pre-wrap text */}
          {report.ai_report && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C8A96E", marginBottom: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon.Sparkle size={13} /> AI Advisory
              </div>
              <MarkdownRenderer content={report.ai_report} />
            </div>
          )}

        </div>
      )}
    </div>
  );
}

/* ─── CHAT PANEL ─────────────────────────────────────────── */
function ChatPanel({ userId, userGoal, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const bottomRef               = useRef(null);

  useEffect(() => {
    const load = async () => {
      setFetching(true);
      setMessages([]);
      try {
        const res  = await fetch(`${API_BASE}/chat/history/${userId}`, { headers });
        if (!res.ok) throw new Error(`Failed to load history: ${res.status}`);
        const data = await res.json();
        setMessages(data.history || []);
      } catch (e) {
        showToast(e.message, "error");
      } finally {
        setFetching(false);
      }
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
      const res  = await fetch(`${API_BASE}/chat`, { method: "POST", headers, body: JSON.stringify({ user_id: userId, query: q }) });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details ? Object.values(data.details).flat().join("; ") : data.error || "Failed to send message";
        throw new Error(msg);
      }
      setMessages(m => [...m, { role: "ai", message: data.response }]);
    } catch (e) {
      showToast(e.message, "error");
      setMessages(m => [...m, { role: "ai", message: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/history/${userId}`, { method: "DELETE", headers });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to clear history"); }
      setMessages([]);
      showToast("Chat cleared", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  if (fetching) return <div style={{ color: "#3d4455", fontSize: 13 }}>Loading chat...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 480 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#e8eaf0", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}>AI Advisor</h2>
          {/* FIX: Show goal as subtitle */}
          <p style={{ margin: "4px 0 0", color: "#5a6070", fontSize: 13 }}>{userGoal || `Profile #${userId}`}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#5a6070", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, paddingRight: 4 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#3d4455", fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "#2d3240" }}><Icon.Message size={36} /></div>
            <p style={{ margin: 0 }}>Start a conversation with your AI financial advisor</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px",
              borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              background: m.role === "user" ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${m.role === "user" ? "rgba(200,169,110,0.25)" : "rgba(255,255,255,0.07)"}`,
            }}>
              {m.role === "ai" && (
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C8A96E", marginBottom: 6, fontWeight: 600 }}>Advisor</div>
              )}
              {/* FIX: AI messages also get markdown rendering */}
              {m.role === "ai"
                ? <MarkdownRenderer content={m.message} />
                : <div style={{ fontSize: 13, lineHeight: "1.7", color: "#e8d5a8", fontFamily: "'DM Sans', sans-serif" }}>{m.message}</div>
              }
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

      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about investments, budgeting, tax savings..."
          style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#e8eaf0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
          onFocus={e => e.target.style.borderColor = "rgba(200,169,110,0.4)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ padding: "10px 14px", background: input.trim() && !loading ? "linear-gradient(135deg, #C8A96E, #a8894e)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: input.trim() && !loading ? "#0c0f14" : "#3d4455", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
          <Icon.Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* ─── FEASIBILITY RING ───────────────────────────────────── */
function FeasibilityRing({ score, label }) {
  const r      = 52, cx = 64, cy = 64;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color  = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="26" fontWeight="700" fontFamily="'Sora', sans-serif">{score}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#5a6070" fontSize="11" fontFamily="'DM Sans', sans-serif">/100</text>
      </svg>
      <span style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

/* ─── GOAL FEASIBILITY SIMULATOR ────────────────────────── */
function GoalPanel({ userId, userGoal, showToast }) {
  const [form, setForm]       = useState({ goal_name: "", target_amount: "", time_years: "" });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = form.target_amount && form.time_years && !loading;

  const submit = async () => {
    const amount = parseFloat(form.target_amount);
    const years  = parseFloat(form.time_years);
    if (!form.target_amount || isNaN(amount) || amount <= 0) { showToast("Please enter a valid goal amount", "error"); return; }
    if (!form.time_years || isNaN(years) || years < 0.5) { showToast("Target horizon must be at least 0.5 years", "error"); return; }
    setLoading(true);
    try {
      const body = {
        user_id:       userId,
        goal_name:     form.goal_name.trim() || "My Goal",
        target_amount: amount,
        time_years:    years,
      };
      const res  = await fetch(`${API_BASE}/goal-plan`, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details ? Object.values(data.details).flat().join("; ") : data.error || "Simulation failed";
        throw new Error(msg);
      }
      setResult(data);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fScore = result?.feasibility_score ?? 0;
  const fColor = fScore >= 75 ? "#10b981" : fScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "linear-gradient(135deg, #C8A96E, #a8894e)" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C8A96E", fontWeight: 600 }}>Simulation Layer</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#e8eaf0", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}>
          Goal Feasibility Simulator
        </h2>
        <p style={{ margin: "4px 0 0", color: "#5a6070", fontSize: 13 }}>{userGoal || `Profile #${userId}`}</p>
      </div>

      {/* ── Input form ── */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 14, fontWeight: 500 }}>Scenario Parameters</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <InputField
            label="Scenario Name"
            type="text"
            value={form.goal_name}
            onChange={v => setForm(f => ({ ...f, goal_name: v }))}
            placeholder="e.g. Car Purchase"
          />
          <InputField
            label="Goal Amount (₹)"
            type="number"
            value={form.target_amount}
            onChange={v => setForm(f => ({ ...f, target_amount: v }))}
            placeholder="500000"
          />
          <InputField
            label="Target Horizon (Years)"
            type="number"
            value={form.time_years}
            onChange={v => setForm(f => ({ ...f, time_years: v }))}
            placeholder="3"
          />
        </div>
      </div>

      <button onClick={submit} disabled={!canSubmit}
        style={{ width: "100%", padding: "12px 24px", background: canSubmit ? "linear-gradient(135deg, #C8A96E, #a8894e)" : "rgba(200,169,110,0.2)", border: "none", borderRadius: 8, color: "#0c0f14", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: canSubmit ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.01em" }}>
        {loading ? <><Spinner size={16} /> Running Simulation...</> : <><Icon.Target size={16} /><span>Run Feasibility Simulation</span></>}
      </button>

      {/* ── Results ── */}
      {result && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Feasibility Score + Verdict */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20 }}>
            <FeasibilityRing score={result.feasibility_score} label={result.feasibility_label} />
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5a6070", marginBottom: 6, fontWeight: 500 }}>
                {result.goal_name}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: fColor, fontFamily: "'Sora', sans-serif", marginBottom: 8 }}>
                {result.feasible ? "✓ Goal Achievable" : "⚡ Gap Detected"}
              </div>
              <div style={{ fontSize: 13, color: "#7a8090", lineHeight: 1.6 }}>
                {result.scenario_message}
              </div>
              {result.recommended_timeline && !result.feasible && (
                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 6, padding: "5px 10px" }}>
                  <span style={{ fontSize: 11, color: "#C8A96E", fontWeight: 600 }}>Achievable in</span>
                  <span style={{ fontSize: 13, color: "#e8d5a8", fontWeight: 700 }}>{result.recommended_timeline}</span>
                  <span style={{ fontSize: 11, color: "#5a6070" }}>at current savings rate</span>
                </div>
              )}
            </div>
          </div>

          {/* Gap Analysis */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 14, fontWeight: 500 }}>Gap Analysis</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={{ textAlign: "center", padding: "14px 10px", background: "rgba(16,185,129,0.05)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.12)" }}>
                <div style={{ fontSize: 10, color: "#5a6070", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Current Saving</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", fontFamily: "'Sora', sans-serif" }}>
                  ₹{(result.current_monthly_saving || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "#3d4455", marginTop: 3 }}>/month</div>
              </div>
              <div style={{ textAlign: "center", padding: "14px 10px", background: "rgba(200,169,110,0.05)", borderRadius: 10, border: "1px solid rgba(200,169,110,0.12)" }}>
                <div style={{ fontSize: 10, color: "#5a6070", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Required SIP</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#C8A96E", fontFamily: "'Sora', sans-serif" }}>
                  ₹{(result.required_monthly_saving || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "#3d4455", marginTop: 3 }}>@ {result.cagr_moderate} CAGR</div>
              </div>
              <div style={{ textAlign: "center", padding: "14px 10px", background: result.feasible ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)", borderRadius: 10, border: `1px solid ${result.feasible ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)"}` }}>
                <div style={{ fontSize: 10, color: "#5a6070", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {result.feasible ? "Monthly Surplus" : "Monthly Gap"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: result.feasible ? "#10b981" : "#ef4444", fontFamily: "'Sora', sans-serif" }}>
                  ₹{result.feasible
                    ? (result.monthly_surplus || 0).toLocaleString()
                    : (result.monthly_gap || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "#3d4455", marginTop: 3 }}>/month</div>
              </div>
            </div>
          </div>

          {/* Three Scenario Simulation */}
          {result.scenarios && result.scenarios.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6070", marginBottom: 14, fontWeight: 500 }}>Scenario Simulation</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {result.scenarios.map(sc => {
                  const scColor = sc.color || "#C8A96E";
                  return (
                    <div key={sc.scenario} style={{ padding: "16px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${sc.feasible ? scColor + "33" : "rgba(255,255,255,0.06)"}`, position: "relative", overflow: "hidden" }}>
                      {sc.feasible && (
                        <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: scColor }} />
                      )}
                      <div style={{ fontSize: 10, color: scColor, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                        {sc.scenario}
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: "#4a5060", marginBottom: 3 }}>Monthly SIP needed</div>
                        <div style={{ fontSize: 19, fontWeight: 700, color: scColor, fontFamily: "'Sora', sans-serif" }}>
                          ₹{(sc.monthly_needed || 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: "#3d4455", marginBottom: 4 }}>@ {sc.cagr} CAGR · {sc.years}yr horizon</div>
                      <div style={{ fontSize: 11, color: sc.feasible ? "#10b981" : "#5a6070", fontWeight: sc.feasible ? 600 : 400 }}>
                        {sc.feasible ? "✓ Feasible now" : `Reach in ${sc.recommended_timeline}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Projection stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <StatCard label="Projected Corpus" value={`₹${((result.projected_value || 0) / 100000).toFixed(1)}L`} sub="at current savings + moderate CAGR" />
            <StatCard label="Goal Coverage" value={`${result.coverage_pct}%`} accent={result.coverage_pct >= 80} sub="of target amount covered" />
          </div>

          {/* Investment Strategy */}
          <div style={{ background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.14)", borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C8A96E", marginBottom: 12, fontWeight: 600 }}>Recommended Investment Strategy</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 10, color: "#5a6070", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Primary</div>
                <div style={{ fontSize: 13, color: "#c0c4d0", fontWeight: 500 }}>{result.investment_strategy || result.investment_suggestion}</div>
              </div>
              <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 10, color: "#5a6070", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Secondary</div>
                <div style={{ fontSize: 13, color: "#c0c4d0", fontWeight: 500 }}>{result.secondary_suggestion}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#6a7080", lineHeight: 1.6, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, borderLeft: "2px solid rgba(200,169,110,0.3)" }}>
              {result.rationale}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────── */
export default function FinancialAdvisor() {
  const [activeTab, setActiveTab]       = useState("profile");
  const [activeUserId, setActiveUserId] = useState(null);
  const [activeUserGoal, setActiveUserGoal] = useState("");  // FIX: track goal text for subtitles
  const [toasts, setToasts]             = useState([]);
  const [refreshKey, setRefreshKey]     = useState(0);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const onUserCreated = (id) => {
    setActiveUserId(id);
    setRefreshKey(k => k + 1);
    setActiveTab("report");
  };

  // FIX: When selecting a user, also capture their goal text for panel subtitles
  const handleSelectUser = useCallback((id, users) => {
    setActiveUserId(id);
    if (id && users) {
      const u = users.find(u => u.id === id);
      setActiveUserGoal(u ? profileTitle(u) : "");
    } else {
      setActiveUserGoal("");
    }
    if (id && activeTab === "profile") setActiveTab("report");
  }, [activeTab]);

  const TABS = [
    { id: "profile", label: "Profile",  Icon: Icon.User    },
    { id: "report",  label: "Report",   Icon: Icon.Chart,   requiresUser: true },
    { id: "chat",    label: "Advisor",  Icon: Icon.Message, requiresUser: true },
    { id: "goal",    label: "Simulator", Icon: Icon.Target,  requiresUser: true },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input::placeholder, textarea::placeholder { color: #3d4455; }
        select option { background: #0c0f14; color: #e8eaf0; }
        .md-body * { font-family: 'DM Sans', sans-serif; }
        .md-body strong { color: #c8d0e0; font-weight: 600; }
        .md-body em { color: #a0a8b8; font-style: italic; }
        .md-body a { color: #C8A96E; text-decoration: none; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080b10", fontFamily: "'DM Sans', sans-serif", color: "#e8eaf0",
        backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(200,169,110,0.06) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(16,185,129,0.04) 0%, transparent 50%)` }}>

        {/* Header */}
        <header style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,11,16,0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 56, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #C8A96E, #a8894e)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon.Shield size={15} />
              </div>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 16, color: "#e8eaf0", letterSpacing: "-0.02em" }}>FinanceAI</span>
              <span style={{ fontSize: 11, color: "#3d4455", marginLeft: 4 }}>Advisory</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {activeUserId && (
                <div style={{ fontSize: 12, color: "#5a6070", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "4px 10px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeUserGoal || `Profile #${activeUserId}`}
                </div>
              )}
              <button onClick={() => setActiveTab("profile")}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: activeTab === "profile" ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${activeTab === "profile" ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 7, color: activeTab === "profile" ? "#C8A96E" : "#7a8090", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
                <Icon.Plus size={13} /> New Profile
              </button>
            </div>
          </div>
        </header>

        {/* Layout */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <nav style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 8 }}>
              {TABS.map(tab => {
                const disabled = tab.requiresUser && !activeUserId;
                const active   = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => !disabled && setActiveTab(tab.id)} disabled={disabled}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", background: active ? "rgba(200,169,110,0.12)" : "transparent", color: active ? "#C8A96E" : disabled ? "#2d3240" : "#6a7080", cursor: disabled ? "default" : "pointer", fontSize: 13, fontWeight: active ? 500 : 400, fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "all 0.15s", marginBottom: 2 }}
                    onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                    <tab.Icon size={16} />
                    {tab.label}
                    {disabled && <span style={{ marginLeft: "auto", fontSize: 10, color: "#2d3240" }}>Profile needed</span>}
                  </button>
                );
              })}
            </nav>

            {/* Saved Profiles */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4a5060", marginBottom: 10, fontWeight: 500 }}>Saved Profiles</div>
              {/* FIX: Pass onSelect with user list so goal text is captured */}
              <UserSelectorWithGoal
                key={refreshKey}
                activeId={activeUserId}
                onSelect={handleSelectUser}
                showToast={showToast}
                onDeleted={() => { setActiveUserId(null); setActiveUserGoal(""); }}
              />
            </div>
          </div>

          {/* Main */}
          <main key={activeTab} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 28, animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1)", minHeight: 400 }}>
            {activeTab === "profile" && <ProfileForm onCreated={onUserCreated} showToast={showToast} />}
            {activeTab === "report" && activeUserId && <ReportPanel key={activeUserId} userId={activeUserId} userGoal={activeUserGoal} showToast={showToast} />}
            {activeTab === "chat"   && activeUserId && <ChatPanel   key={activeUserId} userId={activeUserId} userGoal={activeUserGoal} showToast={showToast} />}
            {activeTab === "goal"   && activeUserId && <GoalPanel   key={activeUserId} userId={activeUserId} userGoal={activeUserGoal} showToast={showToast} />}
            {["report","chat","goal"].includes(activeTab) && !activeUserId && (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, color: "#2d3240" }}><Icon.User size={48} /></div>
                <p style={{ color: "#4a5060", margin: "0 0 16px", fontSize: 14 }}>Select or create a profile to get started</p>
                <button onClick={() => setActiveTab("profile")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "linear-gradient(135deg, #C8A96E, #a8894e)", border: "none", borderRadius: 8, color: "#0c0f14", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                  <Icon.Plus size={14} /> Create New Profile
                </button>
              </div>
            )}
          </main>
        </div>

        {/* Grid overlay */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`, backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)" }} />
      </div>

      <Toast toasts={toasts} />
    </>
  );
}

/* ─── USER SELECTOR (with goal passing) ─────────────────── */
// FIX: Extracted so it can pass full user objects to onSelect
function UserSelectorWithGoal({ activeId, onSelect, showToast, onDeleted }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/users`, { headers });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      showToast(`Could not load users: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const del = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/profile/${id}`, { method: "DELETE", headers });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to delete"); }
      showToast("Profile deleted", "success");
      if (activeId === id) onSelect(null, []);
      setUsers(u => u.filter(x => x.id !== id));
      onDeleted?.();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  if (loading) return <div style={{ color: "#3d4455", fontSize: 13, padding: "8px 0" }}>Loading profiles...</div>;
  if (!users.length) return <div style={{ color: "#3d4455", fontSize: 13, padding: "8px 0" }}>No profiles yet. Create one above.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {users.map(u => (
        <div key={u.id} onClick={() => onSelect(u.id, users)}
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, cursor: "pointer", background: activeId === u.id ? "rgba(200,169,110,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${activeId === u.id ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.06)"}`, transition: "all 0.15s" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* FIX: Show goal text as the profile name */}
            <div style={{ fontSize: 13, fontWeight: 500, color: activeId === u.id ? "#C8A96E" : "#c0c4d0", wordBreak: "break-word", lineHeight: 1.4 }}>
              {profileTitle(u)}
            </div>
            <div style={{ fontSize: 11, color: "#5a6070", marginTop: 3 }}>
              Age {u.age} · {u.risk_appetite} risk · ₹{(u.income || 0).toLocaleString()}/mo
            </div>
          </div>
          <button onClick={e => del(u.id, e)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#3d4455", padding: 4, display: "flex", alignItems: "center", borderRadius: 4, transition: "color 0.15s", flexShrink: 0, marginLeft: 8 }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "#3d4455"}>
            <Icon.Trash size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}