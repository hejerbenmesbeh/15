// ─────────────────────────────────────────────────────────────────────────────
// Fichier : src/routes/_app.ml.jsx
// RÈGLE CRITIQUE : export const Route EST EN TOUTE DERNIÈRE LIGNE
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:5000/api";

const DEMO_FILTERS = {
  regions:     ["Tunis", "Sfax", "Sousse", "Bizerte", "Kairouan", "Nabeul", "Monastir"],
  bureaux:     ["Bureau Central", "Bureau Bab Bhar", "Bureau Menzah", "Bureau Lac", "Bureau El Aouina"],
  genres:      ["Masculin", "Féminin"],
  tranches:    ["18-25", "26-35", "36-45", "46-55", "56+"],
  niveaux:     ["Primaire", "Secondaire", "Universitaire", "Sans niveau"],
  professions: ["Fonctionnaire", "Commerçant", "Étudiant", "Retraité", "Sans emploi"],
  enquetes:    ["Enquête Guichet 2024", "Enquête Services Postaux 2024", "Enquête Mandat 2024"],
  mois:        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  annees:      [2022, 2023, 2024],
};

const MOIS_LABELS = {
  1:"Janvier", 2:"Février", 3:"Mars", 4:"Avril", 5:"Mai", 6:"Juin",
  7:"Juillet", 8:"Août", 9:"Septembre", 10:"Octobre", 11:"Novembre", 12:"Décembre",
};

// Injection keyframes spin (une seule fois)
if (typeof document !== "undefined" && !document.getElementById("ml-kf")) {
  const st = document.createElement("style");
  st.id = "ml-kf";
  st.textContent = "@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}";
  document.head.appendChild(st);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS ATOMIQUES
// ─────────────────────────────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options, labelFn }) {
  return (
    <div style={s.formGroup}>
      <label style={s.label}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={s.select}>
        {options.map((o) => (
          <option key={String(o)} value={String(o)}>
            {labelFn ? labelFn(o) : String(o)}
          </option>
        ))}
      </select>
    </div>
  );
}

function RunButton({ loading, onClick, label, accent = "#dc2626" }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "11px 28px", borderRadius: 10,
        background: loading ? "#1e293b" : `linear-gradient(135deg, ${accent}cc, ${accent})`,
        border: `1px solid ${accent}55`,
        color: "#fff", fontWeight: 700, fontSize: 14,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.75 : 1,
        transition: "opacity .2s",
        boxShadow: loading ? "none" : `0 4px 18px ${accent}40`,
      }}
    >
      {loading
        ? <><span style={s.spinner} /> Analyse en cours…</>
        : label
      }
    </button>
  );
}

function DemoBanner() {
  return (
    <div style={s.demoBanner}>
      ⚠️ Mode démonstration — Flask non connecté. Résultats simulés.
    </div>
  );
}

function SectionTitle({ text }) {
  return (
    <div style={s.sectionTitle}>{text}</div>
  );
}

function MetricBadge({ label, value, color = "#e8b14f" }) {
  return (
    <div style={s.badge}>
      <span style={{ color, fontWeight: 700, fontSize: 15 }}>{value}</span>
      <span style={s.badgeLabel}>{label}</span>
    </div>
  );
}

function ConfidenceBar({ pct }) {
  const color = pct >= 85 ? "#22c55e" : pct >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <div style={s.confRow}>
      <span style={s.confLabel}>Confiance</span>
      <div style={s.confTrack}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 1s ease" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 44 }}>{pct}%</span>
    </div>
  );
}

function ResultWrapper({ children }) {
  return (
    <div style={{ ...s.resultBox, animation: "fadeIn .4s ease" }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTE 1 — SATISFACTION
// ─────────────────────────────────────────────────────────────────────────────
function SatisfactionCard({ filters }) {
  const [form, setForm] = useState({
    region: "Tunis", bureau: "Bureau Central", genre: "Masculin",
    tranche_age: "26-35", niveau_instruction: "Universitaire",
    profession: "Fonctionnaire", enquete: "Enquête Guichet 2024",
    mois: 6, annee: 2024,
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo]       = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const run = async () => {
    setLoading(true); setResult(null); setDemo(false);
    try {
      setResult(await apiPost("/predict/satisfaction", form));
    } catch {
      const score = parseFloat((2.5 + Math.random() * 2.2).toFixed(2));
      setResult({
        prediction: score, score_pct: ((score / 5) * 100).toFixed(1),
        interpretation: score >= 4 ? "Excellent — Clients très satisfaits." : score >= 3 ? "Bon — Au-dessus de la moyenne." : "Moyen — Des améliorations sont nécessaires.",
        model: "Random Forest Regressor", mae: "0.31", r2: "0.78",
        confidence: parseFloat((76 + Math.random() * 18).toFixed(1)),
      });
      setDemo(true);
    }
    setLoading(false);
  };

  const score  = result?.prediction ?? 0;
  const pct    = parseFloat(result?.score_pct ?? 0);
  const arc    = (score / 5) * 283;
  const col    = score >= 4 ? "#22c55e" : score >= 3 ? "#e8b14f" : "#ef4444";
  const stars  = Math.round(score);

  return (
    <div style={s.card}>
      {/* En-tête carte */}
      <div style={{ ...s.cardHeader, borderLeftColor: "#e8b14f" }}>
        <div style={{ ...s.cardIcon, background: "#e8b14f18", color: "#e8b14f" }}>📊</div>
        <div>
          <div style={s.cardTitle}>Prédiction du Taux de Satisfaction</div>
          <div style={s.cardSub}>Anticiper la qualité perçue du service postal</div>
        </div>
        <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, background: "#e8b14f12", border: "1px solid #e8b14f30", fontSize: 12, color: "#e8b14f" }}>
          Régression RF
        </div>
      </div>

      {/* Formulaire */}
      <SectionTitle text="Paramètres de prédiction" />
      <div style={s.grid3}>
        <SelectField label="Région"             value={form.region}             onChange={set("region")}             options={filters.regions} />
        <SelectField label="Bureau de poste"    value={form.bureau}             onChange={set("bureau")}             options={filters.bureaux} />
        <SelectField label="Genre"              value={form.genre}              onChange={set("genre")}              options={filters.genres} />
        <SelectField label="Tranche d'âge"      value={form.tranche_age}        onChange={set("tranche_age")}        options={filters.tranches} />
        <SelectField label="Niveau instruction" value={form.niveau_instruction} onChange={set("niveau_instruction")} options={filters.niveaux} />
        <SelectField label="Profession"         value={form.profession}         onChange={set("profession")}         options={filters.professions} />
        <SelectField label="Enquête"            value={form.enquete}            onChange={set("enquete")}            options={filters.enquetes} />
        <SelectField label="Mois"               value={form.mois}               onChange={(v) => set("mois")(Number(v))}  options={filters.mois}   labelFn={(m) => MOIS_LABELS[m]} />
        <SelectField label="Année"              value={form.annee}              onChange={(v) => set("annee")(Number(v))} options={filters.annees} />
      </div>

      <RunButton loading={loading} onClick={run} label="⚡ Prédire la satisfaction" accent="#d97706" />
      {demo && <DemoBanner />}

      {/* Résultat */}
      {result && (
        <ResultWrapper>
          <SectionTitle text="📈 Résultat de la prédiction" />
          <div style={s.resultRow}>
            {/* Jauge SVG */}
            <div style={s.gaugeWrap}>
              <svg width="150" height="150" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="9" />
                <circle cx="50" cy="50" r="45" fill="none" stroke={col} strokeWidth="9"
                  strokeDasharray={`${arc} 283`} strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: "stroke-dasharray 1s ease" }}
                />
                <text x="50" y="43" textAnchor="middle" fill="#f8fafc" fontSize="20" fontWeight="bold">{score}</text>
                <text x="50" y="56" textAnchor="middle" fill="#64748b" fontSize="9">/5 pts</text>
                <text x="50" y="68" textAnchor="middle" fill={col} fontSize="9">{pct}%</text>
              </svg>
              <div style={{ fontSize: 22, letterSpacing: 4, marginTop: 6 }}>
                {[1,2,3,4,5].map((i) => (
                  <span key={i} style={{ color: i <= stars ? "#e8b14f" : "#1e293b" }}>★</span>
                ))}
              </div>
              <div style={{ color: col, fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                {score >= 4 ? "EXCELLENT" : score >= 3 ? "BON" : score >= 2 ? "MOYEN" : "FAIBLE"}
              </div>
            </div>

            {/* Détails */}
            <div style={s.detailCol}>
              <div style={{ ...s.interpretBox, borderLeftColor: col }}>
                {result.interpretation}
              </div>
              <div style={{ ...s.metricsGrid }}>
                <MetricBadge label="Score prédit"  value={`${score} / 5`}       color={col} />
                <MetricBadge label="Pourcentage"   value={`${pct}%`}            color={col} />
                <MetricBadge label="MAE"           value={result.mae}           color="#e8b14f" />
                <MetricBadge label="R²"            value={result.r2}            color="#60a5fa" />
              </div>
              <div style={s.modelTag}>
                <span style={{ color: "#a78bfa" }}>Modèle</span> {result.model}
              </div>
              <ConfidenceBar pct={parseFloat(result.confidence)} />
            </div>
          </div>
        </ResultWrapper>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTE 2 — RÉCLAMATIONS
// ─────────────────────────────────────────────────────────────────────────────
function ReclamationCard({ filters }) {
  const [form, setForm] = useState({ region: "Tunis", bureau: "Bureau Central", mois: 6, annee: 2024 });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo]       = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const run = async () => {
    setLoading(true); setResult(null); setDemo(false);
    try {
      setResult(await apiPost("/predict/reclamation", form));
    } catch {
      const prob = parseFloat((15 + Math.random() * 75).toFixed(1));
      const niv  = prob > 60 ? "ÉLEVÉ" : prob > 35 ? "MOYEN" : "FAIBLE";
      setResult({
        probabilite: prob, niveau_risque: niv,
        couleur_risque: prob > 60 ? "#ef4444" : prob > 35 ? "#f59e0b" : "#22c55e",
        volume_estime: Math.floor(prob * 1.5),
        interpretation: `Risque ${niv.toLowerCase()} (${prob}%) — ${niv === "ÉLEVÉ" ? "Surveillance immédiate recommandée." : niv === "MOYEN" ? "Maintenir le suivi qualité." : "Situation maîtrisée."}`,
        model: "Gradient Boosting Classifier", accuracy: "0.83", auc: "0.87",
        confidence: parseFloat((72 + Math.random() * 20).toFixed(1)),
      });
      setDemo(true);
    }
    setLoading(false);
  };

  const nc      = result?.couleur_risque || "#94a3b8";
  const niv     = result?.niveau_risque  || "";
  const riskIcon = niv === "ÉLEVÉ" ? "🔴" : niv === "MOYEN" ? "🟡" : niv === "FAIBLE" ? "🟢" : "";

  return (
    <div style={s.card}>
      <div style={{ ...s.cardHeader, borderLeftColor: "#ef4444" }}>
        <div style={{ ...s.cardIcon, background: "#ef444418", color: "#ef4444" }}>⚠️</div>
        <div>
          <div style={s.cardTitle}>Prédiction des Réclamations</div>
          <div style={s.cardSub}>Détecter les risques opérationnels et anticiper les plaintes</div>
        </div>
        <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, background: "#ef444412", border: "1px solid #ef444430", fontSize: 12, color: "#ef4444" }}>
          Classification GB
        </div>
      </div>

      <SectionTitle text="Paramètres de prédiction" />
      <div style={s.grid2}>
        <SelectField label="Région" value={form.region} onChange={set("region")} options={filters.regions} />
        <SelectField label="Bureau" value={form.bureau} onChange={set("bureau")} options={filters.bureaux} />
        <SelectField label="Mois"   value={form.mois}   onChange={(v) => set("mois")(Number(v))}  options={filters.mois}   labelFn={(m) => MOIS_LABELS[m]} />
        <SelectField label="Année"  value={form.annee}  onChange={(v) => set("annee")(Number(v))} options={filters.annees} />
      </div>

      <RunButton loading={loading} onClick={run} label="🔍 Analyser le risque" accent="#dc2626" />
      {demo && <DemoBanner />}

      {result && (
        <ResultWrapper>
          <SectionTitle text="📋 Résultat de l'analyse de risque" />

          {/* Badge niveau + KPIs */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
            <div style={{ padding: "12px 26px", borderRadius: 100, fontWeight: 800, fontSize: 18, letterSpacing: 0.5, color: nc, background: `${nc}14`, border: `2px solid ${nc}` }}>
              {riskIcon} Risque {niv}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={s.kpiBlock}>
                <span style={{ color: nc, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{result.probabilite}%</span>
                <span style={s.kpiLabel}>Probabilité réclamation</span>
              </div>
              <div style={{ width: 1, height: 44, background: "#1e293b" }} />
              <div style={s.kpiBlock}>
                <span style={{ color: "#e8b14f", fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{result.volume_estime}</span>
                <span style={s.kpiLabel}>Volume estimé</span>
              </div>
            </div>
          </div>

          {/* Barre gradient risque */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#22c55e", fontSize: 12 }}>Faible (0%)</span>
              <span style={{ color: "#f59e0b", fontSize: 12 }}>Moyen (35–60%)</span>
              <span style={{ color: "#ef4444", fontSize: 12 }}>Élevé (60%+)</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "linear-gradient(90deg,#22c55e 0%,#f59e0b 50%,#ef4444 100%)", position: "relative" }}>
              <div style={{
                position: "absolute", top: "50%", left: `${result.probabilite}%`,
                transform: "translate(-50%,-50%)",
                width: 20, height: 20, borderRadius: "50%",
                background: "#0f172a", border: `3px solid ${nc}`,
                boxShadow: `0 0 8px ${nc}`,
                transition: "left 1s ease",
              }} />
            </div>
          </div>

          <div style={{ ...s.interpretBox, borderLeftColor: nc }}>{result.interpretation}</div>
          <div style={s.metricsGrid}>
            <MetricBadge label="Accuracy" value={result.accuracy} color="#e8b14f" />
            <MetricBadge label="AUC-ROC"  value={result.auc}      color="#60a5fa" />
          </div>
          <div style={s.modelTag}><span style={{ color: "#a78bfa" }}>Modèle</span> {result.model}</div>
          <ConfidenceBar pct={parseFloat(result.confidence)} />
        </ResultWrapper>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTE 3 — FIDÉLITÉ
// ─────────────────────────────────────────────────────────────────────────────
function FideliteCard({ filters }) {
  const [form, setForm] = useState({
    region: "Tunis", bureau: "Bureau Central", genre: "Masculin",
    tranche_age: "26-35", niveau_instruction: "Universitaire",
    profession: "Fonctionnaire", enquete: "Enquête Guichet 2024",
    mois: 6, annee: 2024,
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo]       = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const run = async () => {
    setLoading(true); setResult(null); setDemo(false);
    try {
      setResult(await apiPost("/predict/fidelite", form));
    } catch {
      const prob = parseFloat((30 + Math.random() * 60).toFixed(1));
      setResult({
        fidele: prob >= 50, probabilite: prob,
        resultat: prob >= 50 ? "OUI — Client fidèle" : "NON — Risque de perte",
        interpretation: prob >= 70 ? "Forte probabilité de revisite — Client très satisfait." : prob >= 50 ? "Probabilité modérée — Actions de fidélisation conseillées." : "Faible probabilité — Intervention nécessaire.",
        model: "Random Forest Classifier", accuracy: "0.81", auc: "0.85",
        confidence: parseFloat((70 + Math.random() * 22).toFixed(1)),
      });
      setDemo(true);
    }
    setLoading(false);
  };

  const fidele = result?.fidele;
  const prob   = result?.probabilite ?? 0;
  const fc     = fidele ? "#22c55e" : "#ef4444";

  return (
    <div style={s.card}>
      <div style={{ ...s.cardHeader, borderLeftColor: "#60a5fa" }}>
        <div style={{ ...s.cardIcon, background: "#60a5fa18", color: "#60a5fa" }}>🎯</div>
        <div>
          <div style={s.cardTitle}>Prédiction de la Fidélité / Revisite</div>
          <div style={s.cardSub}>Mesurer la confiance client et le risque de perte</div>
        </div>
        <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, background: "#60a5fa12", border: "1px solid #60a5fa30", fontSize: 12, color: "#60a5fa" }}>
          Classification RF
        </div>
      </div>

      <SectionTitle text="Paramètres de prédiction" />
      <div style={s.grid3}>
        <SelectField label="Région"             value={form.region}             onChange={set("region")}             options={filters.regions} />
        <SelectField label="Bureau de poste"    value={form.bureau}             onChange={set("bureau")}             options={filters.bureaux} />
        <SelectField label="Genre"              value={form.genre}              onChange={set("genre")}              options={filters.genres} />
        <SelectField label="Tranche d'âge"      value={form.tranche_age}        onChange={set("tranche_age")}        options={filters.tranches} />
        <SelectField label="Niveau instruction" value={form.niveau_instruction} onChange={set("niveau_instruction")} options={filters.niveaux} />
        <SelectField label="Profession"         value={form.profession}         onChange={set("profession")}         options={filters.professions} />
        <SelectField label="Enquête"            value={form.enquete}            onChange={set("enquete")}            options={filters.enquetes} />
        <SelectField label="Mois"               value={form.mois}               onChange={(v) => set("mois")(Number(v))}  options={filters.mois}   labelFn={(m) => MOIS_LABELS[m]} />
        <SelectField label="Année"              value={form.annee}              onChange={(v) => set("annee")(Number(v))} options={filters.annees} />
      </div>

      <RunButton loading={loading} onClick={run} label="🎯 Prédire la fidélité" accent="#2563eb" />
      {demo && <DemoBanner />}

      {result && (
        <ResultWrapper>
          <SectionTitle text="🔍 Résultat de prédiction de fidélité" />
          <div style={s.resultRow}>

            {/* Cercle verdict */}
            <div style={s.gaugeWrap}>
              <div style={{
                width: 130, height: 130, borderRadius: "50%",
                background: `${fc}10`, border: `4px solid ${fc}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 24px ${fc}25`,
              }}>
                <span style={{ fontSize: 42 }}>{fidele ? "✅" : "❌"}</span>
                <span style={{ color: fc, fontWeight: 800, fontSize: 11, marginTop: 4 }}>
                  {fidele ? "FIDÈLE" : "À RISQUE"}
                </span>
              </div>
              <div style={{ color: fc, fontWeight: 800, fontSize: 24, marginTop: 10 }}>{prob}%</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>probabilité revisite</div>
            </div>

            <div style={s.detailCol}>
              {/* Verdict */}
              <div style={{
                fontWeight: 800, fontSize: 17, padding: "12px 18px", borderRadius: 10,
                border: `2px solid ${fc}`, background: "#0f172a", color: fc, marginBottom: 16,
              }}>
                {result.resultat}
              </div>

              {/* Slider fidélité */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#ef4444", fontSize: 11 }}>Infidèle (0%)</span>
                  <span style={{ color: "#22c55e", fontSize: 11 }}>Très fidèle (100%)</span>
                </div>
                <div style={{ position: "relative", height: 12, borderRadius: 6, background: "linear-gradient(90deg,#ef4444,#f59e0b 50%,#22c55e)" }}>
                  <div style={{
                    position: "absolute", top: "50%", left: `${prob}%`,
                    transform: "translate(-50%,-50%)",
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#0f172a", border: `3px solid ${fc}`,
                    boxShadow: `0 0 10px ${fc}`,
                    transition: "left 1s ease",
                  }} />
                </div>
              </div>

              <div style={{ ...s.interpretBox, borderLeftColor: fc }}>{result.interpretation}</div>
              <div style={s.metricsGrid}>
                <MetricBadge label="Accuracy" value={result.accuracy} color="#e8b14f" />
                <MetricBadge label="AUC-ROC"  value={result.auc}      color="#60a5fa" />
              </div>
              <div style={s.modelTag}><span style={{ color: "#a78bfa" }}>Modèle</span> {result.model}</div>
              <ConfidenceBar pct={parseFloat(result.confidence)} />
            </div>
          </div>
        </ResultWrapper>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE ML — COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function MLPage() {
  const [filters,   setFilters]   = useState(DEMO_FILTERS);
  const [backendOk, setBackendOk] = useState(null);
  const [training,  setTraining]  = useState(false);
  const [trainMsg,  setTrainMsg]  = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/filters`)
      .then((r) => r.json())
      .then((d) => { setFilters(d); setBackendOk(true); })
      .catch(() => setBackendOk(false));
  }, []);

  const handleTrain = async () => {
    if (!backendOk) return;
    setTraining(true); setTrainMsg(null);
    try {
      await fetch(`${API_BASE}/train`, { method: "POST" });
      setTrainMsg({ ok: true, text: "✅ Modèles ré-entraînés avec succès." });
    } catch {
      setTrainMsg({ ok: false, text: "❌ Impossible de contacter le backend Flask." });
    }
    setTraining(false);
  };

  return (
    <div style={s.page}>

      {/* ── EN-TÊTE ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={{ fontSize: 44 }}>🤖</div>
          <div>
            <h1 style={s.headerTitle}>Prédictions par Intelligence Artificielle</h1>
            <p style={s.headerSub}>3 modèles ML entraînés sur le Data Warehouse · La Poste Tunisienne</p>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: backendOk === null ? "#f59e0b" : backendOk ? "#22c55e" : "#ef4444",
            }} />
            <span style={{ color: "#94a3b8", fontSize: 13 }}>
              {backendOk === null ? "Connexion…" : backendOk ? "Backend connecté" : "Mode démo actif"}
            </span>
          </div>
          <button
            onClick={handleTrain}
            disabled={training || !backendOk}
            style={{ ...s.trainBtn, opacity: !backendOk ? 0.4 : 1 }}
          >
            {training ? "⏳ Entraînement…" : "🔄 Ré-entraîner les modèles"}
          </button>
        </div>
      </div>

      {/* Message entraînement */}
      {trainMsg && (
        <div style={{
          padding: "12px 20px", borderRadius: 10, marginBottom: 24,
          border: "1px solid", color: "#f8fafc", fontSize: 14, fontWeight: 600,
          background: trainMsg.ok ? "#052e16" : "#450a0a",
          borderColor: trainMsg.ok ? "#22c55e" : "#ef4444",
        }}>
          {trainMsg.text}
        </div>
      )}

      {/* ── RÉSUMÉ DES MODÈLES ──────────────────────────────────────────────── */}
      <div style={s.modelSummary}>
        {[
          { emoji: "📊", title: "Satisfaction", algo: "Random Forest Regressor", metric: "MAE · R²", color: "#e8b14f" },
          { emoji: "⚠️", title: "Réclamations", algo: "Gradient Boosting Classifier", metric: "Accuracy · AUC", color: "#ef4444" },
          { emoji: "🎯", title: "Fidélité",     algo: "Random Forest Classifier",    metric: "Accuracy · AUC", color: "#60a5fa" },
        ].map((m) => (
          <div key={m.title} style={{ ...s.modelPill, borderColor: `${m.color}30` }}>
            <span style={{ fontSize: 20 }}>{m.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{m.title}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{m.algo}</div>
              <div style={{ fontSize: 11, color: m.color, marginTop: 2 }}>{m.metric}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3 CARTES ML ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <SatisfactionCard filters={filters} />
        <ReclamationCard  filters={filters} />
        <FideliteCard     filters={filters} />
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div style={s.footer}>
        <span>La Poste Tunisienne © {new Date().getFullYear()}</span>
        <span>·</span>
        <span>Dashboard Décisionnel — Enquêtes de Satisfaction</span>
        <span>·</span>
        <span style={{ color: "#e8b14f" }}>sklearn · Flask · React · TanStack Router</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#070d1a",
    padding: "28px 24px 52px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#f8fafc",
    boxSizing: "border-box",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 16,
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    border: "1px solid #1e293b",
    borderRadius: 16, padding: "22px 28px", marginBottom: 24,
  },
  headerLeft:  { display: "flex", alignItems: "center", gap: 16 },
  headerTitle: { margin: 0, fontSize: 21, fontWeight: 800, color: "#f8fafc" },
  headerSub:   { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  headerRight: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  trainBtn: {
    padding: "8px 18px", borderRadius: 8,
    background: "#1e293b", border: "1px solid #334155",
    color: "#e2e8f0", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  modelSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14, marginBottom: 28,
  },
  modelPill: {
    display: "flex", alignItems: "flex-start", gap: 14,
    background: "#0f172a", border: "1px solid",
    borderRadius: 12, padding: "14px 18px",
  },
  card: {
    background: "linear-gradient(160deg,#0f172a 0%,#111827 100%)",
    border: "1px solid #1e293b",
    borderRadius: 18, padding: "26px 30px",
    boxShadow: "0 6px 32px #0004",
  },
  cardHeader: {
    display: "flex", alignItems: "center", gap: 16,
    paddingLeft: 16, borderLeft: "4px solid",
    marginBottom: 24,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, flexShrink: 0,
  },
  cardTitle: { color: "#f8fafc", fontWeight: 700, fontSize: 17 },
  cardSub:   { color: "#64748b", fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: "#475569", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 12, paddingBottom: 8,
    borderBottom: "1px solid #1e293b",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(185px,1fr))",
    gap: 12, marginBottom: 20,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
    gap: 12, marginBottom: 20,
  },
  formGroup:  { display: "flex", flexDirection: "column", gap: 5 },
  label: {
    color: "#64748b", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  select: {
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: 8, color: "#f1f5f9",
    padding: "8px 12px", fontSize: 13,
    outline: "none", cursor: "pointer", width: "100%",
  },
  spinner: {
    display: "inline-block", width: 15, height: 15,
    border: "2px solid #ffffff44", borderTop: "2px solid #fff",
    borderRadius: "50%", animation: "spin .7s linear infinite",
  },
  demoBanner: {
    marginTop: 10, padding: "9px 14px", borderRadius: 8,
    background: "#1c1108", border: "1px solid #92400e",
    color: "#fbbf24", fontSize: 13,
  },
  resultBox: {
    marginTop: 24, background: "#0a1120",
    border: "1px solid #1e293b", borderRadius: 14,
    padding: "22px 26px",
  },
  resultRow:  { display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" },
  gaugeWrap:  { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 150 },
  detailCol:  { flex: 1, minWidth: 240 },
  interpretBox: {
    color: "#cbd5e1", fontSize: 14, lineHeight: 1.65,
    padding: "12px 16px", background: "#1e293b",
    borderLeft: "3px solid", borderRadius: "0 8px 8px 0",
    marginBottom: 16,
  },
  metricsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))",
    gap: 10, marginBottom: 14,
  },
  badge: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: 8, padding: "8px 14px",
  },
  badgeLabel: { color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  modelTag: {
    fontSize: 12, color: "#64748b", marginBottom: 12,
    padding: "6px 12px", background: "#1e293b", borderRadius: 6,
    display: "inline-block",
  },
  confRow:   { display: "flex", alignItems: "center", gap: 10 },
  confLabel: { color: "#64748b", fontSize: 12, whiteSpace: "nowrap" },
  confTrack: { flex: 1, height: 6, background: "#1e293b", borderRadius: 4, overflow: "hidden" },
  kpiBlock:  { display: "flex", flexDirection: "column", alignItems: "center" },
  kpiLabel:  { color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 },
  footer: {
    marginTop: 48, display: "flex", gap: 10,
    flexWrap: "wrap", justifyContent: "center", alignItems: "center",
    color: "#334155", fontSize: 12,
    borderTop: "1px solid #1e293b", paddingTop: 22,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ EXPORT ROUTE — OBLIGATOIREMENT EN DERNIÈRE LIGNE
//    TanStack Router file-based routing exige que le composant
//    soit déclaré AVANT cette ligne.
// ─────────────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_app/ml")({
  component: MLPage,
});

export default MLPage;