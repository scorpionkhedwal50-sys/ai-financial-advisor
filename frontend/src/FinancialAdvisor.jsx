import { useState, useEffect, useRef } from "react";

const API = "http://127.0.0.1:5000/api";

if (!document.getElementById("fa-fonts")) {
  const l = document.createElement("link");
  l.id = "fa-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(l);
}

const T = {
  font:"'DM Sans',sans-serif", mono:"'JetBrains Mono',monospace", serif:"'DM Serif Display',serif",
  bg0:"#0c0e12", bg1:"#111318", bg2:"#181c22", bg3:"#1f2430", bg4:"#272d3a",
  border:"rgba(255,255,255,0.06)", borderMid:"rgba(255,255,255,0.11)",
  text:"#eef0f4", muted:"#8692a6", faint:"#434d61",
  accent:"#e9a83c", accentDim:"rgba(233,168,60,0.1)", accentBdr:"rgba(233,168,60,0.28)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.08)", greenBdr:"rgba(52,211,153,0.22)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.08)",  redBdr:"rgba(248,113,113,0.22)",
  yellow:"#fbbf24",
  blue:"#60a5fa",  blueDim:"rgba(96,165,250,0.08)",  blueBdr:"rgba(96,165,250,0.22)",
  codeBg:"#131720", codeTxt:"#e2c97e",
  r:"10px", rLg:"14px",
};

if (!document.getElementById("fa-style")) {
  const s = document.createElement("style");
  s.id = "fa-style";
  s.textContent = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:${T.bg0};color:${T.text};font-family:${T.font}}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:${T.bg4};border-radius:99px}
    input,select,textarea{background:${T.bg3};border:1px solid ${T.border};color:${T.text};border-radius:${T.r};padding:9px 13px;font-family:${T.font};font-size:13px;width:100%;outline:none;transition:border 0.18s}
    input:focus,select:focus,textarea:focus{border-color:${T.accentBdr}}
    input::placeholder,textarea::placeholder{color:${T.faint}}
    select option{background:${T.bg3}}
    button{font-family:${T.font};cursor:pointer}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes scoreIn{from{stroke-dashoffset:440}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
    .fu{animation:fadeUp 0.3s ease both}
    .fu1{animation:fadeUp 0.3s 0.06s ease both}
    .fu2{animation:fadeUp 0.3s 0.12s ease both}
  `;
  document.head.appendChild(s);
}

const fmt  = n => Number(n||0).toLocaleString("en-IN");
const saveChat = (uid,d) => { try{localStorage.setItem(`fa_chat_${uid}`,JSON.stringify(d));}catch{} };
const loadChat = uid     => { try{const v=localStorage.getItem(`fa_chat_${uid}`);return v?JSON.parse(v):null;}catch{return null;} };
const clearChat = uid    => { try{localStorage.removeItem(`fa_chat_${uid}`);}catch{} };

/* ════════════════════════════════════════════════════════
   INLINE RENDERER
   ════════════════════════════════════════════════════════ */
function renderInline(text, key=0) {
  if (!text) return null;
  const rx = /(\*{3}(.+?)\*{3}|\*{2}(.+?)\*{2}|\*([^*\n]+?)\*|`([^`]+?)`|~~(.+?)~~|\[([^\]]+)\]\([^)]+\))/g;
  const parts=[]; let last=0,m,i=0;
  while ((m=rx.exec(text))!==null) {
    if (m.index>last) parts.push(<span key={`t${key}${i++}`}>{text.slice(last,m.index)}</span>);
    if      (m[2]) parts.push(<strong key={`bi${key}${i++}`} style={{fontStyle:"italic",fontWeight:600}}>{m[2]}</strong>);
    else if (m[3]) parts.push(<strong key={`b${key}${i++}`}  style={{color:T.text,fontWeight:600}}>{m[3]}</strong>);
    else if (m[4]) parts.push(<em     key={`e${key}${i++}`}  style={{color:T.muted}}>{m[4]}</em>);
    else if (m[5]) parts.push(<code   key={`c${key}${i++}`}  style={{background:T.codeBg,color:T.codeTxt,border:`1px solid ${T.border}`,borderRadius:5,padding:"1px 5px",fontSize:"0.85em",fontFamily:T.mono}}>{m[5]}</code>);
    else if (m[6]) parts.push(<span   key={`s${key}${i++}`}  style={{textDecoration:"line-through",color:T.faint}}>{m[6]}</span>);
    else if (m[7]) parts.push(<span   key={`l${key}${i++}`}  style={{color:T.accent,textDecoration:"underline"}}>{m[7]}</span>);
    last=rx.lastIndex;
  }
  if (last<text.length) parts.push(<span key={`tf${key}${i}`}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

/* ════════════════════════════════════════════════════════
   BLOCK MARKDOWN COMPONENTS
   ════════════════════════════════════════════════════════ */
function MDHeading({level,text}) {
  const sz={1:18,2:15,3:13,4:12}[level]||13;
  const col={1:T.text,2:T.accent,3:T.text,4:T.muted}[level]||T.text;
  return (
    <div style={{marginTop:level<=2?18:10,marginBottom:level<=2?8:4}}>
      <div style={{fontSize:sz,fontWeight:600,color:col,fontFamily:level===1?T.serif:T.font,lineHeight:1.3}}>{renderInline(text)}</div>
      {level<=2&&<div style={{marginTop:5,height:1,background:level===1?`linear-gradient(to right,${T.border},transparent)`:`linear-gradient(to right,${T.accentBdr},transparent 80%)`}}/>}
    </div>
  );
}
function ULBlock({items,chat}) {
  const dotC=[T.accent,T.muted,T.faint];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,margin:"6px 0 8px"}}>
      {items.map((item,idx)=>(
        <div key={idx} style={{display:"flex",alignItems:"flex-start",gap:8,paddingLeft:item.depth*14}}>
          <span style={{color:dotC[Math.min(item.depth,2)],fontWeight:700,fontSize:14,lineHeight:"20px",flexShrink:0,marginTop:2}}>•</span>
          <div style={{background:chat?"rgba(255,255,255,0.04)":T.bg3,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,color:T.muted,lineHeight:1.65,flex:1}}>{renderInline(item.text,idx)}</div>
        </div>
      ))}
    </div>
  );
}
function OLBlock({items,chat}) {
  const counters={};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,margin:"6px 0 8px"}}>
      {items.map((item,idx)=>{
        const d=item.depth;
        Object.keys(counters).forEach(k=>{if(Number(k)>d)delete counters[k];});
        counters[d]=(counters[d]||0)+1;
        return (
          <div key={idx} style={{display:"flex",alignItems:"flex-start",gap:8,paddingLeft:d*14}}>
            <span style={{width:22,height:22,borderRadius:99,flexShrink:0,background:T.accentDim,border:`1px solid ${T.accentBdr}`,color:T.accent,fontSize:10,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}>{counters[d]}</span>
            <div style={{background:chat?"rgba(255,255,255,0.04)":T.bg3,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,color:T.muted,lineHeight:1.65,flex:1}}>{renderInline(item.text,idx)}</div>
          </div>
        );
      })}
    </div>
  );
}
function BlockQuote({lines}) {
  return (
    <div style={{display:"flex",gap:0,margin:"6px 0 8px",border:`1px solid ${T.accentBdr}`,borderRadius:T.r,overflow:"hidden"}}>
      <div style={{width:3,background:T.accent,flexShrink:0}}/>
      <div style={{background:T.accentDim,padding:"8px 12px",flex:1}}>
        {lines.map((ln,i)=><p key={i} style={{fontSize:13,color:T.muted,lineHeight:1.65,marginBottom:i<lines.length-1?4:0}}>{renderInline(ln,i)}</p>)}
      </div>
    </div>
  );
}
function CodeBlock({lines,lang}) {
  return (
    <div style={{margin:"6px 0 8px"}}>
      {lang&&<div style={{background:T.bg4,borderRadius:`${T.r} ${T.r} 0 0`,padding:"4px 12px",fontSize:11,color:T.faint,fontFamily:T.mono,borderBottom:`1px solid ${T.border}`,display:"inline-block"}}>{lang}</div>}
      <pre style={{background:T.codeBg,borderRadius:lang?`0 ${T.r} ${T.r} ${T.r}`:T.r,border:`1px solid ${T.border}`,padding:"12px 14px",fontFamily:T.mono,fontSize:12,color:T.codeTxt,lineHeight:1.65,overflowX:"auto",whiteSpace:"pre",margin:0}}>{lines.join("\n")}</pre>
    </div>
  );
}
function splitTableRow(raw) {
  const s=raw.trim();
  const stripped=s.startsWith("|")?s.slice(1):s;
  const parts=stripped.split("|");
  if (parts[parts.length-1].trim()==="") parts.pop();
  return parts.map(c=>c.trim());
}
function GFMTable({header,rows}) {
  return (
    <div style={{margin:"6px 0 8px",overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{background:T.bg4}}>{header.map((h,i)=><th key={i} style={{padding:"8px 12px",textAlign:"left",color:T.accent,fontWeight:600,border:`1px solid ${T.border}`,borderBottom:`1px solid ${T.accentBdr}`}}>{renderInline(h,i)}</th>)}</tr></thead>
        <tbody>{rows.map((row,ri)=><tr key={ri} style={{background:ri%2===0?T.bg3:T.bg2}}>{row.map((cell,ci)=><td key={ci} style={{padding:"7px 12px",color:T.muted,border:`1px solid ${T.border}`,lineHeight:1.55}}>{renderInline(cell,ci)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
function TipBox({text}) {
  return (
    <div style={{display:"flex",gap:10,alignItems:"flex-start",margin:"6px 0 8px",background:T.blueDim,border:`1px solid ${T.blueBdr}`,borderRadius:T.r,padding:"9px 13px"}}>
      <span style={{fontSize:15,flexShrink:0}}>💡</span>
      <span style={{fontSize:13,color:T.blue,lineHeight:1.65}}>{renderInline(text)}</span>
    </div>
  );
}

function MarkdownBlock({text,chatMode=false}) {
  if (!text) return null;
  const lines=text.split("\n");
  const out=[]; let i=0,key=0; const K=()=>key++;
  let ulBuf=[],olBuf=[],bqBuf=[],cbBuf=[],cbLang="",inCb=false,tblHdr=null,tblRows=[];
  const depthOf=raw=>{const sp=raw.length-raw.trimStart().length;return Math.floor(sp/2);};
  const flushUL=()=>{if(!ulBuf.length)return;out.push(<ULBlock key={K()} items={ulBuf} chat={chatMode}/>);ulBuf=[];};
  const flushOL=()=>{if(!olBuf.length)return;out.push(<OLBlock key={K()} items={olBuf} chat={chatMode}/>);olBuf=[];};
  const flushBQ=()=>{if(!bqBuf.length)return;out.push(<BlockQuote key={K()} lines={bqBuf}/>);bqBuf=[];};
  const flushTbl=()=>{if(!tblHdr)return;out.push(<GFMTable key={K()} header={tblHdr} rows={tblRows}/>);tblHdr=null;tblRows=[];};
  const flushAll=()=>{flushUL();flushOL();flushBQ();flushTbl();};
  while (i<lines.length) {
    const raw=lines[i]; const s=raw.trim();
    if (/^(`{3,}|~{3,})/.test(s)) { if (inCb){out.push(<CodeBlock key={K()} lines={cbBuf} lang={cbLang}/>);cbBuf=[];cbLang="";inCb=false;} else{flushAll();cbLang=s.replace(/^(`{3,}|~{3,})/,"").trim();cbBuf=[];inCb=true;} i++;continue; }
    if (inCb){cbBuf.push(raw);i++;continue;}
    if (!s){flushUL();flushOL();flushBQ();i++;continue;}
    if (s.startsWith("💡")){flushAll();out.push(<TipBox key={K()} text={s.slice(1).trim()}/>);i++;continue;}
    if (/^([-*_]){3,}$/.test(s)){flushAll();out.push(<hr key={K()} style={{border:"none",borderTop:`1px solid ${T.border}`,margin:"10px 0"}}/>);i++;continue;}
    const hm=s.match(/^(#{1,4})\s+(.*)/);
    if (hm){flushAll();out.push(<MDHeading key={K()} level={hm[1].length} text={hm[2].trim()}/>);i++;continue;}
    if (s.includes("|")&&!/^[\s|:-]+$/.test(s)){flushUL();flushOL();flushBQ();const cells=splitTableRow(s);if (!tblHdr){tblHdr=cells;tblRows=[];}else tblRows.push(cells);i++;continue;}
    if (/^[\s|:-]+$/.test(s)&&s.includes("|")){i++;continue;}
    if (tblHdr&&!s.includes("|")) flushTbl();
    const bm=s.match(/^(>+)\s*(.*)/);
    if (bm){flushUL();flushOL();bqBuf.push(bm[2]);i++;continue;}else flushBQ();
    const um=raw.match(/^(\s*)[-*+]\s+(.*)/);
    if (um){flushOL();ulBuf.push({depth:depthOf(raw),text:um[2].trim()});i++;continue;}
    const om=raw.match(/^(\s*)\d+[.)]\s+(.*)/);
    if (om){flushUL();olBuf.push({depth:depthOf(raw),text:om[2].trim()});i++;continue;}
    flushUL();flushOL();
    if (s) out.push(<p key={K()} style={{fontSize:13,lineHeight:1.75,color:chatMode?"inherit":T.muted,marginBottom:6}}>{renderInline(s,K())}</p>);
    i++;
  }
  flushAll();
  return <div style={{textAlign:"left"}}>{out}</div>;
}

/* ════════════════════════════════════════════════════════
   PRIMITIVES
   ════════════════════════════════════════════════════════ */
const Card=({children,style:s={},cls=""})=><div className={cls} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"1.25rem",...s}}>{children}</div>;
const SLabel=({children,style:s={}})=><div style={{fontSize:10.5,fontWeight:600,letterSpacing:"0.09em",textTransform:"uppercase",color:T.faint,marginBottom:5,...s}}>{children}</div>;
const Spinner=({size=17,color=T.accent})=>(
  <svg width={size} height={size} viewBox="0 0 18 18" style={{animation:"spin 0.75s linear infinite",flexShrink:0}}>
    <circle cx={9} cy={9} r={7} fill="none" stroke={T.bg4} strokeWidth={2}/>
    <path d="M9 2 A7 7 0 0 1 16 9" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"/>
  </svg>
);
const Btn=({children,onClick,disabled,variant="primary",style:s={}})=>{
  const base={display:"inline-flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:T.r,fontFamily:T.font,fontSize:13,fontWeight:500,border:"1px solid",opacity:disabled?0.42:1,cursor:disabled?"not-allowed":"pointer",transition:"all 0.15s",...s};
  const v={primary:{background:T.accent,color:"#0c0e12",borderColor:T.accent},ghost:{background:"transparent",color:T.muted,borderColor:T.border},danger:{background:T.redDim,color:T.red,borderColor:T.redBdr}};
  return <button style={{...base,...v[variant]}} onClick={onClick} disabled={disabled}>{children}</button>;
};
const StatCard=({label,value,sub,color=T.text})=>(
  <div style={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"13px 15px"}}>
    <SLabel>{label}</SLabel>
    <div style={{fontSize:20,fontWeight:600,fontFamily:T.serif,color,letterSpacing:"-0.02em"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:T.faint,marginTop:3}}>{sub}</div>}
  </div>
);

/* ════════════════════════════════════════════════════════
   SCORE WHEEL
   ════════════════════════════════════════════════════════ */
function ScoreWheel({score}) {
  const R=58,CX=72,CY=72,circ=2*Math.PI*R,off=circ-(score/100)*circ;
  const col=score>=70?T.green:score>=50?T.yellow:T.red;
  const lbl=score>=70?"Healthy":score>=50?"Moderate":"At risk";
  const bars=[{label:"Savings ratio",v:Math.min(100,score>=70?92:score>=50?65:35)},{label:"Expense control",v:Math.min(100,score>=70?85:score>=50?62:32)},{label:"Emergency fund",v:Math.min(100,score>=70?88:score>=50?58:28)}];
  return (
    <div style={{display:"flex",alignItems:"center",gap:"2rem",flexWrap:"wrap"}}>
      <svg width={144} height={144} viewBox="0 0 144 144" style={{flexShrink:0}}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={T.bg4} strokeWidth={11}/>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={col} strokeWidth={11} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`} style={{animation:"scoreIn 1.2s ease both",transition:"stroke-dashoffset 1s ease"}}/>
        {[0,25,50,75,100].map(p=>{const a=(p/100)*2*Math.PI-Math.PI/2;return <line key={p} x1={CX+(R-8)*Math.cos(a)} y1={CY+(R-8)*Math.sin(a)} x2={CX+(R+2)*Math.cos(a)} y2={CY+(R+2)*Math.sin(a)} stroke={T.bg0} strokeWidth={2}/>;  })}
        <text x={CX} y={CY-10} textAnchor="middle" fontSize={30} fontFamily={T.serif} fill={col}>{score}</text>
        <text x={CX} y={CY+10} textAnchor="middle" fontSize={11} fill={T.muted}>out of 100</text>
        <text x={CX} y={CY+27} textAnchor="middle" fontSize={11} fontWeight={500} fill={col}>{lbl}</text>
      </svg>
      <div style={{flex:1,minWidth:180}}>
        {bars.map(b=>(
          <div key={b.label} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:T.faint}}>{b.label}</span><span style={{fontSize:11,fontWeight:600,color:col}}>{b.v}%</span></div>
            <div style={{height:5,background:T.bg4,borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${b.v}%`,background:col,borderRadius:99,transition:"width 1.2s ease"}}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

const InsightList=({items,type})=>{
  if (!items?.length) return <div style={{fontSize:13,color:T.faint}}>None recorded.</div>;
  const col=type==="good"?T.green:T.yellow,dim=type==="good"?T.greenDim:"rgba(251,191,36,0.08)",bdr=type==="good"?T.greenBdr:"rgba(251,191,36,0.22)";
  return <div style={{display:"flex",flexDirection:"column",gap:6}}>{items.map((item,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",background:dim,border:`1px solid ${bdr}`,borderRadius:T.r,padding:"8px 12px"}}><span style={{color:col,fontSize:11,fontWeight:700,marginTop:2,flexShrink:0}}>{type==="good"?"✓":"!"}</span><span style={{fontSize:13,color:T.muted,lineHeight:1.6}}>{item}</span></div>)}</div>;
};

/* ════════════════════════════════════════════════════════
   CHAT
   ════════════════════════════════════════════════════════ */
function ChatSection({userId}) {
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{setMsgs(loadChat(userId)||[]);},[userId]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);
  const persist=m=>{setMsgs(m);saveChat(userId,m);};
  const send=async()=>{
    if (!input.trim()||loading) return;
    const q=input.trim();setInput("");
    const next=[...msgs,{role:"user",text:q}];persist(next);setLoading(true);
    try{
      const res=await fetch(`${API}/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:q})});
      const d=await res.json();
      persist([...next,{role:"ai",text:d.response||d.error||"No response."}]);
    }catch{persist([...next,{role:"ai",text:"Could not reach the advisor. Check that Flask is running."}]);}
    setLoading(false);
  };
  const suggestions=["Where should I invest ₹5,000/month?","How to reduce my expenses?","Is my emergency fund enough?","Should I start an SIP?"];
  return (
    <Card>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
        <div><SLabel>AI Advisor chat</SLabel><div style={{fontSize:15,fontWeight:500}}>Ask anything about your finances</div></div>
        {msgs.length>0&&<Btn variant="ghost" onClick={()=>persist([])} style={{fontSize:12,padding:"6px 12px"}}>Clear</Btn>}
      </div>
      {msgs.length===0&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"0.75rem"}}>
          {suggestions.map(q=><button key={q} onClick={()=>setInput(q)} style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.muted,borderRadius:99,fontSize:12,padding:"5px 12px",cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accentBdr;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}>{q}</button>)}
        </div>
      )}
      <div style={{height:340,overflowY:"auto",display:"flex",flexDirection:"column",gap:12,padding:"0.75rem",background:T.bg1,borderRadius:T.r,border:`1px solid ${T.border}`,marginBottom:"0.75rem"}}>
        {msgs.length===0&&<div style={{margin:"auto",textAlign:"center"}}><div style={{fontSize:36,opacity:0.14,marginBottom:10}}>💬</div><div style={{fontSize:13,color:T.faint}}>Select a suggestion or type your question</div></div>}
        {msgs.map((m,idx)=>(
          <div key={idx} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"84%"}}>
            {m.role==="ai"&&<div style={{fontSize:10,color:T.faint,marginBottom:3,paddingLeft:3,display:"flex",alignItems:"center",gap:5}}><span style={{width:14,height:14,background:T.accentDim,border:`1px solid ${T.accentBdr}`,borderRadius:99,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8}}>✦</span>AI Advisor</div>}
            <div style={{background:m.role==="user"?T.accentDim:T.bg2,color:m.role==="user"?T.accent:T.text,border:`1px solid ${m.role==="user"?T.accentBdr:T.border}`,borderRadius:m.role==="user"?"14px 14px 3px 14px":"14px 14px 14px 3px",padding:"10px 14px"}}>
              {m.role==="user"?<span style={{fontSize:13,lineHeight:1.6}}>{m.text}</span>:<MarkdownBlock text={m.text} chatMode={true}/>}
            </div>
          </div>
        ))}
        {loading&&<div style={{alignSelf:"flex-start"}}><div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"14px 14px 14px 3px",padding:"10px 14px",display:"flex",gap:8,alignItems:"center"}}><div style={{display:"flex",gap:4}}>{[0,1,2].map(j=><span key={j} style={{width:6,height:6,borderRadius:99,background:T.accent,display:"inline-block",animation:`blink 1.2s ${j*0.2}s infinite`}}/>)}</div><span style={{fontSize:12,color:T.faint}}>Thinking…</span></div></div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Ask about investments, savings, tax, SIPs…" style={{flex:1}}/>
        <Btn onClick={send} disabled={loading||!input.trim()}>{loading?<Spinner size={13} color="#0c0e12"/>:null} Send</Btn>
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════
   GOAL PLANNER
   ════════════════════════════════════════════════════════ */
function GoalPlanner() {
  const [target,setTarget]=useState("");const [years,setYears]=useState("");
  const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  const calc=async()=>{
    if (!target||!years) return;setLoading(true);setError("");setResult(null);
    try{const res=await fetch(`${API}/goal-plan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({target_amount:parseFloat(target),time_years:parseFloat(years)})});const d=await res.json();if (!res.ok){setError(d.error||"Error");return;}setResult(d);}
    catch{setError("Cannot connect to backend.");}finally{setLoading(false);}
  };
  const pct=result?Math.min(100,Math.round((result.current_monthly_saving/result.required_monthly_saving)*100)):0;
  return (
    <Card>
      <SLabel>Goal planner</SLabel>
      <div style={{fontSize:15,fontWeight:500,marginBottom:"1rem"}}>Map your financial goal</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"0.9rem"}}>
        <div><SLabel>Target amount (₹)</SLabel><input type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder="e.g. 500000"/></div>
        <div><SLabel>Time horizon (years)</SLabel><input type="number" value={years} onChange={e=>setYears(e.target.value)} placeholder="e.g. 2"/></div>
      </div>
      <Btn onClick={calc} disabled={loading||!target||!years}>{loading&&<Spinner size={13} color="#0c0e12"/>}{loading?"Calculating…":"Calculate plan"}</Btn>
      {error&&<div style={{marginTop:10,color:T.red,fontSize:13}}>{error}</div>}
      {result&&(
        <div className="fu" style={{marginTop:"1.25rem",display:"flex",flexDirection:"column",gap:"0.9rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <StatCard label="Required monthly" value={`₹${fmt(result.required_monthly_saving)}`}/>
            <StatCard label="Your monthly saving" value={`₹${fmt(result.current_monthly_saving)}`} color={result.feasible?T.green:T.red}/>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11,color:T.faint}}>Savings coverage</span><span style={{fontSize:11,fontWeight:600,color:result.feasible?T.green:T.yellow}}>{pct}%</span></div>
            <div style={{height:5,background:T.bg4,borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:result.feasible?T.green:T.yellow,borderRadius:99,transition:"width 1s ease"}}/></div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"flex-start",background:result.feasible?T.greenDim:"rgba(251,191,36,0.08)",border:`1px solid ${result.feasible?T.greenBdr:"rgba(251,191,36,0.22)"}`,borderRadius:T.r,padding:"10px 13px"}}>
            <span style={{color:result.feasible?T.green:T.yellow,fontSize:14}}>{result.feasible?"✓":"⚠"}</span>
            <div><div style={{fontSize:13,fontWeight:500,color:result.feasible?T.green:T.yellow,marginBottom:2}}>{result.feasible?"Goal is achievable":"Savings gap detected"}</div><div style={{fontSize:12,color:T.muted}}>{result.message}</div></div>
          </div>
          <div style={{fontSize:13,color:T.muted}}>Recommended: <span style={{color:T.accent,fontWeight:600}}>{result.investment_suggestion}</span></div>
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════ */
function Dashboard({user}) {
  const [report,setReport]          = useState(null);
  const [loading,setLoading]        = useState(false);
  const [fetching,setFetching]      = useState(true);
  const [error,setError]            = useState("");
  const [downloading,setDownloading]= useState(false);
  const [tab,setTab]                = useState("overview");

  useEffect(()=>{
    if (!user?.id) return;
    setReport(null);setError("");setTab("overview");setFetching(true);
    fetch(`${API}/report/${user.id}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>{setReport(d||null);})
      .catch(()=>setReport(null))
      .finally(()=>setFetching(false));
  },[user?.id]);

  const generate=async()=>{
    setLoading(true);setError("");
    try{
      const res=await fetch(`${API}/generate-report`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:user.id})});
      const d=await res.json();
      if (!res.ok){setError(d.error||"Error generating report.");return;}
      setReport(d);
    }catch{setError("Cannot connect to backend. Make sure Flask is running.");}
    finally{setLoading(false);}
  };

  const download=async()=>{
    setDownloading(true);
    try{
      const res=await fetch(`${API}/download-report/${user.id}`);
      if (!res.ok){alert("No report found. Generate one first.");return;}
      const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;
      a.download=`financial_report_profile_${user.id}.pdf`;a.click();
      URL.revokeObjectURL(url);
    }catch{alert("Download failed.");}
    finally{setDownloading(false);}
  };

  const riskCol={low:T.green,medium:T.yellow,high:T.red}[user?.risk_appetite]||T.muted;
  const savRate=user?.income>0?Math.round((user.savings/user.income)*100):0;
  const TABS=["overview","ai report","goals","chat"];

  return (
    <div style={{padding:"1.75rem 2rem 3rem",maxWidth:920,margin:"0 auto"}}>
      <div className="fu" style={{marginBottom:"1.75rem"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:T.faint,marginBottom:4}}>Profile #{user?.id}</div>
            <h1 style={{fontFamily:T.serif,fontSize:30,fontWeight:400,lineHeight:1.15,color:T.text,marginBottom:5}}>Financial Dashboard</h1>
            <div style={{fontSize:13,color:T.muted}}>{user?.financial_goals||"No goal set"}</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:4}}>
            {report&&<Btn variant="ghost" onClick={download} disabled={downloading} style={{fontSize:12}}>{downloading?<Spinner size={13}/>:"↓"} Download PDF</Btn>}
            <Btn onClick={generate} disabled={loading||fetching}>
              {(loading||fetching)&&<Spinner size={13} color="#0c0e12"/>}
              {fetching?"Loading…":loading?"Generating…":report?"Regenerate":"Generate report"}
            </Btn>
          </div>
        </div>
      </div>
      <div className="fu1" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.5rem"}}>
        <StatCard label="Monthly income"   value={`₹${fmt(user?.income)}`}/>
        <StatCard label="Monthly expenses" value={`₹${fmt(user?.expenses)}`} color={T.red}/>
        <StatCard label="Monthly savings"  value={`₹${fmt(user?.savings)}`}  color={T.green} sub={`${savRate}% savings rate`}/>
        <StatCard label="Risk appetite"    value={(user?.risk_appetite||"—").charAt(0).toUpperCase()+(user?.risk_appetite||"").slice(1)} color={riskCol}/>
      </div>
      {error&&<div style={{background:T.redDim,border:`1px solid ${T.redBdr}`,borderRadius:T.r,padding:"10px 14px",fontSize:13,color:T.red,marginBottom:"1rem"}}>{error}</div>}
      {(fetching||loading)&&<Card style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10,padding:"2.5rem"}}><Spinner size={22}/><span style={{color:T.muted,fontSize:14}}>{fetching?"Loading saved report…":"Generating your financial report…"}</span></Card>}
      {!fetching&&!loading&&(
        <div className="fu2">
          <div style={{display:"flex",gap:2,marginBottom:"1.25rem",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:T.r,padding:4,width:"fit-content"}}>
            {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:500,border:"none",background:tab===t?T.bg4:"transparent",color:tab===t?T.text:T.faint,textTransform:"capitalize",cursor:"pointer",transition:"all 0.15s"}}>{t}</button>)}
          </div>
          {tab==="overview"&&(
            <div className="fu" style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {report?(
                <>
                  <Card><SLabel>Health score</SLabel><div style={{fontSize:15,fontWeight:500,marginBottom:"1.25rem"}}>Financial wellness overview</div><ScoreWheel score={report.health?.score||0}/></Card>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                    <Card><SLabel>Strengths</SLabel><InsightList items={report.health?.insights} type="good"/></Card>
                    <Card><SLabel>Areas to improve</SLabel><InsightList items={report.health?.warnings} type="warn"/></Card>
                  </div>
                </>
              ):(
                <Card style={{textAlign:"center",padding:"3.5rem 2rem"}}>
                  <div style={{fontSize:40,opacity:0.15,marginBottom:14}}>📊</div>
                  <div style={{fontFamily:T.serif,fontSize:20,marginBottom:6}}>No report yet</div>
                  <div style={{fontSize:13,color:T.faint,marginBottom:"1.5rem"}}>Click "Generate report" to get your AI-powered financial analysis.</div>
                  <Btn onClick={generate}>Generate report</Btn>
                </Card>
              )}
            </div>
          )}
          {tab==="ai report"&&(
            <div className="fu">
              {report?<Card><SLabel>AI-generated analysis</SLabel><div style={{fontSize:15,fontWeight:500,marginBottom:"1.25rem"}}>Personalised financial advice</div><MarkdownBlock text={report.ai_report}/></Card>
                     :<Card style={{textAlign:"center",padding:"3rem"}}><div style={{fontSize:13,color:T.faint}}>Generate a report first to view AI advice.</div></Card>}
            </div>
          )}
          {tab==="goals"&&<div className="fu"><GoalPlanner/></div>}
          {tab==="chat"&&<div className="fu"><ChatSection userId={user?.id}/></div>}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   PROFILE FORM
   ════════════════════════════════════════════════════════ */
function ProfileForm({onSuccess}) {
  const [form,setForm]=useState({age:"",income:"",expenses:"",savings:"",risk_appetite:"medium",financial_goals:""});
  const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const submit=async()=>{
    setLoading(true);setError("");
    try{
      const res=await fetch(`${API}/profile`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const d=await res.json();
      if (!res.ok){setError(d.error||"Failed to save profile.");return;}
      onSuccess(d);
    }catch{setError("Cannot connect to backend. Make sure Flask is running on port 5000.");}
    finally{setLoading(false);}
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <div style={{width:"100%",maxWidth:500}}>
        <div className="fu" style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontFamily:T.serif,fontSize:40,color:T.accent,marginBottom:6}}>FinanceAI</div>
          <div style={{fontSize:13,color:T.muted}}>Your AI-powered financial advisor</div>
        </div>
        <Card cls="fu1" style={{padding:"2rem"}}>
          <h2 style={{fontFamily:T.serif,fontSize:22,fontWeight:400,marginBottom:4}}>Create your profile</h2>
          <p style={{fontSize:13,color:T.muted,marginBottom:"1.5rem",lineHeight:1.65}}>We'll analyse your finances and give you personalised AI-driven advice.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><SLabel>Age</SLabel><input type="number" value={form.age} onChange={set("age")} placeholder="e.g. 25"/></div>
            <div><SLabel>Risk appetite</SLabel>
              <select value={form.risk_appetite} onChange={set("risk_appetite")}>
                <option value="low">Low — safe & steady</option>
                <option value="medium">Medium — balanced</option>
                <option value="high">High — aggressive growth</option>
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
            {[["Monthly income (₹)","income"],["Monthly expenses (₹)","expenses"],["Monthly savings (₹)","savings"]].map(([lbl,k])=>(
              <div key={k}><SLabel>{lbl}</SLabel><input type="number" value={form[k]} onChange={set(k)} placeholder="₹ 0"/></div>
            ))}
          </div>
          <div style={{marginBottom:"1.5rem"}}><SLabel>Financial goals</SLabel><input type="text" value={form.financial_goals} onChange={set("financial_goals")} placeholder="e.g. Buy a car in 2 years, retire at 50…"/></div>
          {error&&<div style={{background:T.redDim,border:`1px solid ${T.redBdr}`,borderRadius:T.r,padding:"9px 12px",color:T.red,fontSize:13,marginBottom:"1rem"}}>{error}</div>}
          <Btn onClick={submit} disabled={loading} style={{width:"100%",justifyContent:"center",padding:"11px"}}>
            {loading&&<Spinner size={14} color="#0c0e12"/>}{loading?"Saving…":"Save & open dashboard →"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SIDEBAR  — with delete button and inline confirmation
   ════════════════════════════════════════════════════════ */
function ProfileCard({ u, active, onSelect, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rCol = { low:T.green, medium:T.yellow, high:T.red };
  const sr = u.income > 0 ? Math.round((u.savings / u.income) * 100) : 0;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`${API}/profile/${u.id}`, { method: "DELETE" });
      if (res.ok) {
        clearChat(u.id);
        onDelete(u.id);
      } else {
        const d = await res.json();
        alert(d.error || "Delete failed.");
        setConfirm(false);
      }
    } catch {
      alert("Cannot reach backend.");
      setConfirm(false);
    }
    setDeleting(false);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirm(false);
  };

  return (
    <div style={{ marginBottom: 3 }}>
      {/* Main card row */}
      <button
        onClick={() => { setConfirm(false); onSelect(u); }}
        style={{
          width:"100%", textAlign:"left", padding:"10px 11px",
          borderRadius: confirm ? `${T.r} ${T.r} 0 0` : T.r,
          background: active ? T.bg3 : "transparent",
          border: `1px solid ${active ? T.borderMid : "transparent"}`,
          borderBottom: confirm ? `1px solid ${T.border}` : undefined,
          cursor:"pointer", transition:"all 0.15s", display:"block",
        }}
      >
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
          <span style={{ fontSize:13, fontWeight:500, color:active?T.text:T.muted }}>
            Profile #{u.id}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {active && <span style={{ width:6, height:6, borderRadius:99, background:T.accent }}/>}
            {/* Trash icon button */}
            <span
              onClick={handleDelete}
              title="Delete profile"
              style={{
                width:20, height:20, borderRadius:6,
                display:"flex", alignItems:"center", justifyContent:"center",
                color: confirm ? T.red : T.faint,
                background: confirm ? T.redDim : "transparent",
                border: `1px solid ${confirm ? T.redBdr : "transparent"}`,
                fontSize:11, cursor:"pointer", transition:"all 0.15s", flexShrink:0,
              }}
              onMouseEnter={e => { if (!confirm) { e.currentTarget.style.color=T.red; e.currentTarget.style.background=T.redDim; e.currentTarget.style.borderColor=T.redBdr; } }}
              onMouseLeave={e => { if (!confirm) { e.currentTarget.style.color=T.faint; e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; } }}
            >
              {deleting ? "…" : "🗑"}
            </span>
          </div>
        </div>
        <div style={{ fontSize:11, color:T.faint, lineHeight:1.4, marginBottom:6 }}>
          {(u.financial_goals||"No goal").slice(0,28)}{(u.financial_goals||"").length>28?"…":""}
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:T.faint, background:T.bg3, border:`1px solid ${T.border}`, borderRadius:99, padding:"2px 7px" }}>{sr}% saved</span>
          {u.risk_appetite && <span style={{ fontSize:10, color:rCol[u.risk_appetite]||T.faint, background:T.bg3, border:`1px solid ${T.border}`, borderRadius:99, padding:"2px 7px" }}>{u.risk_appetite}</span>}
        </div>
      </button>

      {/* Inline confirmation strip — slides down below the card */}
      {confirm && (
        <div style={{
          background: T.redDim, border:`1px solid ${T.redBdr}`,
          borderTop:"none", borderRadius:`0 0 ${T.r} ${T.r}`,
          padding:"8px 11px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
          animation:"slideDown 0.15s ease both",
        }}>
          <span style={{ fontSize:11, color:T.red, lineHeight:1.4 }}>
            Delete Profile #{u.id} and its report?
          </span>
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            <button onClick={handleDelete} disabled={deleting} style={{
              background:T.red, color:"#0c0e12", border:"none",
              borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600,
              cursor:deleting?"not-allowed":"pointer", opacity:deleting?0.6:1,
            }}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button onClick={handleCancelDelete} style={{
              background:"transparent", color:T.muted, border:`1px solid ${T.border}`,
              borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer",
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ users, activeUser, onSelect, onNewProfile, onDelete, page }) {
  return (
    <aside style={{ width:235, minHeight:"100vh", flexShrink:0, background:T.bg1, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"1.5rem 1.25rem 1.15rem", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontFamily:T.serif, fontSize:22, color:T.accent }}>FinanceAI</div>
        <div style={{ fontSize:11, color:T.faint, marginTop:2 }}>AI financial advisor</div>
      </div>
      <div style={{ padding:"0.75rem 0.75rem 0.5rem" }}>
        <button onClick={onNewProfile} style={{ width:"100%", textAlign:"left", padding:"9px 11px", borderRadius:T.r, fontSize:13, fontWeight:500, background:page==="profile"?T.accentDim:"transparent", border:`1px solid ${page==="profile"?T.accentBdr:"transparent"}`, color:page==="profile"?T.accent:T.muted, cursor:"pointer", display:"flex", alignItems:"center", gap:9, transition:"all 0.15s" }}>
          <span style={{ fontSize:18, lineHeight:1 }}>＋</span> New profile
        </button>
      </div>
      <div style={{ padding:"0.5rem 0.75rem", flex:1, overflowY:"auto" }}>
        <SLabel style={{ paddingLeft:4 }}>Saved profiles</SLabel>
        {users.length === 0 && <div style={{ fontSize:12, color:T.faint, padding:"5px 5px" }}>No profiles yet</div>}
        {users.map(u => (
          <ProfileCard
            key={u.id}
            u={u}
            active={activeUser?.id === u.id}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>
      <div style={{ padding:"0.75rem 1.25rem", borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontSize:11, color:T.faint }}>Powered by Gemini AI</div>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════
   ROOT
   ════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage]         = useState("profile");
  const [activeUser, setActive] = useState(null);
  const [users, setUsers]       = useState([]);

  // Load all profiles from DB on mount
  useEffect(() => {
    fetch(`${API}/users`)
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => {
        const list = d.users || [];
        setUsers(list);
        if (list.length > 0) {
          setActive(list[list.length - 1]);
          setPage("dashboard");
        }
      })
      .catch(() => {});
  }, []);

  const handleProfileSuccess = data => {
    const u = { id: data.user_id, ...data.profile };
    setUsers(prev => [...prev.filter(x => x.id !== u.id), u].sort((a, b) => a.id - b.id));
    setActive(u);
    setPage("dashboard");
  };

  const handleDelete = deletedId => {
    setUsers(prev => prev.filter(u => u.id !== deletedId));
    // If the deleted profile was active, clear the dashboard
    if (activeUser?.id === deletedId) {
      setActive(null);
      setPage("profile");
    }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg0, fontFamily:T.font }}>
      <Sidebar
        users={users}
        activeUser={activeUser}
        onSelect={u => { setActive(u); setPage("dashboard"); }}
        onNewProfile={() => setPage("profile")}
        onDelete={handleDelete}
        page={page}
      />
      <main style={{ flex:1, overflowY:"auto", minWidth:0 }}>
        {page === "profile" && <ProfileForm onSuccess={handleProfileSuccess}/>}
        {page === "dashboard" && activeUser && <Dashboard user={activeUser}/>}
        {page === "dashboard" && !activeUser && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:40, opacity:0.15, marginBottom:12 }}>←</div>
              <div style={{ fontFamily:T.serif, fontSize:22, marginBottom:6 }}>No profile selected</div>
              <div style={{ fontSize:13, color:T.faint }}>Pick one from the sidebar or create a new profile.</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}