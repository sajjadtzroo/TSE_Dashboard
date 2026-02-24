import { useState } from "react";

const SANS = "'DM Sans',-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',monospace";
const C = {
  bg:"#0B0E11", surface:"#131722", card:"#1A1D2E", cardH:"#21253A",
  elev:"#252A3D", input:"#141825", fg:"#E8EAED", fg2:"#9CA3AF",
  fg3:"#6B7280", border:"#2A2E3E", borderS:"#1E2234", accent:"#2962FF",
  profit:"#22C55E", loss:"#EF4444", warn:"#F59E0B", info:"#3B82F6",
};

const SCALES = {
  spacing:{xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"24px",xxl:"32px"},
  radius:{xs:"2px",sm:"6px",md:"10px",lg:"14px",xl:"18px",xxl:"24px",full:"9999px"},
  shadow:{
    xs:"0 1px 2px rgba(0,0,0,0.15)", sm:"0 2px 6px rgba(0,0,0,0.2)",
    md:"0 4px 16px rgba(0,0,0,0.3)", lg:"0 8px 24px rgba(0,0,0,0.4)",
    xl:"0 16px 48px rgba(0,0,0,0.5)",
  },
  zIndex:{base:"1",dropdown:"100",sticky:"200",overlay:"300",modal:"400",popover:"500",toast:"600",max:"9999"},
};

const COLOR10 = {
  accent:["#E8EEFF","#C7D7FF","#9BB5FF","#6E93FF","#4A78FF","#2962FF","#1E50D9","#163EB3","#102D8C","#0C2070"],
  green:["#E8FBF0","#C3F5D9","#8AEDB7","#51E494","#2AD97A","#22C55E","#1AA54E","#158A40","#107032","#0C5826"],
  red:["#FEF2F2","#FEE2E2","#FECACA","#FCA5A5","#F87171","#EF4444","#DC2626","#B91C1C","#991B1B","#7F1D1D"],
  amber:["#FFFBEB","#FEF3C7","#FDE68A","#FCD34D","#FBBF24","#F59E0B","#D97706","#B45309","#92400E","#78350F"],
  blue:["#EFF6FF","#DBEAFE","#BFDBFE","#93C5FD","#60A5FA","#3B82F6","#2563EB","#1D4ED8","#1E40AF","#1E3A8A"],
  violet:["#F5F3FF","#EDE9FE","#DDD6FE","#C4B5FD","#A78BFA","#8B5CF6","#7C3AED","#6D28D9","#5B21B6","#4C1D95"],
  cyan:["#ECFEFF","#CFFAFE","#A5F3FC","#67E8F9","#22D3EE","#06B6D4","#0891B2","#0E7490","#155E75","#164E63"],
  gray:["#F9FAFB","#F3F4F6","#E5E7EB","#D1D5DB","#9CA3AF","#6B7280","#4B5563","#374151","#1F2937","#111827"],
  dark:["#C9C9C9","#B8B8B8","#828282","#696969","#424242","#3B3B3B","#2E2E2E","#242424","#1F1F1F","#141414"],
};

/* ── Reusable pieces ── */
function CopyBox({hex,label}){
  const [ok,setOk]=useState(false);
  const go=()=>{navigator.clipboard?.writeText(hex);setOk(true);setTimeout(()=>setOk(false),700);};
  const isHex=hex.length===7&&hex[0]==="#";
  const light=isHex&&(parseInt(hex.slice(1,3),16)*0.299+parseInt(hex.slice(3,5),16)*0.587+parseInt(hex.slice(5,7),16)*0.114)>140;
  const tc=light?"#0B0E11":"#E8EAED";
  const bg2=isHex?hex:C.card;
  return(
    <div onClick={go} style={{background:bg2,borderRadius:10,padding:"10px 12px",minWidth:95,cursor:"pointer",border:`1px solid ${C.border}`,transition:"all .15s"}}>
      <div style={{fontSize:10,color:tc,opacity:.6,marginBottom:2,fontFamily:MONO}}>{label}</div>
      <div style={{fontSize:11,color:tc,fontWeight:600,fontFamily:MONO,wordBreak:"break-all"}}>{ok?"✓ copied":hex.length>22?hex.slice(0,20)+"…":hex}</div>
    </div>
  );
}

function Sec({title,sub,children}){
  return(
    <div style={{marginBottom:28}}>
      <h3 style={{fontSize:15,fontWeight:700,color:C.fg,marginBottom:sub?2:10,fontFamily:SANS,letterSpacing:"-0.02em"}}>{title}</h3>
      {sub&&<p style={{fontSize:11,color:C.fg3,marginBottom:10,lineHeight:1.6}}>{sub}</p>}
      {children}
    </div>
  );
}

function Tbl({rows}){
  return(
    <div style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden"}}>
      {rows.map((r,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",borderBottom:i<rows.length-1?`1px solid ${C.borderS}`:"none",gap:10}}>
          <span style={{fontSize:11,color:C.fg2,flexShrink:0,minWidth:120}}>{r.l}</span>
          <span style={{fontSize:11,color:C.fg,fontFamily:MONO,fontWeight:500,background:C.input,padding:"2px 7px",borderRadius:6,textAlign:"right",wordBreak:"break-all",lineHeight:1.5}}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function Scale10({name,shades}){
  const [cp,setCp]=useState(null);
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:11,color:C.fg2,fontWeight:600,marginBottom:4}}>{name}</div>
      <div style={{display:"flex",gap:2}}>
        {shades.map((c,i)=>(
          <div key={i} onClick={()=>{navigator.clipboard?.writeText(c);setCp(i);setTimeout(()=>setCp(null),600);}} style={{cursor:"pointer",flex:1,textAlign:"center"}}>
            <div style={{height:26,background:c,borderRadius:i===0?"6px 0 0 6px":i===9?"0 6px 6px 0":"0"}}/>
            <div style={{fontSize:8,color:cp===i?C.accent:C.fg3,fontFamily:MONO,marginTop:2,fontWeight:cp===i?700:400}}>{cp===i?"✓":i}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPI({title,value,delta,up,spark,mode}){
  const [h,setH]=useState(false);
  const dc=up?C.profit:C.loss;
  const dbg=up?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)";
  const glow=up?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)";
  const base={borderRadius:14,padding:"18px 20px",transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)",flex:1,minWidth:170,cursor:"default",position:"relative",overflow:"hidden"};
  const ms={
    flat:{background:h?C.cardH:C.card,border:`1px solid ${h?C.border:C.borderS}`,boxShadow:h?"0 4px 16px rgba(0,0,0,0.3)":"0 2px 6px rgba(0,0,0,0.2)",transform:h?"translateY(-2px)":"none"},
    glass:{background:h?"rgba(33,37,58,0.65)":"rgba(26,29,46,0.55)",backdropFilter:"blur(16px) saturate(1.4)",WebkitBackdropFilter:"blur(16px) saturate(1.4)",border:`1px solid ${h?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.08)"}`,boxShadow:h?"0 8px 32px rgba(0,0,0,0.3)":"0 4px 16px rgba(0,0,0,0.15)",transform:h?"translateY(-2px)":"none"},
    glow:{background:h?C.cardH:C.card,border:`1px solid ${h?dc+"40":C.borderS}`,boxShadow:h?`0 0 24px ${glow}`:"0 2px 6px rgba(0,0,0,0.2)",transform:h?"translateY(-3px)":"none"},
    neu:{background:C.card,border:"none",boxShadow:h?"6px 6px 16px rgba(0,0,0,0.6),-6px -6px 16px rgba(255,255,255,0.03)":"4px 4px 12px rgba(0,0,0,0.5),-4px -4px 12px rgba(255,255,255,0.025)",transform:h?"translateY(-1px)":"none"},
  };
  const sMax=Math.max(...(spark||[1])),sMin=Math.min(...(spark||[0])),sR=sMax-sMin||1;
  return(
    <div style={{...base,...ms[mode]}} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}>
      <div style={{fontSize:11,color:C.fg2,marginBottom:8,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.04em"}}>{title}</div>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:26,fontWeight:700,color:C.fg,fontFamily:MONO,letterSpacing:"-0.03em",lineHeight:1.1}}>{value}</div>
          <div style={{display:"inline-flex",alignItems:"center",gap:3,marginTop:8,padding:"2px 8px",borderRadius:9999,background:dbg,fontSize:11,fontWeight:600,color:dc}}>
            <span style={{fontSize:8}}>{up?"▲":"▼"}</span>{delta}
          </div>
        </div>
        {spark&&<svg width="68" height="26" viewBox="0 0 68 26" style={{opacity:.45}}>
          <polyline fill="none" stroke={dc} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={spark.map((v,i)=>`${(i/(spark.length-1))*68},${26-((v-sMin)/sR)*22}`).join(" ")}/>
        </svg>}
      </div>
    </div>
  );
}

function HoverDemo({label,hs}){
  const [h,setH]=useState(false);
  return(
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:C.card,borderRadius:10,padding:16,textAlign:"center",border:`1px solid ${C.border}`,transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)",cursor:"pointer",minWidth:110,flex:1,...(h?hs:{})}}>
      <div style={{fontSize:11,color:C.fg2,marginBottom:4}}>{label}</div>
      <div style={{fontSize:10,color:C.fg3,fontFamily:MONO}}>{h?"✦ Active":"Hover me"}</div>
    </div>
  );
}

function VBtn({name,bg,fg,bd,hbg}){
  const [h,setH]=useState(false);
  return(
    <button onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:h?(hbg||bg):bg,color:fg,border:bd||"1px solid transparent",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:SANS,transition:"all .15s"}}>
      {name}
    </button>
  );
}

/* ═══ MAIN ═══ */
export default function App(){
  const [tab,setTab]=useState("vars");
  const [mode,setMode]=useState("flat");
  const tabs=[
    {id:"vars",l:"CSS Vars"},{id:"scales",l:"Scales"},{id:"colors10",l:"Shades"},
    {id:"variants",l:"Variants"},{id:"modes",l:"Card Modes"},{id:"hover",l:"Hover"},
    {id:"components",l:"Components"},{id:"typo",l:"Typography"},{id:"registry",l:"Registry"},
  ];
  const s1=[20,25,22,30,28,35,33,40,38,45,42,48];
  const s2=[40,38,35,30,33,28,25,20,22,18,15,12];
  const s3=[55,60,58,65,62,68,64,70,67,72,70,75];

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:SANS,color:C.fg}}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{padding:"16px 24px 0",borderBottom:`1px solid ${C.border}`,background:C.surface}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
          <div style={{width:7,height:7,borderRadius:2,background:C.accent,boxShadow:"0 0 10px rgba(41,98,255,0.4)"}}/>
          <h1 style={{fontSize:16,fontWeight:700,letterSpacing:"-0.03em",margin:0}}>Financial DS V3</h1>
          <span style={{fontSize:9,background:"rgba(41,98,255,0.12)",color:C.accent,padding:"2px 7px",borderRadius:9999,fontWeight:600}}>shadcn + Mantine</span>
        </div>
        <p style={{fontSize:11,color:C.fg3,margin:"2px 0 12px"}}>CSS Variables · 10-Shade Scales · Variant System · Card Modes · Motion Specs</p>
        <div style={{display:"flex",gap:1,overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"7px 12px",fontSize:11,fontWeight:tab===t.id?600:400,
              color:tab===t.id?C.fg:C.fg3,background:tab===t.id?C.card:"transparent",
              border:"none",borderRadius:"8px 8px 0 0",cursor:"pointer",
              borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",
              fontFamily:SANS,whiteSpace:"nowrap",transition:"all .15s",
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"20px 24px",maxWidth:920}}>

{/* ══════ TAB: CSS Variables ══════ */}
{tab==="vars"&&<>
  <Sec title="CSS Variables (shadcn Convention)" sub="bg/foreground pairs. Click swatch to copy hex.">
    <Tbl rows={[
      {l:"Pattern",v:"--{role} = bg, --{role}-foreground = text"},
      {l:"Usage",v:"bg: var(--card); color: var(--card-foreground)"},
      {l:"Focus ring",v:"outline: 2px solid var(--ring); outline-offset: 2px"},
    ]}/>
  </Sec>
  <Sec title="Core Surfaces">
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["--background","#0B0E11"],["--foreground","#E8EAED"],["--card","#1A1D2E"],["--card-foreground","#E8EAED"],["--card-hover","#21253A"],["--muted","#131722"],["--muted-foreground","#6B7280"],["--elevated","#252A3D"]].map(([n,h])=><CopyBox key={n} hex={h} label={n}/>)}
    </div>
  </Sec>
  <Sec title="Popover & Sidebar">
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["--popover","#1E2234"],["--sidebar","#0F1118"],["--sidebar-foreground","#9CA3AF"],["--sidebar-border","#1E2234"],["--sidebar-primary","#2962FF"]].map(([n,h])=><CopyBox key={n} hex={h} label={n}/>)}
    </div>
  </Sec>
  <Sec title="Primary & Accent">
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["--primary","#2962FF"],["--primary-foreground","#FFFFFF"],["--accent","#2962FF"],["--secondary","#1A1D2E"],["--secondary-foreground","#9CA3AF"]].map(([n,h])=><CopyBox key={n} hex={h} label={n}/>)}
    </div>
  </Sec>
  <Sec title="Semantic (Financial)">
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["--profit","#22C55E"],["--loss","#EF4444"],["--warning","#F59E0B"],["--info","#3B82F6"]].map(([n,h])=><CopyBox key={n} hex={h} label={n}/>)}
    </div>
  </Sec>
  <Sec title="Borders & Ring">
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["--border","#2A2E3E"],["--border-subtle","#1E2234"],["--input","#141825"],["--ring","#2962FF"]].map(([n,h])=><CopyBox key={n} hex={h} label={n}/>)}
    </div>
  </Sec>
  <Sec title="Chart 1–8">
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["--chart-1","#2962FF"],["--chart-2","#22C55E"],["--chart-3","#F59E0B"],["--chart-4","#EF4444"],["--chart-5","#8B5CF6"],["--chart-6","#06B6D4"],["--chart-7","#EC4899"],["--chart-8","#F97316"]].map(([n,h])=><CopyBox key={n} hex={h} label={n}/>)}
    </div>
  </Sec>
</>}

{/* ══════ TAB: Design Scales ══════ */}
{tab==="scales"&&<>
  <Sec title="Named Scales (Mantine Convention)" sub="xs–xl named sizes for spacing, radius, shadow, z-index. Consistent across all components.">
    <Tbl rows={[
      {l:"Pattern",v:"--spacing-{size}, --radius-{size}, --shadow-{size}"},
      {l:"Base grid",v:"4px for spacing"},
    ]}/>
  </Sec>
  <Sec title="Spacing">
    <Tbl rows={Object.entries(SCALES.spacing).map(([k,v])=>({l:`spacing-${k}`,v:`${v} — ${k==="xs"?"icon gaps":k==="sm"?"inline, badges":k==="md"?"card internal":k==="lg"?"section padding":k==="xl"?"card gaps":"section margins"}`}))}/>
  </Sec>
  <Sec title="Border Radius">
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
      {Object.entries(SCALES.radius).map(([k,v])=>(
        <div key={k} style={{textAlign:"center"}}>
          <div style={{width:38,height:38,background:C.card,border:`2px solid ${C.accent}`,borderRadius:v,marginBottom:3}}/>
          <div style={{fontSize:9,color:C.fg3,fontFamily:MONO}}>{k}</div>
          <div style={{fontSize:10,color:C.fg,fontFamily:MONO,fontWeight:600}}>{v}</div>
        </div>
      ))}
    </div>
    <Tbl rows={[
      {l:"Buttons, Inputs",v:"sm (6px)"},{l:"Cards, Modals",v:"md–lg (10–14px)"},
      {l:"Hero panels",v:"xl–xxl (18–24px)"},{l:"Badges, Pills",v:"full (9999px)"},
      {l:"shadcn --radius",v:"0.625rem (10px)"},
    ]}/>
  </Sec>
  <Sec title="Box Shadows">
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
      {Object.entries(SCALES.shadow).map(([k,v])=>(
        <div key={k} style={{width:60,height:46,background:C.card,borderRadius:10,boxShadow:v,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.fg2,fontFamily:MONO}}>{k}</div>
      ))}
    </div>
    <Tbl rows={Object.entries(SCALES.shadow).map(([k,v])=>({l:`shadow-${k}`,v}))}/>
  </Sec>
  <Sec title="Z-Index">
    <Tbl rows={Object.entries(SCALES.zIndex).map(([k,v])=>({l:`z-${k}`,v}))}/>
  </Sec>
  <Sec title="WCAG Contrast">
    <Tbl rows={[
      {l:"#E8EAED on #0B0E11",v:"15.4:1 ✓ AAA"},{l:"#9CA3AF on #0B0E11",v:"8.2:1 ✓ AAA"},
      {l:"#6B7280 on #0B0E11",v:"4.8:1 ✓ AA"},{l:"#22C55E on #1A1D2E",v:"5.9:1 ✓ AA"},
      {l:"#EF4444 on #1A1D2E",v:"4.6:1 ✓ AA"},{l:"Min AA text",v:"4.5:1"},{l:"Min AAA",v:"7:1"},
    ]}/>
  </Sec>
  <Sec title="Breakpoints">
    <Tbl rows={[
      {l:"xs (36em)",v:"< 576px — 1 col"},{l:"sm (48em)",v:"576–767 — 1–2 col"},
      {l:"md (62em)",v:"768–1023 — 2 col"},{l:"lg (75em)",v:"1024–1279 — 3–4 col"},
      {l:"xl (88em)",v:"> 1280px — max 1400px"},
    ]}/>
  </Sec>
</>}

{/* ══════ TAB: 10-Shade Colors ══════ */}
{tab==="colors10"&&<>
  <Sec title="10-Shade Scales (Mantine Pattern)" sub="Shade 0–9 (light→dark). Shade 5 = filled default. Shade 0–1 = light tint bg. Shade 7 = filled-hover.">
    <Tbl rows={[
      {l:"Filled",v:"shade[5] bg, white text"},{l:"Filled hover",v:"shade[7]"},
      {l:"Light variant",v:"rgba(shade[5], 0.12) for dark mode"},
      {l:"autoContrast",v:"luminance < 0.4 → white, else black"},
    ]}/>
  </Sec>
  {Object.entries(COLOR10).map(([n,s])=><Scale10 key={n} name={n} shades={s}/>)}
</>}

{/* ══════ TAB: Variants ══════ */}
{tab==="variants"&&<>
  <Sec title="5 Component Variants (Mantine)" sub="filled · light · outline · subtle · ghost — apply to buttons, badges, tags, cards.">
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      <VBtn name="Filled" bg="#2962FF" fg="#fff" hbg="#1E50D9"/>
      <VBtn name="Light" bg="rgba(41,98,255,0.12)" fg="#2962FF" hbg="rgba(41,98,255,0.18)"/>
      <VBtn name="Outline" bg="transparent" fg="#2962FF" bd="1px solid #2962FF" hbg="rgba(41,98,255,0.08)"/>
      <VBtn name="Subtle" bg="transparent" fg="#9CA3AF" hbg={C.card}/>
      <VBtn name="Ghost" bg="transparent" fg="#6B7280" hbg="rgba(255,255,255,0.04)"/>
    </div>
    <Tbl rows={[
      {l:"filled",v:"bg: --primary, fg: white, hover: brightness(0.9)"},
      {l:"light",v:"bg: rgba(primary, 0.12), fg: --primary, hover: 0.18"},
      {l:"outline",v:"bg: transparent, border: --primary, hover: rgba(0.08)"},
      {l:"subtle",v:"bg: transparent, fg: --secondary-fg, hover: --card"},
      {l:"ghost",v:"bg: transparent, fg: --muted-fg, hover: rgba(white,0.04)"},
    ]}/>
  </Sec>
  <Sec title="Semantic Variants">
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      <VBtn name="Buy / Long" bg="#22C55E" fg="#fff" hbg="#1AA54E"/>
      <VBtn name="Sell / Short" bg="#EF4444" fg="#fff" hbg="#DC2626"/>
      <VBtn name="Profit Light" bg="rgba(34,197,94,0.12)" fg="#22C55E" hbg="rgba(34,197,94,0.18)"/>
      <VBtn name="Loss Light" bg="rgba(239,68,68,0.12)" fg="#EF4444" hbg="rgba(239,68,68,0.18)"/>
      <VBtn name="Warning Light" bg="rgba(245,158,11,0.12)" fg="#F59E0B" hbg="rgba(245,158,11,0.18)"/>
    </div>
  </Sec>
  <Sec title="Badge / Tag Variants">
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[
        {l:"Filled",bg:"#22C55E",c:"#fff"},{l:"Pending",bg:"rgba(245,158,11,0.12)",c:"#F59E0B"},
        {l:"Failed",bg:"rgba(239,68,68,0.12)",c:"#EF4444"},{l:"Processing",bg:"rgba(59,130,246,0.12)",c:"#3B82F6"},
        {l:"LIVE",bg:"#EF4444",c:"#fff"},{l:"NEW",bg:"#2962FF",c:"#fff"},
        {l:"Outline",bg:"transparent",c:"#9CA3AF",bd:"1px solid #2A2E3E"},
      ].map((t,i)=><span key={i} style={{background:t.bg,color:t.c,padding:"3px 10px",borderRadius:9999,fontSize:10,fontWeight:600,border:t.bd||"none"}}>{t.l}</span>)}
    </div>
  </Sec>
</>}

{/* ══════ TAB: Card Modes ══════ */}
{tab==="modes"&&<>
  <Sec title="4 Card Modes" sub="Flat · Glass · Glow · Neu — hover each card.">
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      {["flat","glass","glow","neu"].map(m=>(
        <button key={m} onClick={()=>setMode(m)} style={{padding:"5px 14px",fontSize:11,fontWeight:mode===m?600:400,color:mode===m?"#fff":"#9CA3AF",background:mode===m?"#2962FF":"#1A1D2E",border:`1px solid ${mode===m?"#2962FF":"#2A2E3E"}`,borderRadius:9999,cursor:"pointer",fontFamily:SANS,transition:"all .2s"}}>{m[0].toUpperCase()+m.slice(1)}</button>
      ))}
    </div>
    <div style={{padding:20,borderRadius:18,background:mode==="glass"?`radial-gradient(ellipse at 20% 50%,#2962FF15 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,#22C55E10 0%,transparent 50%),${C.bg}`:mode==="neu"?C.card:"transparent"}}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KPI mode={mode} title="Portfolio" value="$84,291" delta="12.5%" up={true} spark={s1}/>
        <KPI mode={mode} title="Daily P&L" value="-$1,204" delta="2.3%" up={false} spark={s2}/>
        <KPI mode={mode} title="Win Rate" value="68.4%" delta="4.1%" up={true} spark={s3}/>
      </div>
    </div>
  </Sec>
  <Sec title="Mode CSS">
    <Tbl rows={[
      {l:"Flat",v:"bg: --card, border: 1px --border-subtle, shadow-sm"},
      {l:"Glass",v:"bg: --glass-bg, blur(16px) saturate(1.4), border: --glass-border"},
      {l:"Glow",v:"hover: border tints to semantic color + shadow glow"},
      {l:"Neu",v:"bg matches parent, dual shadow (dark + light)"},
    ]}/>
  </Sec>
  <Sec title="Glass Best Practices">
    <Tbl rows={[
      {l:"Background",v:"MUST have gradient/color behind glass panels"},
      {l:"Max panels",v:"3–5 per view (GPU compositing cost)"},
      {l:"Don't animate",v:"backdrop-filter animation is expensive"},
      {l:"Fallback",v:"@supports not (...) → rgba(26,29,46,0.9) solid"},
      {l:"Dark tint",v:"rgba(17,25,40,0.75) not rgba(0,0,0,0.5)"},
      {l:"Highlight",v:"inset 0 1px 0 rgba(255,255,255,0.04)"},
    ]}/>
  </Sec>
</>}

{/* ══════ TAB: Hover & Motion ══════ */}
{tab==="hover"&&<>
  <Sec title="Hover Effects" sub="Hover each card to preview.">
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
      <HoverDemo label="Lift" hs={{transform:"translateY(-4px)",boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}/>
      <HoverDemo label="Border Glow" hs={{borderColor:"#2962FF",boxShadow:"0 0 16px rgba(41,98,255,0.2)"}}/>
      <HoverDemo label="Profit Glow" hs={{boxShadow:"0 0 20px rgba(34,197,94,0.25)",borderColor:"#22C55E40"}}/>
      <HoverDemo label="Scale" hs={{transform:"scale(1.03)"}}/>
      <HoverDemo label="BG Shift" hs={{background:"#252A3D"}}/>
    </div>
  </Sec>
  <Sec title="Timing Specs">
    <Tbl rows={[
      {l:"Button :hover",v:"150ms ease-out"},{l:"Button :active",v:"100ms, scale(0.97)"},
      {l:"Card hover",v:"300ms cubic-bezier(0.4,0,0.2,1)"},{l:"Table row",v:"150ms ease, bg only"},
      {l:"Tooltip",v:"200ms ease-in, opacity + translateY(-4px)"},{l:"Modal enter",v:"300ms ease-out, scale(0.95→1)"},
      {l:"Dropdown",v:"200ms ease-out, translateY(-8px→0)"},{l:"Tab slide",v:"250ms ease"},
      {l:"Skeleton",v:"1.5s ease-in-out infinite"},{l:"Chart crosshair",v:"0ms — instant"},
      {l:"Sparkline draw",v:"800ms ease-in-out"},{l:"Number count-up",v:"600ms ease-out"},
      {l:"Toast enter",v:"300ms slide-in right"},{l:"Toast exit",v:"200ms fade + translateX"},
    ]}/>
  </Sec>
  <Sec title="Focus & A11y">
    <Tbl rows={[
      {l:"Focus ring",v:"outline: 2px solid var(--ring); outline-offset: 2px"},
      {l:":focus-visible",v:"NOT :focus — skip ring on mouse click"},
      {l:"Disabled",v:"opacity: 0.4; cursor: not-allowed"},
      {l:"Loading",v:"Skeleton shimmer, never spinners on numbers"},
      {l:"Error",v:"border: var(--destructive) + error text"},
      {l:"Reduce motion",v:"@media (prefers-reduced-motion) → transition: none"},
    ]}/>
  </Sec>
</>}

{/* ══════ TAB: Components ══════ */}
{tab==="components"&&<>
  <Sec title="Buttons">
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
      {[{l:"Buy",bg:"#22C55E",c:"#fff"},{l:"Sell",bg:"#EF4444",c:"#fff"},{l:"Primary",bg:"#2962FF",c:"#fff"},{l:"Light",bg:"rgba(41,98,255,0.12)",c:"#2962FF"},{l:"Outline",bg:"transparent",c:"#2962FF",bd:"1px solid #2962FF"},{l:"Ghost",bg:"transparent",c:"#6B7280"}].map((b,i)=>(
        <button key={i} style={{background:b.bg,color:b.c,border:b.bd||"1px solid transparent",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:SANS}}>{b.l}</button>
      ))}
    </div>
    <Tbl rows={[
      {l:"sm",v:"32px h, 6px 12px pad, 11px font"},
      {l:"md",v:"38px h, 8px 16px pad, 12px font"},
      {l:"lg",v:"44px h, 10px 20px pad, 13px font"},
      {l:":hover filled",v:"filter: brightness(0.9)"},
      {l:":active",v:"scale(0.97), 100ms"},{l:":disabled",v:"opacity 0.4"},
    ]}/>
  </Sec>
  <Sec title="Data Table">
    <div style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:10}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
          {["Symbol","Price","24h","Volume"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",color:C.fg3,fontWeight:500,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {[{s:"BTC/USDT",p:"$67,842.50",d:"+3.21%",v:"$42.1B",u:true},{s:"ETH/USDT",p:"$3,421.80",d:"-1.12%",v:"$18.7B",u:false}].map((r,i)=>(
            <tr key={i} style={{borderBottom:`1px solid ${C.borderS}`}}>
              <td style={{padding:"9px 12px",fontWeight:600,color:C.fg}}>{r.s}</td>
              <td style={{padding:"9px 12px",fontFamily:MONO,color:C.fg}}>{r.p}</td>
              <td style={{padding:"9px 12px",fontFamily:MONO,fontWeight:600,color:r.u?C.profit:C.loss}}>{r.d}</td>
              <td style={{padding:"9px 12px",fontFamily:MONO,color:C.fg2}}>{r.v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Tbl rows={[
      {l:"Header",v:"10px uppercase, --muted-fg, tracking 0.06em"},
      {l:"Row height",v:"42px"},{l:"Divider",v:"1px solid --border-subtle"},
      {l:"Hover row",v:"bg: --card-hover, 150ms"},{l:"Numbers",v:"tabular-nums; monospace"},
      {l:"Positive",v:"color: --profit"},{l:"Negative",v:"color: --loss + minus sign"},
    ]}/>
  </Sec>
  <Sec title="Input Fields">
    <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
      <input readOnly placeholder="Search markets..." style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",fontSize:12,color:C.fg,width:180,outline:"none",fontFamily:SANS}}/>
      <input readOnly placeholder="Error state" style={{background:C.input,border:"1px solid #EF4444",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.fg,width:180,outline:"none",fontFamily:SANS}}/>
    </div>
    <Tbl rows={[
      {l:"bg",v:"--input (#141825)"},{l:"border",v:"1px solid --border"},
      {l:"focus",v:"border --ring + outline 2px rgba(ring,0.3)"},{l:"error",v:"border --destructive"},
      {l:"height",v:"sm:32 md:38 lg:44"},{l:"placeholder",v:"--muted-foreground"},
    ]}/>
  </Sec>
  <Sec title="Skeleton Loading">
    <div style={{display:"flex",gap:12,marginBottom:8}}>
      <div style={{width:180,height:18,borderRadius:6,background:`linear-gradient(90deg,${C.card} 25%,${C.elev} 50%,${C.card} 75%)`,backgroundSize:"200% 100%",animation:"shimmer 1.5s ease-in-out infinite"}}/>
      <div style={{width:50,height:18,borderRadius:9999,background:`linear-gradient(90deg,${C.card} 25%,${C.elev} 50%,${C.card} 75%)`,backgroundSize:"200% 100%",animation:"shimmer 1.5s ease-in-out infinite"}}/>
    </div>
    <Tbl rows={[
      {l:"Gradient",v:"--card 25% → --elevated 50% → --card 75%"},
      {l:"Animation",v:"1.5s ease-in-out infinite, bg-position shift"},
      {l:"Usage",v:"Replace numbers/text, NOT spinners on data"},
    ]}/>
  </Sec>
</>}

{/* ══════ TAB: Typography ══════ */}
{tab==="typo"&&<>
  <Sec title="Font Stack">
    <Tbl rows={[
      {l:"--font-family",v:"DM Sans, -apple-system, sans-serif"},
      {l:"--font-family-mono",v:"JetBrains Mono, SF Mono, Fira Code"},
      {l:"--font-family-headings",v:"DM Sans (or: Geist, Plus Jakarta Sans)"},
      {l:"Avoid",v:"Inter, Roboto — overused in fintech"},
    ]}/>
  </Sec>
  <Sec title="Type Scale">
    {[
      {s:"40px",w:700,n:"3xl — Hero KPI",t:"$1,284,291",m:true},
      {s:"32px",w:700,n:"xxl — Main KPI",t:"$84,291.00",m:true},
      {s:"24px",w:700,n:"xl — Card KPI",t:"$24,891.50",m:true},
      {s:"18px",w:600,n:"lg — Section head",t:"Portfolio Overview",m:false},
      {s:"14px",w:400,n:"md — Body text",t:"Your portfolio gained 12.5% this week",m:false},
      {s:"12px",w:500,n:"sm — Labels",t:"LAST 24H • UPDATED 2M AGO",m:false},
      {s:"11px",w:600,n:"xs — Badges",t:"▲ 3.2%  •  LIVE  •  BUY",m:false},
    ].map((t,i)=>(
      <div key={i} style={{display:"flex",alignItems:"baseline",gap:12,padding:"7px 10px",background:i%2===0?C.card:"transparent",borderRadius:8,marginBottom:2}}>
        <span style={{fontSize:9,color:C.fg3,fontFamily:MONO,minWidth:140,flexShrink:0}}>{t.n} — {t.s}/{t.w}</span>
        <span style={{fontSize:t.s,fontWeight:t.w,color:C.fg,fontFamily:t.m?MONO:SANS,letterSpacing:parseInt(t.s)>=24?"-0.03em":"0",lineHeight:1.2}}>{t.t}</span>
      </div>
    ))}
  </Sec>
  <Sec title="Number Formatting">
    <Tbl rows={[
      {l:"tabular-nums",v:"ALWAYS for data columns"},{l:"Currency",v:"$XX,XXX.XX — comma thousands"},
      {l:"Large nums",v:"$1.2M / $842K — abbreviate > 100K"},{l:"Percentage",v:"XX.X% — 1 decimal"},
      {l:"Crypto",v:"Up to 8 decimals"},{l:"Negative",v:"Red + minus sign, NEVER parens"},
      {l:"Zero",v:"'0.00' not '—' or empty"},{l:"Loading",v:"Skeleton shimmer"},
    ]}/>
  </Sec>
</>}

{/* ══════ TAB: Registry & Figma ══════ */}
{tab==="registry"&&<>
  <Sec title="shadcn Registries for Finance" sub="Install: npx shadcn add @registry/component">
    <Tbl rows={[
      {l:"@glass-ui",v:"40+ glassmorphic components, glow/shimmer effects"},
      {l:"@thegridcn",v:"Tron theme, HUD/Radar/DataCard components"},
      {l:"@animate-ui",v:"Animated primitives with Motion/Framer"},
      {l:"@magicui",v:"150+ animated components"},
      {l:"@motion-primitives",v:"Motion components for engineers"},
      {l:"@cardcn",v:"Beautifully designed card variants"},
      {l:"@shadcn-dashboard",v:"Production dashboard layouts"},
      {l:"@kibo-ui",v:"Composable charts & tables"},
      {l:"@abstract",v:"React components for crypto patterns"},
      {l:"@einui",v:"Glassmorphism + dark mode"},
      {l:"@smoothui",v:"Micro-interaction motion components"},
      {l:"@pacekit",v:"Dashboard blocks — production-ready"},
    ]}/>
  </Sec>
  <Sec title="Figma Resources">
    <Tbl rows={[
      {l:"Tokens Studio",v:"Plugin — manage tokens → CSS/JSON export"},
      {l:"Untitled UI",v:"6000+ components, dark mode vars"},
      {l:"AlignUI",v:"5900+ SaaS components — $120"},
      {l:"ChainFlow",v:"Free trading dashboard — Figma Community"},
      {l:"Wealthsimple DS",v:"Clean fintech with color vars"},
    ]}/>
  </Sec>
  <Sec title="Online Generators">
    <Tbl rows={[
      {l:"tweakcn.com",v:"shadcn theme editor — live CSS var preview"},
      {l:"ui.glass/generator",v:"Glassmorphism CSS generator"},
      {l:"neumorphism.io",v:"Neumorphism shadow generator"},
      {l:"mantine.dev/colors-generator",v:"10-shade palette from any color"},
    ]}/>
  </Sec>
  <Sec title="Integration Patterns">
    <Tbl rows={[
      {l:"shadcn + Mantine",v:"shadcn vars for surfaces, Mantine scales for spacing"},
      {l:"Tailwind v4",v:"oklch() format: --primary: oklch(0.48 0.22 264)"},
      {l:"Class usage",v:"bg-[var(--card)] text-[var(--card-foreground)]"},
      {l:"Dark mode",v:".dark { --background: ...; } — class toggle"},
      {l:"autoContrast",v:"luminance < 0.4 → white text, else black"},
      {l:"Variants in code",v:"filled/light/outline/subtle/ghost via cva()"},
      {l:"Ring focus",v:"ring-[var(--ring)] ring-offset-2"},
    ]}/>
  </Sec>
</>}

      </div>
    </div>
  );
}
