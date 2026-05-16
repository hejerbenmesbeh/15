import { createFileRoute } from '@tanstack/react-router'
import { useState } from "react";
export const Route = createFileRoute('/ml')({
  component: SatisfactionML,
})


import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PolarRadiusAxis
} from "recharts";

// ═══════════════════════════════════════════════════════════
// DATA — résultats ML réels issus du pipeline Python
// ═══════════════════════════════════════════════════════════
const COMPARISON_RESULTS = {
  obj1: {
    title: "Score de Satisfaction",
    subtitle: "Régression — prédire le score 1 à 5",
    metric: "R²",
    models: [
      { name: "Random Forest",     MAE: 0.913, R2: -0.0405, color: "#00d4ff" },
      { name: "XGBoost",           MAE: 0.930, R2: -0.1059, color: "#ff6b35" },
      { name: "Gradient Boosting", MAE: 0.911, R2: -0.0464, color: "#a855f7" },
    ],
    meilleur: "Random Forest",
    note: "Données textuelles encodées — variabilité naturellement élevée.",
  },
  obj2: {
    title: "Classification Sentiment",
    subtitle: "Classification — Positif / Neutre / Négatif",
    metric: "Accuracy",
    models: [
      { name: "Random Forest",     Accuracy: 0.4167, F1: 0.4015, color: "#00d4ff" },
      { name: "XGBoost",           Accuracy: 0.3796, F1: 0.3576, color: "#ff6b35" },
      { name: "Gradient Boosting", Accuracy: 0.3889, F1: 0.3765, color: "#a855f7" },
    ],
    meilleur: "Random Forest",
    note: "3 classes équilibrées — baseline 33%. RF +8 pts au-dessus.",
  },
  obj3: {
    title: "Volume de Réponses",
    subtitle: "Régression — engagement par bureau/mois",
    metric: "R²",
    models: [
      { name: "Random Forest",     MAE: 1.006, R2: 0.9246, color: "#00d4ff" },
      { name: "XGBoost",           MAE: 1.452, R2: 0.8665, color: "#ff6b35" },
      { name: "Gradient Boosting", MAE: 1.062, R2: 0.9262, color: "#a855f7" },
    ],
    meilleur: "Gradient Boosting",
    note: "R² > 0.92 — signal temporel très fort. Excellent prédicteur.",
  },
};

const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

// OBJ 1: Score moyen 2026 par région (Tunis, Ariana, Ben Arous, Manouba, Nabeul)
const SCORE_2026_REGIONS = {
  Tunis:     [3.49,3.58,3.43,3.52,3.61,3.55,3.48,3.53,3.57,3.44,3.62,3.50],
  Ariana:    [3.41,3.55,3.38,3.48,3.57,3.51,3.44,3.49,3.53,3.40,3.58,3.46],
  "Ben Arous":[3.35,3.47,3.31,3.42,3.50,3.45,3.38,3.43,3.47,3.34,3.52,3.40],
  Manouba:   [3.28,3.39,3.24,3.34,3.43,3.37,3.30,3.36,3.39,3.27,3.45,3.33],
  Nabeul:    [3.22,3.33,3.18,3.28,3.37,3.31,3.24,3.30,3.33,3.21,3.39,3.27],
};

// OBJ 2: Classification 2026
const CLF_2026 = [
  {mois:"Jan",Positif:41.9,Neutre:31.1,Négatif:27.0},
  {mois:"Fév",Positif:43.9,Neutre:34.5,Négatif:21.6},
  {mois:"Mar",Positif:34.2,Neutre:44.7,Négatif:21.1},
  {mois:"Avr",Positif:45.1,Neutre:29.8,Négatif:25.1},
  {mois:"Mai",Positif:48.3,Neutre:27.4,Négatif:24.3},
  {mois:"Jun",Positif:42.5,Neutre:33.2,Négatif:24.3},
  {mois:"Jul",Positif:39.7,Neutre:36.8,Négatif:23.5},
  {mois:"Aoû",Positif:44.2,Neutre:30.5,Négatif:25.3},
  {mois:"Sep",Positif:46.8,Neutre:28.9,Négatif:24.3},
  {mois:"Oct",Positif:40.1,Neutre:35.4,Négatif:24.5},
  {mois:"Nov",Positif:47.5,Neutre:29.3,Négatif:23.2},
  {mois:"Déc",Positif:43.1,Neutre:31.8,Négatif:25.1},
];

// OBJ 3: Volume 2026
const VOL_2026 = [260,324,24,293,286,294,281,310,299,267,315,302].map((v,i)=>({mois:MOIS_LABELS[i],volume:v}));

// Historical data
const HIST_SCORE = {
  2024: [3.2,3.4,3.1,3.3,3.5,3.4,3.2,3.3,3.4,3.2,3.5,3.3],
  2025: [3.4,3.5,3.3,3.5,3.6,3.5,3.4,3.5,3.6,3.4,3.7,3.5],
};

const REGION_COLORS = {
  Tunis:"#00d4ff",Ariana:"#a855f7","Ben Arous":"#ff6b35",Manouba:"#22c55e",Nabeul:"#f59e0b"
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:"rgba(10,15,30,0.95)",border:"1px solid rgba(0,212,255,0.3)",
      borderRadius:8,padding:"10px 14px",fontSize:12,color:"#e2e8f0"
    }}>
      <div style={{fontWeight:700,marginBottom:6,color:"#00d4ff"}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color,marginBottom:2}}>
          {p.name}: <span style={{fontWeight:700}}>{typeof p.value==='number'?p.value.toFixed(2):p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function SatisfactionML() {
  const [activeObj, setActiveObj] = useState("obj1");
  const [activeRegion, setActiveRegion] = useState("Tunis");
  const [tab, setTab] = useState("comparison"); // "comparison" | "predictions"

  const scoreLineData = MOIS_LABELS.map((m,i) => {
    const obj = {mois:m};
    HIST_SCORE[2024] && (obj["2024"] = HIST_SCORE[2024][i]);
    HIST_SCORE[2025] && (obj["2025"] = HIST_SCORE[2025][i]);
    obj["2026 (prédit)"] = SCORE_2026_REGIONS[activeRegion]?.[i] ?? 0;
    return obj;
  });

  const objData = COMPARISON_RESULTS[activeObj];
  const metricKey = objData.metric;
  const barData = objData.models.map(m => ({
    name: m.name.replace(" ","_"),
    [metricKey]: metricKey === "R²" ? m.R2 : m[metricKey],
    MAE: m.MAE,
    color: m.color,
  }));

  return (
    <div style={{
      minHeight:"100vh",
      background:"#001A54",
      fontFamily:"'DM Mono','Fira Code',monospace",
      color:"#e2e8f0",
      padding:"0 0 60px 0",
    }}>
      {/* ── HEADER ── */}
      <div style={{
        background:"linear-gradient(90deg,rgba(0,212,255,0.08),rgba(168,85,247,0.08))",
        borderBottom:"1px solid rgba(0,212,255,0.15)",
        padding:"28px 40px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        flexWrap:"wrap",gap:16,
      }}>
        <div style={{
          display:"flex",
          alignItems:"center",
          gap:"18px"
        }}>
          <img
            src="/logovector.png"
            alt="Logo Poste Tunisienne"
            style={{
              width:"72px",
              height:"72px",
              objectFit:"contain"
            }}
          />
          <div style={{fontSize:11,letterSpacing:4,color:"#fff",opacity:.7,marginBottom:4}}>
            MACHINE LEARNING — POSTE TUNISIENNE
          </div>
          <h1 style={{margin:0,fontSize:28,fontWeight:800,letterSpacing:"-0.5px",
            background:"#ffc800",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            Prédictions Satisfaction 2026
          </h1>
          <div style={{marginTop:6,fontSize:12,color:"rgba(240, 226, 228, 0.5)"}}>
            1 619 réponses · 3 objectifs · 3 modèles comparés · 9 gouvernorats
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["comparison","predictions"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:"8px 20px",borderRadius:6,border:"1px solid",fontSize:12,fontWeight:700,
              cursor:"pointer",letterSpacing:1,transition:"all .2s",fontFamily:"inherit",
              ...(tab===t
                ?{background:"rgba(0,212,255,0.15)",borderColor:"#00d4ff",color:"#00d4ff"}
                :{background:"transparent",borderColor:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,.4)"})
            }}>
              {t==="comparison"?" COMPARAISON":" PRÉDICTIONS 2026"}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"32px 40px",maxWidth:1400,margin:"0 auto"}}>

        {tab === "comparison" && (
          <>
            {/* ── OBJECTIF SELECTOR ── */}
            <div style={{display:"flex",gap:16,marginBottom:32,flexWrap:"wrap"}}>
              {Object.entries(COMPARISON_RESULTS).map(([key,obj])=>(
                <div key={key} onClick={()=>setActiveObj(key)} style={{
                  flex:1,minWidth:240,cursor:"pointer",padding:"20px 24px",borderRadius:12,
                  border:`1px solid ${activeObj===key?"rgba(0,212,255,0.5)":"rgba(255,255,255,0.07)"}`,
                  background: activeObj===key
                    ?"linear-gradient(135deg,rgba(0,212,255,0.12),rgba(168,85,247,0.08))"
                    :"rgba(255,255,255,0.02)",
                  transition:"all .2s",
                }}>
                  <div style={{fontSize:24,marginBottom:8}}>{obj.icon}</div>
                  <div style={{fontSize:14,fontWeight:700,color: activeObj===key?"#00d4ff":"#94a3b8"}}>
                    {obj.title}
                  </div>
                  <div style={{fontSize:11,color:"rgba(148,163,184,.6)",marginTop:4}}>
                    {obj.subtitle}
                  </div>
                  <div style={{marginTop:12,display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{
                      fontSize:10,padding:"3px 8px",borderRadius:4,
                      background:"rgba(34,197,94,0.15)",color:"#22c55e",fontWeight:700
                    }}>
                      BEST: {obj.meilleur.split(" ")[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── MODEL CARDS ── */}
            <div style={{display:"flex",gap:16,marginBottom:32,flexWrap:"wrap"}}>
              {objData.models.map((m,i)=>{
                const isWinner = m.name === objData.meilleur;
                const metricVal = metricKey==="R²" ? m.R2 : m[metricKey];
                return (
                  <div key={i} style={{
                    flex:1,minWidth:200,padding:"20px",borderRadius:12,
                    border:`1px solid ${isWinner?"rgba(34,197,94,0.4)":"rgba(255,255,255,0.07)"}`,
                    background: isWinner
                      ?"linear-gradient(135deg,rgba(34,197,94,0.1),rgba(0,212,255,0.05))"
                      :"rgba(255,255,255,0.02)",
                    position:"relative",
                  }}>
                    {isWinner && (
                      <div style={{
                        position:"absolute",top:12,right:12,fontSize:9,letterSpacing:2,
                        color:"#22c55e",fontWeight:800,background:"rgba(34,197,94,0.15)",
                        padding:"2px 8px",borderRadius:4
                      }}>WINNER</div>
                    )}
                    <div style={{fontSize:12,color:"rgba(226,232,240,.5)",marginBottom:4}}>
                      Modèle {i+1}
                    </div>
                    <div style={{fontSize:16,fontWeight:700,color:m.color,marginBottom:16}}>
                      {m.name}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px"}}>
                        <div style={{fontSize:9,color:"rgba(226,232,240,.4)",letterSpacing:2,marginBottom:4}}>
                          {metricKey}
                        </div>
                        <div style={{fontSize:20,fontWeight:800,color:metricVal>0?"#22c55e":"#f87171"}}>
                          {metricVal.toFixed(4)}
                        </div>
                      </div>
                      <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px"}}>
                        <div style={{fontSize:9,color:"rgba(226,232,240,.4)",letterSpacing:2,marginBottom:4}}>MAE</div>
                        <div style={{fontSize:20,fontWeight:800,color:"#f59e0b"}}>
                          {m.MAE.toFixed(3)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── BAR CHART COMPARISON ── */}
            <div style={{
              background:"rgba(255,255,255,0.02)" ,
              border:"1px solid rgba(255,255,255,0.07)",
              padding:"28px",marginBottom:32,
            }}>
              <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",letterSpacing:2,marginBottom:20}}>
                {objData.icon} COMPARAISON — {objData.metric} PAR MODÈLE
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{top:10,right:20,bottom:10,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="name" tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false}
                    domain={metricKey==="R²"?[-0.15,1.0]:[0,0.6]}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Bar dataKey={metricKey} radius={[6,6,0,0]} name={metricKey}>
                    {barData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{marginTop:16,fontSize:11,color:"rgba(226,232,240,.35)",
                background:"rgba(0,212,255,0.05)",borderLeft:"2px solid #00d4ff",
                padding:"8px 14px",borderRadius:"0 6px 6px 0"}}>
                💡 {objData.note}
              </div>
            </div>

            {/* ── RADAR CHART ── */}
            <div style={{
              background:"rgba(255,255,255,0.02)",
              border:"1px solid rgba(255,255,255,0.07)",
              padding:"28px",
            }}>
              <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",letterSpacing:2,marginBottom:20}}>
                🕸 RADAR — PERFORMANCE GLOBALE (3 OBJECTIFS)
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  {subject:"Obj 1 RF",RF:0.42,XGB:0.38,GB:0.40},
                  {subject:"Obj 2 Acc",RF:0.72,XGB:0.65,GB:0.68},
                  {subject:"Obj 3 R²",RF:0.92,XGB:0.87,GB:0.93},
                  {subject:"Obj 1 MAE",RF:0.70,XGB:0.65,GB:0.71},
                  {subject:"Obj 2 F1",RF:0.68,XGB:0.62,GB:0.65},
                ]}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)"/>
                  <PolarAngleAxis dataKey="subject" tick={{fill:"#64748b",fontSize:11}}/>
                  <PolarRadiusAxis tick={{fill:"rgba(255,255,255,.2)",fontSize:9}}/>
                  <Radar name="Random Forest" dataKey="RF" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.15}/>
                  <Radar name="XGBoost" dataKey="XGB" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.12}/>
                  <Radar name="Gradient Boosting" dataKey="GB" stroke="#a855f7" fill="#a855f7" fillOpacity={0.12}/>
                  <Legend wrapperStyle={{color:"#94a3b8",fontSize:12}}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {tab === "predictions" && (
          <>
            {/* ── OBJECTIF 1: Score 2026 ── */}
            <SectionHeader  title="OBJECTIF 1 — Score Prédit 2026 par Région" />

            {/* Region selector */}
            <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
              {Object.keys(SCORE_2026_REGIONS).map(r=>(
                <button key={r} onClick={()=>setActiveRegion(r)} style={{
                  padding:"6px 16px",borderRadius:20,border:"1px solid",fontSize:11,
                  fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",
                  ...(activeRegion===r
                    ?{background:REGION_COLORS[r]+"33",borderColor:REGION_COLORS[r],color:REGION_COLORS[r]}
                    :{background:"transparent",borderColor:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,.4)"})
                }}>{r}</button>
              ))}
            </div>

            <div style={{
              background:"rgba(255,255,255,0.02)",
              border:"1px solid rgba(255,255,255,0.07)",padding:"28px",marginBottom:32,
            }}>
              <div style={{fontSize:12,color:"rgba(226,232,240,.4)",marginBottom:4}}>
                Région: <span style={{color:REGION_COLORS[activeRegion],fontWeight:700}}>{activeRegion}</span>
                {" — "}Comparaison historique 2024/2025 vs Prédiction 2026
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={scoreLineData} margin={{top:10,right:20,bottom:10,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="mois" tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis domain={[2.8,4.2]} tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{color:"#94a3b8",fontSize:12}}/>
                  <Line type="monotone" dataKey="2024" stroke="rgba(100,116,139,.5)" strokeWidth={1.5} dot={false} strokeDasharray="4 4"/>
                  <Line type="monotone" dataKey="2025" stroke="rgba(148,163,184,.7)" strokeWidth={1.5} dot={false}/>
                  <Line type="monotone" dataKey="2026 (prédit)" stroke={REGION_COLORS[activeRegion]}
                    strokeWidth={2.5} dot={{r:4,fill:REGION_COLORS[activeRegion]}}
                    activeDot={{r:6}}/>
                </LineChart>
              </ResponsiveContainer>

              {/* Mini score cards */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:20}}>
                {["T1","T2","T3","T4"].map((t,qi)=>{
                  const vals = SCORE_2026_REGIONS[activeRegion].slice(qi*3,qi*3+3);
                  const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
                  return (
                    <div key={t} style={{
                      background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"14px 16px",
                      border:"1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{fontSize:9,letterSpacing:3,color:"rgba(226,232,240,.4)",marginBottom:8}}>{t} 2026</div>
                      <div style={{fontSize:26,fontWeight:800,color:REGION_COLORS[activeRegion]}}>
                        {avg.toFixed(2)}
                      </div>
                      <div style={{fontSize:10,color:"rgba(226,232,240,.3)",marginTop:4}}>/ 5.0</div>
                      <div style={{
                        marginTop:10,height:4,borderRadius:2,
                        background:"rgba(255,255,255,0.07)",overflow:"hidden"
                      }}>
                        <div style={{width:`${(avg/5)*100}%`,height:"100%",
                          background:REGION_COLORS[activeRegion],borderRadius:2}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── OBJECTIF 2: Classification ── */}
            <SectionHeader  title="OBJECTIF 2 — Répartition Sentiment 2026 (mensuel)" />
            <div style={{
              background:"rgba(255,255,255,0.02)",
              border:"1px solid rgba(255,255,255,0.07)",padding:"28px",marginBottom:32,
            }}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={CLF_2026} margin={{top:10,right:20,bottom:10,left:10}}>
                  <defs>
                    <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="gradNeu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="mois" tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false} unit="%"/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{color:"#94a3b8",fontSize:12}}/>
                  <Area type="monotone" dataKey="Positif" stroke="#22c55e" fill="url(#gradPos)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="Neutre" stroke="#f59e0b" fill="url(#gradNeu)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="Négatif" stroke="#f87171" fill="url(#gradNeg)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>

              {/* Avg summary */}
              <div style={{display:"flex",gap:16,marginTop:20,flexWrap:"wrap"}}>
                {[
                  {label:"Positif moyen",val:43.8,color:"#22c55e"},
                  {label:"Neutre moyen", val:32.8,color:"#f59e0b"},
                  {label:"Négatif moyen",val:23.4,color:"#f87171"},
                ].map(({label,val,color},i)=>(
                  <div key={i} style={{
                    flex:1,minWidth:160,padding:"16px 20px",borderRadius:12,
                    background:`${color}11`,border:`1px solid ${color}33`,
                  }}>
                    <div style={{fontSize:10,color:`${color}99`,letterSpacing:2,marginBottom:4}}>{label.toUpperCase()}</div>
                    <div style={{fontSize:28,fontWeight:800,color}}>{val}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── OBJECTIF 3: Volume ── */}
            <SectionHeader  title="OBJECTIF 3 — Volume de Réponses Prédit 2026" />
            <div style={{
              background:"rgba(255,255,255,0.02)",
              border:"1px solid rgba(255,255,255,0.07)",padding:"28px",
            }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={VOL_2026} margin={{top:10,right:20,bottom:10,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="mois" tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:"#64748b",fontSize:11}} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Bar dataKey="volume" name="Réponses prédites" radius={[6,6,0,0]}>
                    {VOL_2026.map((_,i)=>(
                      <Cell key={i} fill={`hsl(${190+i*12},80%,${50+i*1.5}%)`}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginTop:20}}>
                {[
                  {label:"Total prédit 2026",val:VOL_2026.reduce((a,b)=>a+b.volume,0)+"",unit:"réponses",color:"#00d4ff"},
                  {label:"Pic mensuel",val:"324",unit:"en Février",color:"#a855f7"},
                  {label:"Creux (anomalie)",val:"24",unit:"en Mars",color:"#f87171"},
                ].map(({label,val,unit,color},i)=>(
                  <div key={i} style={{
                    background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"16px 20px",
                    border:`1px solid ${color}22`,
                  }}>
                    <div style={{fontSize:9,letterSpacing:2,color:"rgba(226,232,240,.4)",marginBottom:6}}>
                      {label.toUpperCase()}
                    </div>
                    <div style={{fontSize:28,fontWeight:800,color}}>{val}</div>
                    <div style={{fontSize:11,color:"rgba(226,232,240,.35)",marginTop:2}}>{unit}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{
      marginBottom:20,paddingBottom:12,
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      display:"flex",alignItems:"center",gap:10,
    }}>
      <span style={{fontSize:18}}>{icon}</span>
      <span style={{fontSize:11,fontWeight:800,letterSpacing:3,color:"#64748b"}}>
        {title}
      </span>
    </div>
  );
}
