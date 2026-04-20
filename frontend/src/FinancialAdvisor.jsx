import { useState, useEffect, useRef } from "react";

const API     = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
const API_KEY = import.meta.env.VITE_API_KEY || "";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(options.headers || {}),
    },
  });
  return res;
}

// ── Font & Style injection ─────────────────────────────────────────────────
if (!document.getElementById("fa-fonts")) {
  const l = document.createElement("link");
  l.id = "fa-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Syne:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=JetBrains+Mono:wght@400;500;600&display=swap";
  document.head.appendChild(l);
}

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  // Fonts
  display: "'Playfair Display', Georgia, serif",
  ui:      "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'JetBrains Mono', monospace",

  // Backgrounds
  bg0:  "#07090e",
  bg1:  "#0c0f16",
  bg2:  "#101520",
  bg3:  "#151c28",
  bg4:  "#1b2333",
  bg5:  "#212b3d",

  // Borders
  bdr0: "rgba(255,255,255,0.04)",
  bdr1: "rgba(255,255,255,0.07)",
  bdr2: "rgba(255,255,255,0.11)",

  // Text
  text:  "#e4e8f0",
  muted: "#6e7d94",
  faint: "#38475a",

  // Accent — muted gold
  gold:    "#c8a84b",
  goldDim: "rgba(200,168,75,0.08)",
  goldBdr: "rgba(200,168,75,0.18)",
  goldMid: "rgba(200,168,75,0.35)",

  // Semantic
  green:    "#2dd4aa",
  greenDim: "rgba(45,212,170,0.07)",
  greenBdr: "rgba(45,212,170,0.18)",

  red:    "#e8615a",
  redDim: "rgba(232,97,90,0.07)",
  redBdr: "rgba(232,97,90,0.18)",

  yellow:    "#d4a72d",
  yellowDim: "rgba(212,167,45,0.08)",
  yellowBdr: "rgba(212,167,45,0.2)",

  blue:    "#5b8def",
  blueDim: "rgba(91,141,239,0.08)",
  blueBdr: "rgba(91,141,239,0.2)",

  // Misc
  r:   "8px",
  rLg: "12px",
  rXl: "16px",
};

if (!document.getElementById("fa-style")) {
  const s = document.createElement("style");
  s.id = "fa-style";
  s.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background: ${T.bg0};
      color: ${T.text};
      font-family: ${T.body};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Grain texture overlay */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
      background-size: 128px 128px;
    }

    ::-webkit-scrollbar { width: 3px; height: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${T.bg5}; border-radius: 99px; }

    input, select, textarea {
      background: ${T.bg3};
      border: 1px solid ${T.bdr1};
      color: ${T.text};
      border-radius: ${T.r};
      padding: 10px 14px;
      font-family: ${T.body};
      font-size: 13.5px;
      width: 100%;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus, select:focus, textarea:focus {
      border-color: ${T.goldBdr};
      box-shadow: 0 0 0 3px ${T.goldDim};
    }
    input::placeholder, textarea::placeholder { color: ${T.faint}; }
    select option { background: ${T.bg3}; }
    button { font-family: ${T.ui}; cursor: pointer; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes scoreStroke {
      from { stroke-dashoffset: 440; }
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.15; }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50%       { opacity: 1; }
    }

    .fu  { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
    .fu1 { animation: fadeUp 0.4s 0.07s cubic-bezier(0.16,1,0.3,1) both; }
    .fu2 { animation: fadeUp 0.4s 0.14s cubic-bezier(0.16,1,0.3,1) both; }
    .fu3 { animation: fadeUp 0.4s 0.21s cubic-bezier(0.16,1,0.3,1) both; }
    .fi  { animation: fadeIn 0.3s ease both; }

    .card-hover {
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .card-hover:hover {
      transform: translateY(-1px);
      border-color: ${T.bdr2} !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
  `;
  document.head.appendChild(s);
}

// ── Utilities ──────────────────────────────────────────────────────────────
const fmt = n => Number(n || 0).toLocaleString("en-IN");

// ── Markdown renderer ──────────────────────────────────────────────────────
function renderInline(text, key = 0) {
  if (!text) return null;
  const rx = /(\*{3}(.+?)\*{3}|\*{2}(.+?)\*{2}|\*([^*\n]+?)\*|`([^`]+?)`|~~(.+?)~~)/g;
  const parts = []; let last = 0, m, i = 0;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={`t${key}${i++}`}>{text.slice(last, m.index)}</span>);
    if      (m[2]) parts.push(<strong key={`bi${i++}`} style={{ fontStyle:"italic", fontWeight:600 }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<strong key={`b${i++}`}  style={{ color:T.text, fontWeight:600 }}>{m[3]}</strong>);
    else if (m[4]) parts.push(<em     key={`e${i++}`}  style={{ color:T.muted, fontStyle:"italic" }}>{m[4]}</em>);
    else if (m[5]) parts.push(<code   key={`c${i++}`}  style={{ background:T.bg4, color:T.gold, border:`1px solid ${T.bdr1}`, borderRadius:4, padding:"1px 6px", fontSize:"0.84em", fontFamily:T.mono }}>{m[5]}</code>);
    else if (m[6]) parts.push(<span   key={`s${i++}`}  style={{ textDecoration:"line-through", color:T.faint }}>{m[6]}</span>);
    last = rx.lastIndex;
  }
  if (last < text.length) parts.push(<span key={`tf${i}`}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

function MarkdownBlock({ text, chatMode = false }) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = []; let i = 0, key = 0; const K = () => key++;
  let ulBuf = [], olBuf = [], bqBuf = [], cbBuf = [], cbLang = "", inCb = false, tblHdr = null, tblRows = [];
  const depthOf = raw => Math.floor((raw.length - raw.trimStart().length) / 2);
  const flushUL  = () => { if (!ulBuf.length) return; out.push(<ULBlock key={K()} items={ulBuf} chat={chatMode}/>); ulBuf = []; };
  const flushOL  = () => { if (!olBuf.length) return; out.push(<OLBlock key={K()} items={olBuf} chat={chatMode}/>); olBuf = []; };
  const flushBQ  = () => { if (!bqBuf.length) return; out.push(<BlockQuote key={K()} lines={bqBuf}/>); bqBuf = []; };
  const flushTbl = () => { if (!tblHdr) return; out.push(<MDTable key={K()} header={tblHdr} rows={tblRows}/>); tblHdr = null; tblRows = []; };
  const flushAll = () => { flushUL(); flushOL(); flushBQ(); flushTbl(); };

  while (i < lines.length) {
    const raw = lines[i]; const s = raw.trim();
    if (/^(`{3,}|~{3,})/.test(s)) { if (inCb) { out.push(<CodeBlock key={K()} lines={cbBuf} lang={cbLang}/>); cbBuf=[]; cbLang=""; inCb=false; } else { flushAll(); cbLang=s.replace(/^(`{3,}|~{3,})/,"").trim(); cbBuf=[]; inCb=true; } i++; continue; }
    if (inCb) { cbBuf.push(raw); i++; continue; }
    if (!s) { flushUL(); flushOL(); flushBQ(); i++; continue; }
    if (s.startsWith("💡")) { flushAll(); out.push(<TipBox key={K()} text={s.slice(1).trim()}/>); i++; continue; }
    if (/^([-*_]){3,}$/.test(s)) { flushAll(); out.push(<hr key={K()} style={{ border:"none", borderTop:`1px solid ${T.bdr1}`, margin:"14px 0" }}/>); i++; continue; }
    const hm = s.match(/^(#{1,4})\s+(.*)/);
    if (hm) { flushAll(); out.push(<MDHeading key={K()} level={hm[1].length} text={hm[2].trim()}/>); i++; continue; }
    if (s.includes("|") && !/^[\s|:-]+$/.test(s)) { flushUL(); flushOL(); flushBQ(); const cells = s.replace(/^\||\|$/g,"").split("|").map(c=>c.trim()); if (!tblHdr) { tblHdr=cells; tblRows=[]; } else tblRows.push(cells); i++; continue; }
    if (/^[\s|:-]+$/.test(s) && s.includes("|")) { i++; continue; }
    if (tblHdr && !s.includes("|")) flushTbl();
    const bm = s.match(/^(>+)\s*(.*)/);
    if (bm) { flushUL(); flushOL(); bqBuf.push(bm[2]); i++; continue; } else flushBQ();
    const um = raw.match(/^(\s*)[-*+]\s+(.*)/);
    if (um) { flushOL(); ulBuf.push({ depth:depthOf(raw), text:um[2].trim() }); i++; continue; }
    const om = raw.match(/^(\s*)\d+[.)]\s+(.*)/);
    if (om) { flushUL(); olBuf.push({ depth:depthOf(raw), text:om[2].trim() }); i++; continue; }
    flushUL(); flushOL();
    if (s) out.push(<p key={K()} style={{ fontSize:13.5, lineHeight:1.8, color:chatMode?"inherit":T.muted, marginBottom:7 }}>{renderInline(s, K())}</p>);
    i++;
  }
  flushAll();
  return <div style={{ textAlign:"left" }}>{out}</div>;
}

function MDHeading({ level, text }) {
  const sz = { 1:17, 2:14.5, 3:13, 4:12 }[level] || 13;
  const col = { 1:T.text, 2:T.gold, 3:T.text, 4:T.muted }[level] || T.text;
  const font = level <= 2 ? T.display : T.ui;
  return (
    <div style={{ marginTop: level<=2?22:12, marginBottom: level<=2?10:5 }}>
      <div style={{ fontSize:sz, fontWeight: level<=2?500:600, color:col, fontFamily:font, lineHeight:1.3, letterSpacing: level<=2?"-0.01em":"0.04em" }}>{renderInline(text)}</div>
      {level===1 && <div style={{ marginTop:6, height:1, background:`linear-gradient(to right, ${T.goldBdr}, transparent)` }}/>}
      {level===2 && <div style={{ marginTop:5, height:1, background:`linear-gradient(to right, ${T.bdr2}, transparent 70%)` }}/>}
    </div>
  );
}
function ULBlock({ items }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3, margin:"6px 0 10px" }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ display:"flex", alignItems:"flex-start", gap:10, paddingLeft:item.depth*16 }}>
          <span style={{ color:T.gold, fontSize:10, lineHeight:"22px", flexShrink:0, marginTop:1, opacity:0.7 }}>◆</span>
          <div style={{ background:T.bg3, border:`1px solid ${T.bdr0}`, borderRadius:T.r, padding:"7px 12px", fontSize:13.5, color:T.muted, lineHeight:1.7, flex:1 }}>{renderInline(item.text, idx)}</div>
        </div>
      ))}
    </div>
  );
}
function OLBlock({ items }) {
  const counters = {};
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3, margin:"6px 0 10px" }}>
      {items.map((item, idx) => {
        const d = item.depth;
        Object.keys(counters).forEach(k => { if (Number(k) > d) delete counters[k]; });
        counters[d] = (counters[d] || 0) + 1;
        return (
          <div key={idx} style={{ display:"flex", alignItems:"flex-start", gap:10, paddingLeft:d*16 }}>
            <span style={{ width:20, height:20, borderRadius:4, flexShrink:0, background:T.goldDim, border:`1px solid ${T.goldBdr}`, color:T.gold, fontSize:9, fontWeight:600, fontFamily:T.mono, display:"flex", alignItems:"center", justifyContent:"center", marginTop:2 }}>{counters[d]}</span>
            <div style={{ background:T.bg3, border:`1px solid ${T.bdr0}`, borderRadius:T.r, padding:"7px 12px", fontSize:13.5, color:T.muted, lineHeight:1.7, flex:1 }}>{renderInline(item.text, idx)}</div>
          </div>
        );
      })}
    </div>
  );
}
function BlockQuote({ lines }) {
  return (
    <div style={{ display:"flex", gap:0, margin:"8px 0 10px", border:`1px solid ${T.goldBdr}`, borderRadius:T.r, overflow:"hidden" }}>
      <div style={{ width:3, background:T.gold, flexShrink:0 }}/>
      <div style={{ background:T.goldDim, padding:"10px 14px", flex:1 }}>
        {lines.map((ln, i) => <p key={i} style={{ fontSize:13.5, color:T.muted, lineHeight:1.7, fontStyle:"italic", marginBottom:i<lines.length-1?4:0 }}>{renderInline(ln, i)}</p>)}
      </div>
    </div>
  );
}
function CodeBlock({ lines, lang }) {
  return (
    <div style={{ margin:"8px 0 10px" }}>
      {lang && <div style={{ background:T.bg5, borderRadius:`${T.r} ${T.r} 0 0`, padding:"4px 12px", fontSize:10.5, color:T.muted, fontFamily:T.mono, borderBottom:`1px solid ${T.bdr1}`, display:"inline-block", letterSpacing:"0.04em" }}>{lang}</div>}
      <pre style={{ background:T.bg2, borderRadius:lang?`0 ${T.r} ${T.r} ${T.r}`:T.r, border:`1px solid ${T.bdr1}`, padding:"12px 16px", fontFamily:T.mono, fontSize:12, color:T.gold, lineHeight:1.7, overflowX:"auto", whiteSpace:"pre", margin:0 }}>{lines.join("\n")}</pre>
    </div>
  );
}
function MDTable({ header, rows }) {
  return (
    <div style={{ margin:"8px 0 10px", overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
        <thead><tr style={{ background:T.bg4 }}>{header.map((h,i) => <th key={i} style={{ padding:"9px 14px", textAlign:"left", color:T.gold, fontWeight:600, fontFamily:T.ui, fontSize:11, letterSpacing:"0.06em", textTransform:"uppercase", border:`1px solid ${T.bdr1}`, borderBottom:`1px solid ${T.goldBdr}` }}>{renderInline(h,i)}</th>)}</tr></thead>
        <tbody>{rows.map((row,ri) => <tr key={ri} style={{ background:ri%2===0?T.bg3:T.bg2 }}>{row.map((cell,ci) => <td key={ci} style={{ padding:"8px 14px", color:T.muted, border:`1px solid ${T.bdr0}`, lineHeight:1.6 }}>{renderInline(cell,ci)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
function TipBox({ text }) {
  return (
    <div style={{ display:"flex", gap:12, alignItems:"flex-start", margin:"8px 0 10px", background:T.blueDim, border:`1px solid ${T.blueBdr}`, borderRadius:T.r, padding:"10px 14px" }}>
      <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>💡</span>
      <span style={{ fontSize:13.5, color:T.blue, lineHeight:1.7 }}>{renderInline(text)}</span>
    </div>
  );
}

// ── Primitive components ───────────────────────────────────────────────────
const Card = ({ children, style: s = {}, cls = "" }) => (
  <div className={cls} style={{ background:T.bg2, border:`1px solid ${T.bdr1}`, borderRadius:T.rLg, padding:"1.4rem", ...s }}>
    {children}
  </div>
);

const MicroLabel = ({ children, style: s = {} }) => (
  <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:T.faint, fontFamily:T.ui, marginBottom:6, ...s }}>
    {children}
  </div>
);

const Spinner = ({ size = 16, color = T.gold }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{ animation:"spin 0.8s linear infinite", flexShrink:0 }}>
    <circle cx={10} cy={10} r={8} fill="none" stroke={T.bg4} strokeWidth={2}/>
    <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"/>
  </svg>
);

const Btn = ({ children, onClick, disabled, variant = "primary", style: s = {} }) => {
  const base = {
    display:"inline-flex", alignItems:"center", gap:7,
    padding:"9px 20px", borderRadius:T.r,
    fontFamily:T.ui, fontSize:12.5, fontWeight:600,
    letterSpacing:"0.03em",
    border:"1px solid", opacity:disabled?0.38:1,
    cursor:disabled?"not-allowed":"pointer",
    transition:"all 0.18s cubic-bezier(0.16,1,0.3,1)",
    ...s
  };
  const variants = {
    primary: { background:T.gold, color:"#07090e", borderColor:T.gold },
    ghost:   { background:"transparent", color:T.muted, borderColor:T.bdr1 },
    danger:  { background:T.redDim, color:T.red, borderColor:T.redBdr },
  };
  const [hov, setHov] = useState(false);
  const hvStyle = !disabled && hov ? (
    variant === "primary" ? { filter:"brightness(1.12)", boxShadow:`0 4px 20px ${T.goldDim}` } :
    variant === "ghost"   ? { borderColor:T.bdr2, color:T.text } :
    {}
  ) : {};
  return (
    <button
      style={{ ...base, ...variants[variant], ...hvStyle }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
};

const StatCard = ({ label, value, sub, color = T.text }) => (
  <div className="card-hover" style={{ background:T.bg3, border:`1px solid ${T.bdr1}`, borderRadius:T.rLg, padding:"16px 18px" }}>
    <MicroLabel>{label}</MicroLabel>
    <div style={{ fontSize:22, fontWeight:600, fontFamily:T.mono, color, letterSpacing:"-0.02em", lineHeight:1.2 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:T.faint, marginTop:4, fontFamily:T.body }}>{sub}</div>}
  </div>
);

// ── Score Wheel ────────────────────────────────────────────────────────────
function ScoreWheel({ score, health }) {
  const R = 60, CX = 74, CY = 74, circ = 2 * Math.PI * R;
  const off = circ - (score / 100) * circ;
  const col = score >= 70 ? T.green : score >= 50 ? T.yellow : T.red;
  const lbl = score >= 70 ? "Healthy" : score >= 50 ? "Moderate" : "At Risk";
  const bars = [
    { label:"Savings ratio",   v: health?.savings_pct ?? 0 },
    { label:"Expense control", v: health?.expense_pct ?? 0 },
    { label:"Emergency fund",  v: health?.emg_pct     ?? 0 },
  ];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"2.5rem", flexWrap:"wrap" }}>
      <svg width={148} height={148} viewBox="0 0 148 148" style={{ flexShrink:0 }}>
        {/* Background track */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={T.bg4} strokeWidth={10}/>
        {/* Score arc */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={col} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ animation:"scoreStroke 1.4s cubic-bezier(0.16,1,0.3,1) both", transition:"stroke-dashoffset 1s ease" }}
          opacity={0.9}
        />
        {/* Glow */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={col} strokeWidth={2}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`} opacity={0.15}
          style={{ filter:"blur(4px)", animation:"scoreStroke 1.4s cubic-bezier(0.16,1,0.3,1) both" }}
        />
        {/* Tick marks */}
        {[0,25,50,75,100].map(p => {
          const a = (p/100)*2*Math.PI - Math.PI/2;
          return <line key={p} x1={CX+(R-7)*Math.cos(a)} y1={CY+(R-7)*Math.sin(a)} x2={CX+(R+2)*Math.cos(a)} y2={CY+(R+2)*Math.sin(a)} stroke={T.bg0} strokeWidth={2}/>;
        })}
        {/* Score text */}
        <text x={CX} y={CY-8} textAnchor="middle" fontSize={34} fontFamily={T.mono} fontWeight="600" fill={col}>{score}</text>
        <text x={CX} y={CY+10} textAnchor="middle" fontSize={10} fontFamily={T.ui} fill={T.faint} letterSpacing="0.06em">OUT OF 100</text>
        <text x={CX} y={CY+28} textAnchor="middle" fontSize={11} fontFamily={T.ui} fontWeight="600" fill={col} letterSpacing="0.04em">{lbl.toUpperCase()}</text>
      </svg>
      <div style={{ flex:1, minWidth:180 }}>
        {bars.map(b => (
          <div key={b.label} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:11.5, color:T.muted, fontFamily:T.ui, letterSpacing:"0.02em" }}>{b.label}</span>
              <span style={{ fontSize:11.5, fontWeight:600, color:col, fontFamily:T.mono }}>{b.v}%</span>
            </div>
            <div style={{ height:3, background:T.bg4, borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${b.v}%`, background:col, borderRadius:99, transition:"width 1.4s cubic-bezier(0.16,1,0.3,1)", opacity:0.85 }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const InsightList = ({ items, type }) => {
  if (!items?.length) return <div style={{ fontSize:13, color:T.faint, fontStyle:"italic" }}>None recorded.</div>;
  const isGood = type === "good";
  const col = isGood ? T.green : T.yellow;
  const dim = isGood ? T.greenDim : T.yellowDim;
  const bdr = isGood ? T.greenBdr : T.yellowBdr;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", background:dim, border:`1px solid ${bdr}`, borderRadius:T.r, padding:"9px 13px" }}>
          <span style={{ color:col, fontSize:10, fontWeight:700, marginTop:3, flexShrink:0, fontFamily:T.mono }}>{isGood ? "✓" : "!"}</span>
          <span style={{ fontSize:13, color:T.muted, lineHeight:1.65 }}>{item}</span>
        </div>
      ))}
    </div>
  );
};

// ── Chat ───────────────────────────────────────────────────────────────────
function ChatSection({ userId }) {
  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const bottomRef               = useRef(null);

  useEffect(() => {
    if (!userId) return;
    setFetching(true);
    apiFetch(`/chat/history/${userId}`)
      .then(r => r.ok ? r.json() : { history:[] })
      .then(d => setMsgs((d.history || []).map(m => ({ role:m.role, text:m.message }))))
      .catch(() => setMsgs([]))
      .finally(() => setFetching(false));
  }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim(); setInput("");
    setMsgs(prev => [...prev, { role:"user", text:q }]);
    setLoading(true);
    try {
      const res = await apiFetch("/chat", { method:"POST", body:JSON.stringify({ user_id:userId, query:q }) });
      const d = await res.json();
      setMsgs(prev => [...prev, { role:"ai", text:d.response || d.error || "No response." }]);
    } catch {
      setMsgs(prev => [...prev, { role:"ai", text:"Could not reach the advisor." }]);
    }
    setLoading(false);
  };

  const clearHistory = async () => {
    await apiFetch(`/chat/history/${userId}`, { method:"DELETE" });
    setMsgs([]);
  };

  const suggestions = [
    "Where should I invest ₹5,000/month?",
    "How to reduce my expenses?",
    "Is my emergency fund enough?",
    "Should I start an SIP?",
  ];

  return (
    <Card>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.2rem" }}>
        <div>
          <MicroLabel>AI Advisor</MicroLabel>
          <div style={{ fontSize:16, fontWeight:500, fontFamily:T.display }}>Ask about your finances</div>
        </div>
        {msgs.length > 0 && (
          <Btn variant="ghost" onClick={clearHistory} style={{ fontSize:11.5, padding:"6px 14px" }}>Clear history</Btn>
        )}
      </div>

      {msgs.length === 0 && !fetching && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:"1rem" }}>
          {suggestions.map(q => (
            <button key={q} onClick={() => setInput(q)}
              style={{ background:T.bg3, border:`1px solid ${T.bdr1}`, color:T.muted, borderRadius:99, fontSize:12, padding:"6px 14px", cursor:"pointer", fontFamily:T.body, transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.goldBdr; e.currentTarget.style.color=T.gold; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr1; e.currentTarget.style.color=T.muted; }}
            >{q}</button>
          ))}
        </div>
      )}

      <div style={{ height:360, overflowY:"auto", display:"flex", flexDirection:"column", gap:14, padding:"1rem", background:T.bg1, borderRadius:T.rLg, border:`1px solid ${T.bdr0}`, marginBottom:"0.9rem" }}>
        {fetching && (
          <div style={{ margin:"auto", display:"flex", gap:10, alignItems:"center" }}>
            <Spinner size={15}/><span style={{ fontSize:13, color:T.faint, fontFamily:T.ui }}>Loading history…</span>
          </div>
        )}
        {!fetching && msgs.length === 0 && (
          <div style={{ margin:"auto", textAlign:"center" }}>
            <div style={{ fontSize:32, opacity:0.1, marginBottom:10 }}>◈</div>
            <div style={{ fontSize:13, color:T.faint, fontFamily:T.ui, letterSpacing:"0.02em" }}>Select a suggestion or type your question</div>
          </div>
        )}
        {msgs.map((m, idx) => (
          <div key={idx} className="fi" style={{ alignSelf:m.role==="user"?"flex-end":"flex-start", maxWidth:"82%" }}>
            {m.role==="ai" && (
              <div style={{ fontSize:10, color:T.faint, marginBottom:4, paddingLeft:3, display:"flex", alignItems:"center", gap:5, fontFamily:T.ui, letterSpacing:"0.06em" }}>
                <span style={{ width:14, height:14, background:T.goldDim, border:`1px solid ${T.goldBdr}`, borderRadius:3, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:7 }}>✦</span>
                ADVISOR
              </div>
            )}
            <div style={{
              background: m.role==="user" ? T.goldDim : T.bg3,
              color:       m.role==="user" ? T.gold : T.text,
              border:      `1px solid ${m.role==="user" ? T.goldBdr : T.bdr1}`,
              borderRadius: m.role==="user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
              padding:"10px 15px",
            }}>
              {m.role==="user"
                ? <span style={{ fontSize:13.5, lineHeight:1.65 }}>{m.text}</span>
                : <MarkdownBlock text={m.text} chatMode={true}/>
              }
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf:"flex-start" }}>
            <div style={{ background:T.bg3, border:`1px solid ${T.bdr1}`, borderRadius:"12px 12px 12px 3px", padding:"11px 16px", display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ display:"flex", gap:5 }}>
                {[0,1,2].map(j => <span key={j} style={{ width:5, height:5, borderRadius:99, background:T.gold, display:"inline-block", animation:`blink 1.2s ${j*0.2}s infinite`, opacity:0.6 }}/>)}
              </div>
              <span style={{ fontSize:11.5, color:T.faint, fontFamily:T.ui, letterSpacing:"0.04em" }}>THINKING</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{ display:"flex", gap:8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && !e.shiftKey && send()} placeholder="Ask about investments, savings, tax, SIPs…" style={{ flex:1 }}/>
        <Btn onClick={send} disabled={loading || !input.trim()}>
          {loading ? <Spinner size={13} color="#07090e"/> : null}
          {loading ? "Sending" : "Send"}
        </Btn>
      </div>
    </Card>
  );
}

// ── Goal Planner ───────────────────────────────────────────────────────────
function GoalPlanner({ userId }) {
  const [target, setTarget]   = useState("");
  const [years, setYears]     = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const calc = async () => {
    if (!target || !years) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await apiFetch("/goal-plan", { method:"POST", body:JSON.stringify({ user_id:userId, target_amount:parseFloat(target), time_years:parseFloat(years) }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Error"); return; }
      setResult(d);
    } catch { setError("Cannot connect to backend."); }
    finally { setLoading(false); }
  };

  const pct = result ? Math.min(100, Math.round((result.current_monthly_saving / result.required_monthly_saving) * 100)) : 0;

  return (
    <Card>
      <MicroLabel>Goal Planner</MicroLabel>
      <div style={{ fontSize:16, fontWeight:500, fontFamily:T.display, marginBottom:"1.2rem" }}>Map your financial goal</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:"1rem" }}>
        <div><MicroLabel>Target amount (₹)</MicroLabel><input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 500000" min="1"/></div>
        <div><MicroLabel>Time horizon (years)</MicroLabel><input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="e.g. 3" min="0.5" step="0.5"/></div>
      </div>

      <Btn onClick={calc} disabled={loading || !target || !years}>
        {loading && <Spinner size={13} color="#07090e"/>}
        {loading ? "Calculating…" : "Calculate plan"}
      </Btn>

      {error && <div style={{ marginTop:10, color:T.red, fontSize:13 }}>{error}</div>}

      {result && (
        <div className="fu" style={{ marginTop:"1.4rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <StatCard label="Required monthly SIP" value={`₹${fmt(result.required_monthly_saving)}`} sub={`At ${result.cagr_moderate} CAGR`}/>
            <StatCard label="Your monthly saving"  value={`₹${fmt(result.current_monthly_saving)}`}  color={result.feasible ? T.green : T.red}/>
          </div>

          {/* 3-scenario table */}
          <div style={{ background:T.bg3, border:`1px solid ${T.bdr1}`, borderRadius:T.rLg, overflow:"hidden" }}>
            <div style={{ padding:"9px 14px", borderBottom:`1px solid ${T.bdr1}` }}><MicroLabel style={{ marginBottom:0 }}>Required SIP by return scenario</MicroLabel></div>
            {[
              { label:"Conservative", cagr:result.cagr_conservative, sip:result.sip_conservative },
              { label:"Moderate",     cagr:result.cagr_moderate,     sip:result.sip_moderate,   active:true },
              { label:"Aggressive",   cagr:result.cagr_aggressive,   sip:result.sip_aggressive },
            ].map((row, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:row.active ? T.goldDim : "transparent", borderBottom:i<2?`1px solid ${T.bdr0}`:"none", transition:"background 0.15s" }}>
                <div>
                  <span style={{ fontSize:12.5, color:row.active ? T.gold : T.muted, fontWeight:row.active?600:400, fontFamily:T.ui }}>{row.label}</span>
                  <span style={{ fontSize:11, color:T.faint, marginLeft:10, fontFamily:T.mono }}>{row.cagr}</span>
                </div>
                <span style={{ fontSize:13.5, fontWeight:600, color:row.active ? T.gold : T.text, fontFamily:T.mono }}>₹{fmt(row.sip)}/mo</span>
              </div>
            ))}
          </div>

          {/* Coverage bar */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11.5, color:T.muted, fontFamily:T.ui }}>Savings coverage ({result.cagr_moderate} scenario)</span>
              <span style={{ fontSize:11.5, fontWeight:600, color:result.feasible ? T.green : T.yellow, fontFamily:T.mono }}>{pct}%</span>
            </div>
            <div style={{ height:3, background:T.bg4, borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:result.feasible ? T.green : T.yellow, borderRadius:99, transition:"width 1.2s cubic-bezier(0.16,1,0.3,1)" }}/>
            </div>
          </div>

          {/* Status banner */}
          <div style={{ display:"flex", gap:12, alignItems:"flex-start", background:result.feasible ? T.greenDim : T.yellowDim, border:`1px solid ${result.feasible ? T.greenBdr : T.yellowBdr}`, borderRadius:T.rLg, padding:"12px 15px" }}>
            <span style={{ color:result.feasible ? T.green : T.yellow, fontSize:13, marginTop:1 }}>{result.feasible ? "✓" : "⚠"}</span>
            <div>
              <div style={{ fontSize:13.5, fontWeight:600, color:result.feasible ? T.green : T.yellow, marginBottom:3, fontFamily:T.ui }}>{result.feasible ? "Goal is achievable" : "Savings gap detected"}</div>
              <div style={{ fontSize:12.5, color:T.muted }}>{result.message}</div>
            </div>
          </div>

          {/* Instrument recommendation */}
          <div style={{ background:T.bg3, border:`1px solid ${T.bdr1}`, borderRadius:T.rLg, padding:"12px 15px" }}>
            <MicroLabel>Recommended instruments</MicroLabel>
            <div style={{ fontSize:13.5, color:T.gold, fontWeight:500, marginBottom:4 }}>Primary: {result.investment_suggestion}</div>
            <div style={{ fontSize:13.5, color:T.muted, marginBottom:8 }}>Secondary: {result.secondary_suggestion}</div>
            <div style={{ fontSize:12, color:T.faint, lineHeight:1.6 }}>{result.rationale}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ user }) {
  const [report, setReport]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(true);
  const [error, setError]             = useState("");
  const [downloading, setDownloading] = useState(false);
  const [tab, setTab]                 = useState("overview");

  useEffect(() => {
    if (!user?.id) return;
    setReport(null); setError(""); setTab("overview"); setFetching(true);
    apiFetch(`/report/${user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setReport(d || null))
      .catch(() => setReport(null))
      .finally(() => setFetching(false));
  }, [user?.id]);

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch("/generate-report", { method:"POST", body:JSON.stringify({ user_id:user.id }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Error generating report."); return; }
      setReport(d);
    } catch { setError("Cannot connect to backend."); }
    finally { setLoading(false); }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const res = await apiFetch(`/download-report/${user.id}`);
      if (!res.ok) { alert("No report found. Generate one first."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `financial_report_profile_${user.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Download failed."); }
    finally { setDownloading(false); }
  };

  const riskCol = { low:T.green, medium:T.yellow, high:T.red }[user?.risk_appetite] || T.muted;
  const savRate = user?.income > 0 ? Math.round((user.savings / user.income) * 100) : 0;
  const TABS    = ["overview", "ai report", "goals", "chat"];

  return (
    <div style={{ padding:"2rem 2.25rem 3rem", maxWidth:940, margin:"0 auto" }}>

      {/* Header */}
      <div className="fu" style={{ marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:T.faint, fontFamily:T.ui, marginBottom:6 }}>Profile #{user?.id}</div>
            <h1 style={{ fontFamily:T.display, fontSize:32, fontWeight:500, lineHeight:1.15, color:T.text, marginBottom:6, letterSpacing:"-0.01em" }}>Financial Dashboard</h1>
            <div style={{ fontSize:13.5, color:T.muted, lineHeight:1.5 }}>{user?.financial_goals || "No goal set"}</div>
          </div>
          <div style={{ display:"flex", gap:8, paddingTop:4 }}>
            {report && (
              <Btn variant="ghost" onClick={download} disabled={downloading} style={{ fontSize:12 }}>
                {downloading ? <Spinner size={13}/> : "↓"} PDF
              </Btn>
            )}
            <Btn onClick={generate} disabled={loading || fetching}>
              {(loading || fetching) && <Spinner size={13} color="#07090e"/>}
              {fetching ? "Loading…" : loading ? "Generating…" : report ? "Regenerate" : "Generate report"}
            </Btn>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="fu1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:"1.75rem" }}>
        <StatCard label="Monthly income"   value={`₹${fmt(user?.income)}`}/>
        <StatCard label="Monthly expenses" value={`₹${fmt(user?.expenses)}`} color={T.red}/>
        <StatCard label="Monthly savings"  value={`₹${fmt(user?.savings)}`}  color={T.green} sub={`${savRate}% savings rate`}/>
        <StatCard label="Risk appetite"    value={(user?.risk_appetite||"—").charAt(0).toUpperCase()+(user?.risk_appetite||"").slice(1)} color={riskCol}/>
      </div>

      {error && (
        <div style={{ background:T.redDim, border:`1px solid ${T.redBdr}`, borderRadius:T.r, padding:"11px 15px", fontSize:13, color:T.red, marginBottom:"1.25rem" }}>{error}</div>
      )}

      {(fetching || loading) && (
        <Card style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:12, padding:"3rem" }}>
          <Spinner size={22}/>
          <span style={{ color:T.muted, fontSize:14, fontFamily:T.ui, letterSpacing:"0.03em" }}>
            {fetching ? "LOADING REPORT" : "GENERATING ANALYSIS"}
          </span>
        </Card>
      )}

      {!fetching && !loading && (
        <div className="fu2">
          {/* Tab bar */}
          <div style={{ display:"flex", gap:1, marginBottom:"1.5rem", background:T.bg2, border:`1px solid ${T.bdr1}`, borderRadius:T.rLg, padding:4, width:"fit-content" }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding:"7px 18px", borderRadius:T.r, fontSize:12, fontWeight:600,
                fontFamily:T.ui, letterSpacing:"0.05em", textTransform:"uppercase",
                border:"1px solid", cursor:"pointer", transition:"all 0.18s",
                background: tab===t ? T.bg4 : "transparent",
                color:      tab===t ? T.text : T.faint,
                borderColor: tab===t ? T.bdr2 : "transparent",
              }}>{t}</button>
            ))}
          </div>

          {/* Overview tab */}
          {tab==="overview" && (
            <div className="fu" style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
              {report ? (
                <>
                  <Card>
                    <MicroLabel>Health Score</MicroLabel>
                    <div style={{ fontSize:16, fontWeight:500, fontFamily:T.display, marginBottom:"1.4rem" }}>Financial wellness overview</div>
                    <ScoreWheel score={report.health?.score || 0} health={report.health}/>
                  </Card>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.1rem" }}>
                    <Card><MicroLabel>Strengths</MicroLabel><InsightList items={report.health?.insights} type="good"/></Card>
                    <Card><MicroLabel>Areas to Improve</MicroLabel><InsightList items={report.health?.warnings} type="warn"/></Card>
                  </div>
                </>
              ) : (
                <Card style={{ textAlign:"center", padding:"4rem 2rem" }}>
                  <div style={{ fontSize:36, opacity:0.1, marginBottom:16, fontFamily:T.mono }}>◈</div>
                  <div style={{ fontFamily:T.display, fontSize:22, marginBottom:8, fontWeight:500 }}>No report yet</div>
                  <div style={{ fontSize:13.5, color:T.faint, marginBottom:"1.75rem", lineHeight:1.6 }}>Generate your AI-powered financial analysis to begin.</div>
                  <Btn onClick={generate}>Generate report</Btn>
                </Card>
              )}
            </div>
          )}

          {/* AI Report tab */}
          {tab==="ai report" && (
            <div className="fu">
              {report
                ? <Card><MicroLabel>AI-Generated Analysis</MicroLabel><div style={{ fontSize:16, fontWeight:500, fontFamily:T.display, marginBottom:"1.4rem" }}>Personalised financial advice</div><MarkdownBlock text={report.ai_report}/></Card>
                : <Card style={{ textAlign:"center", padding:"3rem" }}><div style={{ fontSize:13, color:T.faint }}>Generate a report first to view AI advice.</div></Card>
              }
            </div>
          )}

          {tab==="goals" && <div className="fu"><GoalPlanner userId={user?.id}/></div>}
          {tab==="chat"  && <div className="fu"><ChatSection  userId={user?.id}/></div>}
        </div>
      )}
    </div>
  );
}

// ── Profile Form ───────────────────────────────────────────────────────────
function ProfileForm({ onSuccess }) {
  const [form, setForm]       = useState({ age:"", income:"", expenses:"", savings:"", risk_appetite:"medium", financial_goals:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]:e.target.value }));

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch("/profile", { method:"POST", body:JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to save profile."); return; }
      onSuccess(d);
    } catch { setError("Cannot connect to backend. Make sure Flask is running on port 5000."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem", background:T.bg0 }}>
      {/* Subtle radial glow behind form */}
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:600, background:`radial-gradient(circle, ${T.goldDim} 0%, transparent 70%)`, pointerEvents:"none", zIndex:0 }}/>

      <div style={{ width:"100%", maxWidth:520, position:"relative", zIndex:1 }}>
        {/* Brand */}
        <div className="fu" style={{ textAlign:"center", marginBottom:"2.25rem" }}>
          <div style={{ fontFamily:T.display, fontSize:13, color:T.gold, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:10, fontStyle:"italic" }}>Private</div>
          <div style={{ fontFamily:T.display, fontSize:42, color:T.text, fontWeight:400, lineHeight:1.1, letterSpacing:"-0.02em" }}>FinanceAI</div>
          <div style={{ fontSize:12, color:T.faint, marginTop:8, fontFamily:T.ui, letterSpacing:"0.08em", textTransform:"uppercase" }}>Your personal financial advisor</div>
        </div>

        <Card cls="fu1" style={{ padding:"2.25rem", background:T.bg2, border:`1px solid ${T.bdr1}` }}>
          <div style={{ marginBottom:"1.75rem" }}>
            <h2 style={{ fontFamily:T.display, fontSize:24, fontWeight:500, marginBottom:6, letterSpacing:"-0.01em" }}>Create your profile</h2>
            <p style={{ fontSize:13.5, color:T.muted, lineHeight:1.65 }}>We'll analyse your finances and provide personalised AI-driven advice.</p>
          </div>

          {/* Row 1 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div><MicroLabel>Age</MicroLabel><input type="number" value={form.age} onChange={set("age")} placeholder="e.g. 25" min="1" max="120"/></div>
            <div>
              <MicroLabel>Risk appetite</MicroLabel>
              <select value={form.risk_appetite} onChange={set("risk_appetite")}>
                <option value="low">Low — capital preservation</option>
                <option value="medium">Medium — balanced growth</option>
                <option value="high">High — aggressive growth</option>
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
            {[["Monthly income (₹)","income"],["Monthly expenses (₹)","expenses"],["Monthly savings (₹)","savings"]].map(([lbl, k]) => (
              <div key={k}>
                <MicroLabel>{lbl}</MicroLabel>
                <input type="number" value={form[k]} onChange={set(k)} placeholder="₹ 0" min="0"/>
              </div>
            ))}
          </div>

          {/* Goals */}
          <div style={{ marginBottom:"1.75rem" }}>
            <MicroLabel>Financial goals</MicroLabel>
            <input type="text" value={form.financial_goals} onChange={set("financial_goals")} placeholder="e.g. Buy a car in 2 years, retire at 50…"/>
          </div>

          {error && (
            <div style={{ background:T.redDim, border:`1px solid ${T.redBdr}`, borderRadius:T.r, padding:"10px 13px", color:T.red, fontSize:13, marginBottom:"1.25rem", lineHeight:1.5 }}>{error}</div>
          )}

          <Btn onClick={submit} disabled={loading} style={{ width:"100%", justifyContent:"center", padding:"12px" }}>
            {loading && <Spinner size={14} color="#07090e"/>}
            {loading ? "Saving profile…" : "Save & open dashboard →"}
          </Btn>
        </Card>

        <div className="fu2" style={{ textAlign:"center", marginTop:"1.25rem", fontSize:11, color:T.faint, fontFamily:T.ui, letterSpacing:"0.04em" }}>
          POWERED BY GEMINI AI · SEBI ADVISORY FRAMEWORK
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function ProfileCard({ u, active, onSelect, onDelete }) {
  const [confirm, setConfirm]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rCol = { low:T.green, medium:T.yellow, high:T.red };
  const sr   = u.income > 0 ? Math.round((u.savings / u.income) * 100) : 0;

  const handleDelete = async e => {
    e.stopPropagation();
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      const res = await apiFetch(`/profile/${u.id}`, { method:"DELETE" });
      if (res.ok) { onDelete(u.id); }
      else { const d = await res.json(); alert(d.error || "Delete failed."); setConfirm(false); }
    } catch { alert("Cannot reach backend."); setConfirm(false); }
    setDeleting(false);
  };

  return (
    <div style={{ marginBottom:2 }} className="fu">
      <button
        onClick={() => { setConfirm(false); onSelect(u); }}
        style={{
          width:"100%", textAlign:"left", padding:"10px 12px",
          borderRadius: confirm ? `${T.r} ${T.r} 0 0` : T.r,
          background: active ? T.bg3 : "transparent",
          border: `1px solid ${active ? T.bdr2 : "transparent"}`,
          borderLeft: active ? `2px solid ${T.gold}` : `2px solid transparent`,
          cursor:"pointer", transition:"all 0.18s", display:"block",
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background=T.bg3; e.currentTarget.style.borderColor=T.bdr1; }}}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; }}}
      >
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ fontSize:12.5, fontWeight:600, color:active?T.text:T.muted, fontFamily:T.ui }}>Profile #{u.id}</span>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {active && <span style={{ width:5, height:5, borderRadius:99, background:T.gold }}/>}
            <span
              onClick={handleDelete}
              title="Delete profile"
              style={{ width:18, height:18, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", color:confirm?T.red:T.faint, background:confirm?T.redDim:"transparent", border:`1px solid ${confirm?T.redBdr:"transparent"}`, fontSize:10, cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e => { if (!confirm) { e.currentTarget.style.color=T.red; e.currentTarget.style.background=T.redDim; e.currentTarget.style.borderColor=T.redBdr; }}}
              onMouseLeave={e => { if (!confirm) { e.currentTarget.style.color=T.faint; e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; }}}
            >{deleting ? "…" : "✕"}</span>
          </div>
        </div>
        <div style={{ fontSize:11.5, color:T.faint, lineHeight:1.4, marginBottom:7 }}>
          {(u.financial_goals||"No goal").slice(0,30)}{(u.financial_goals||"").length>30?"…":""}
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:T.faint, background:T.bg4, border:`1px solid ${T.bdr0}`, borderRadius:99, padding:"2px 8px", fontFamily:T.mono }}>{sr}% saved</span>
          {u.risk_appetite && <span style={{ fontSize:10, color:rCol[u.risk_appetite]||T.faint, background:T.bg4, border:`1px solid ${T.bdr0}`, borderRadius:99, padding:"2px 8px", fontFamily:T.ui }}>{u.risk_appetite}</span>}
        </div>
      </button>

      {confirm && (
        <div style={{ background:T.redDim, border:`1px solid ${T.redBdr}`, borderTop:"none", borderRadius:`0 0 ${T.r} ${T.r}`, padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, animation:"fadeIn 0.15s ease both" }}>
          <span style={{ fontSize:11, color:T.red, lineHeight:1.4 }}>Delete Profile #{u.id}?</span>
          <div style={{ display:"flex", gap:5, flexShrink:0 }}>
            <button onClick={handleDelete} disabled={deleting} style={{ background:T.red, color:"#07090e", border:"none", borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:700, fontFamily:T.ui, cursor:"pointer" }}>
              {deleting ? "…" : "Delete"}
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirm(false); }} style={{ background:"transparent", color:T.muted, border:`1px solid ${T.bdr1}`, borderRadius:5, padding:"4px 10px", fontSize:11, fontFamily:T.ui, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ users, activeUser, onSelect, onNewProfile, onDelete, page }) {
  return (
    <aside style={{
      width:260, minHeight:"100vh", flexShrink:0,
      background:T.bg1,
      borderRight:`1px solid ${T.bdr1}`,
      display:"flex", flexDirection:"column",
    }}>
      {/* Brand */}
      <div style={{ padding:"1.6rem 1.4rem 1.3rem", borderBottom:`1px solid ${T.bdr0}` }}>
        <div style={{ fontFamily:T.display, fontSize:24, color:T.text, fontWeight:500, letterSpacing:"-0.01em" }}>FinanceAI</div>
        <div style={{ fontSize:10, color:T.faint, marginTop:3, fontFamily:T.ui, letterSpacing:"0.1em", textTransform:"uppercase" }}>AI Financial Advisor</div>
      </div>

      {/* New profile button */}
      <div style={{ padding:"0.85rem 0.85rem 0.5rem" }}>
        <button
          onClick={onNewProfile}
          style={{
            width:"100%", textAlign:"left", padding:"9px 12px", borderRadius:T.r,
            fontSize:12, fontWeight:600, fontFamily:T.ui, letterSpacing:"0.03em",
            background: page==="profile" ? T.goldDim : "transparent",
            border: `1px solid ${page==="profile" ? T.goldBdr : T.bdr1}`,
            color: page==="profile" ? T.gold : T.muted,
            cursor:"pointer", display:"flex", alignItems:"center", gap:9, transition:"all 0.18s",
          }}
          onMouseEnter={e => { if (page!=="profile") { e.currentTarget.style.borderColor=T.bdr2; e.currentTarget.style.color=T.text; }}}
          onMouseLeave={e => { if (page!=="profile") { e.currentTarget.style.borderColor=T.bdr1; e.currentTarget.style.color=T.muted; }}}
        >
          <span style={{ fontSize:16, lineHeight:1, fontWeight:300 }}>+</span> New profile
        </button>
      </div>

      {/* Profile list */}
      <div style={{ padding:"0.5rem 0.85rem", flex:1, overflowY:"auto" }}>
        <MicroLabel style={{ paddingLeft:4, marginBottom:8 }}>Saved profiles</MicroLabel>
        {users.length === 0 && <div style={{ fontSize:12, color:T.faint, padding:"5px 4px", fontStyle:"italic" }}>No profiles yet</div>}
        {users.map(u => <ProfileCard key={u.id} u={u} active={activeUser?.id===u.id} onSelect={onSelect} onDelete={onDelete}/>)}
      </div>

      {/* Footer */}
      <div style={{ padding:"0.85rem 1.4rem", borderTop:`1px solid ${T.bdr0}` }}>
        <div style={{ fontSize:10, color:T.faint, fontFamily:T.ui, letterSpacing:"0.06em" }}>POWERED BY GEMINI AI</div>
      </div>
    </aside>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]     = useState("profile");
  const [activeUser, setActive] = useState(null);
  const [users, setUsers]   = useState([]);

  useEffect(() => {
    apiFetch("/users")
      .then(r => r.ok ? r.json() : { users:[] })
      .then(d => {
        const list = d.users || [];
        setUsers(list);
        if (list.length > 0) { setActive(list[list.length - 1]); setPage("dashboard"); }
      })
      .catch(() => {});
  }, []);

  const handleProfileSuccess = data => {
    const u = { id:data.user_id, ...data.profile };
    setUsers(prev => [...prev.filter(x => x.id !== u.id), u].sort((a,b) => a.id - b.id));
    setActive(u); setPage("dashboard");
  };

  const handleDelete = deletedId => {
    setUsers(prev => prev.filter(u => u.id !== deletedId));
    if (activeUser?.id === deletedId) { setActive(null); setPage("profile"); }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg0, fontFamily:T.body }}>
      <Sidebar
        users={users} activeUser={activeUser}
        onSelect={u => { setActive(u); setPage("dashboard"); }}
        onNewProfile={() => setPage("profile")}
        onDelete={handleDelete}
        page={page}
      />
      <main style={{ flex:1, overflowY:"auto", minWidth:0 }}>
        {page==="profile" && <ProfileForm onSuccess={handleProfileSuccess}/>}
        {page==="dashboard" && activeUser && <Dashboard user={activeUser}/>}
        {page==="dashboard" && !activeUser && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:32, opacity:0.08, marginBottom:14, fontFamily:T.mono }}>◈</div>
              <div style={{ fontFamily:T.display, fontSize:24, marginBottom:8, fontWeight:500 }}>No profile selected</div>
              <div style={{ fontSize:13.5, color:T.faint }}>Pick one from the sidebar or create a new profile.</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}