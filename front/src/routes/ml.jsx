import { createFileRoute } from '@tanstack/react-router'

import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

export const Route = createFileRoute('/ml')({
  component: ML,
})

// ─── Couleurs Poste Tunisienne ────────────────────────────────
const COLORS = {
  primary : "#001A4D",   // bleu  Poste
  secondary: "#FFCC00",  // jaune
  success  : "#27AE60",
  warning  : "#E67E22",
  danger   : "#E74C3C",
  blue     : "#2980B9",
  light    : "#F8F9FA",
  dark     : "#2C3E50",
};

const SECTEURS = ["Tous", "Passagers", "Abonnée", "Bureau", "Colis"];
const MODELES  = ["random_forest", "decision_tree", "logistic_regression"];
const MODELES_LABELS = {
  random_forest       : "Random Forest",
  decision_tree       : "Decision Tree",
  logistic_regression : "Logistic Regression",
};

// ─── Composant Carte KPI ──────────────────────────────────────
function KpiCard({ titre, valeur, unite, couleur, icone, sous_titre }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: "20px 24px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      borderLeft: `5px solid ${couleur}`,
      flex: 1,
      minWidth: 200,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>{titre}</p>
          <p style={{ color: couleur, fontSize: 32, fontWeight: 700, margin: "6px 0 4px" }}>
            {valeur}<span style={{ fontSize: 16, fontWeight: 400 }}>{unite}</span>
          </p>
          <p style={{ color: "#aaa", fontSize: 12, margin: 0 }}>{sous_titre}</p>
        </div>
        <span style={{ fontSize: 36 }}>{icone}</span>
      </div>
    </div>
  );
}

// ─── Composant Badge résultat prédiction ─────────────────────
function Badge({ label, confiance, couleur }) {
  return (
    <div style={{
      background: couleur + "18",
      border: `1.5px solid ${couleur}`,
      borderRadius: 8,
      padding: "10px 16px",
      textAlign: "center",
    }}>
      <p style={{ margin: 0, fontWeight: 600, color: couleur, fontSize: 15 }}>{label}</p>
      <p style={{ margin: "4px 0 0", color: "#888", fontSize: 12 }}>
        Confiance : {confiance}%
      </p>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────
export default function ML() {

  // --- États ---
  const [secteur,        setSecteur]        = useState("Tous");
  const [stats,          setStats]          = useState(null);
  const [accuracy,       setAccuracy]       = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [predResult,     setPredResult]     = useState(null);
  const [predLoading,    setPredLoading]    = useState(false);
  const [activeTab,      setActiveTab]      = useState("dashboard");

  // Formulaire de prédiction
  const [form, setForm] = useState({
    secteur            : "Passagers",
    region             : "Tunis",
    tranche_age        : "25-34 ans",
    genre              : "Masculin",
    niveau_instruction : "Universitaire",
    profession         : "Salarié",
    note_attente       : 3,
    note_accueil       : 4,
    note_service       : 4,
    nb_visites         : 5,
    modele             : "random_forest",
  });

  // --- Chargement des stats au changement de secteur ---
  useEffect(() => {
    fetchStats();
    fetchAccuracy();
  }, [secteur]);

  async function fetchStats() {
    setLoading(true);
    try {
      const res  = await fetch(`http://localhost:5000/api/ml/stats?secteur=${secteur}`);
      const data = await res.json();
      if (data.success) setStats(data);
    } catch {
      // Données de démonstration si le backend n'est pas démarré
      setStats({
        taux_satisfaction  : 72.4,
        risque_reclamation : 18.6,
        intention_revisite : 68.1,
        nb_predictions     : 1000,
        mois               : ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"],
        evolution_mensuelle: [65,67,69,70,72,73,74,72,75,76,73,74],
      });
    }
    setLoading(false);
  }

  async function fetchAccuracy() {
    try {
      const res  = await fetch("http://localhost:5000/api/ml/accuracy");
      const data = await res.json();
      if (data.success) setAccuracy(data.accuracy);
    } catch {
      setAccuracy({
        satisfaction:       { logistic_regression: 75, decision_tree: 77.5, random_forest: 80 },
        risque_reclamation: { logistic_regression: 73, decision_tree: 76,   random_forest: 79.5 },
        intention_revisite: { logistic_regression: 74, decision_tree: 78,   random_forest: 81.5 },
      });
    }
  }

  async function handlePredict() {
    setPredLoading(true);
    setPredResult(null);
    try {
      const res  = await fetch("http://localhost:5000/api/ml/predict", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) setPredResult(data.resultats);
    } catch {
      // Résultat de démonstration si backend absent
      setPredResult({
        satisfaction      : { valeur: 1, label: "Satisfait ",           confiance: 82.3 },
        risque_reclamation: { valeur: 0, label: "Risque faible ",        confiance: 78.1 },
        intention_revisite: { valeur: 1, label: "Revisite probable ",    confiance: 75.6 },
      });
    }
    setPredLoading(false);
  }

  // --- Données graphiques ---
  const evolutionData = stats
    ? stats.mois.map((mois, i) => ({
        mois,
        satisfaction: stats.evolution_mensuelle[i],
      }))
    : [];

  const accuracyData = accuracy
    ? MODELES.map(m => ({
        modele         : MODELES_LABELS[m],
        satisfaction   : accuracy.satisfaction?.[m]       ?? 0,
        reclamation    : accuracy.risque_reclamation?.[m] ?? 0,
        revisite       : accuracy.intention_revisite?.[m] ?? 0,
      }))
    : [];

  const radarData = accuracy
    ? [
        { sujet: "Satisfaction",  ...Object.fromEntries(MODELES.map(m => [MODELES_LABELS[m], accuracy.satisfaction?.[m] ?? 0])) },
        { sujet: "Réclamation",   ...Object.fromEntries(MODELES.map(m => [MODELES_LABELS[m], accuracy.risque_reclamation?.[m] ?? 0])) },
        { sujet: "Revisite",      ...Object.fromEntries(MODELES.map(m => [MODELES_LABELS[m], accuracy.intention_revisite?.[m] ?? 0])) },
      ]
    : [];

  // ─── RENDU ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Segoe UI, sans-serif", background: "#001a4d", minHeight: "100vh" }}>

      {/* ── En-tête ─────────────────────────────────────────── */}
      <div style={{
        background    : "#fff",
        padding       : "24px 32px",
        color         : "#001a4d",
        display       : "flex",
        justifyContent: "space-between",
        alignItems    : "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/logovector.png"
            alt="Logo Poste Tunisienne"
            style={{
              width: 55,
              height: 55,
              objectFit: "contain",
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              Dashboard Prédictif ML — Poste Tunisienne
            </h1>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
              Prédictions 2026 · Satisfaction · Réclamation · Revisite
            </p>
          </div>
        </div>
        <span style={{ fontSize: 15, opacity: 0.8 }}>Année : 2026</span>
      </div>

      {/* ── Onglets ──────────────────────────────────────────── */}
      <div style={{
        display   : "flex",
        gap       : 4,
        padding   : "12px 32px 0",
        background: "#fff",
        boxShadow : "0 2px 6px rgba(0,0,0,0.06)",
      }}>
        {[
          { id: "dashboard",  label: " Dashboard" },
          { id: "modeles",    label: " Modèles ML" },
          { id: "prediction", label: " Prédiction" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding     : "10px 22px",
              border      : "none",
              background  : activeTab === tab.id ? COLORS.primary : "transparent",
              color       : activeTab === tab.id ? "#fff"         : "#111",
              borderRadius: "8px 8px 0 0",
              cursor      : "pointer",
              fontWeight  : activeTab === tab.id ? 700 : 400,
              fontSize    : 14,
              transition  : "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* ── Filtre par secteur ───────────────────────────── */}
        <div style={{
          display     : "flex",
          gap         : 10,
          marginBottom: 24,
          flexWrap    : "wrap",
          alignItems  : "center",
        }}>
          <span style={{ fontWeight: 600, color: "#fff" }}>Filtre secteur :</span>
          {SECTEURS.map(s => (
            <button
              key={s}
              onClick={() => setSecteur(s)}
              style={{
                padding     : "7px 18px",
                border      : `2px solid ${secteur === s ? COLORS.primary : "#111"}`,
                background  : secteur === s ? COLORS.primary : "#ffcc00",
                color       : secteur === s ? "#fff"       : "#fff",
                borderRadius: 20,
                cursor      : "pointer",
                fontWeight  : secteur === s ? 700 : 400,
                fontSize    : 13,
                transition  : "all 0.2s",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            ONGLET 1 : DASHBOARD
        ════════════════════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <div>
            {loading ? (
              <p style={{ textAlign: "center", color: "#888" }}>Chargement…</p>
            ) : stats ? (
              <>
                {/* KPI Cards */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                  <KpiCard
                    titre="Taux de Satisfaction Prédit"
                    valeur={stats.taux_satisfaction}
                    unite="%"
                    couleur={COLORS.success}
                    
                    sous_titre={`Secteur : ${secteur} · 2026`}
                  />
                  <KpiCard
                    titre="Risque de Réclamation"
                    valeur={stats.risque_reclamation}
                    unite="%"
                    couleur={COLORS.warning}
                    
                    sous_titre="Clients à risque élevé"
                  />
                  <KpiCard
                    titre="Intention de Revisite"
                    valeur={stats.intention_revisite}
                    unite="%"
                    couleur={COLORS.blue}
                    
                    sous_titre="Reviendront probablement"
                  />
                  <KpiCard
                    titre="Prédictions Effectuées"
                    valeur={stats.nb_predictions}
                    unite=""
                    couleur={COLORS.primary}
                    
                    sous_titre="Base d'entraînement ML"
                  />
                </div>

                {/* Graphique évolution mensuelle */}
                <div style={{
                  background: "#fff", borderRadius: 12,
                  padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                  marginBottom: 24,
                }}>
                  <h3 style={{ marginTop: 0, color: COLORS.dark }}>
                    Évolution mensuelle du taux de satisfaction 2026 — {secteur}
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                      <YAxis domain={[50, 90]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip formatter={v => `${v}%`} />
                      <Line
                        type="monotone"
                        dataKey="satisfaction"
                        stroke={COLORS.primary}
                        strokeWidth={3}
                        dot={{ r: 5, fill: COLORS.primary }}
                        activeDot={{ r: 7 }}
                        name="Satisfaction"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Résumé textuel */}
                <div style={{
                  background    : "#FFF3CD",
                  border        : `1px solid ${COLORS.secondary}`,
                  borderRadius  : 10,
                  padding       : "16px 20px",
                }}>
                  <h4 style={{ margin: "0 0 8px", color: "#856404" }}>
                    Analyse prédictive — Secteur {secteur}
                  </h4>
                  <p style={{ margin: 0, color: "#856404", fontSize: 14, lineHeight: 1.7 }}>
                    Pour l'année 2026, le taux de satisfaction prédit est de{" "}
                    <strong>{stats.taux_satisfaction}%</strong>. Le risque de réclamation
                    est estimé à <strong>{stats.risque_reclamation}%</strong> et{" "}
                    <strong>{stats.intention_revisite}%</strong> des clients devraient
                    revenir. Des améliorations sur le temps d'attente et l'accueil
                    permettraient d'augmenter ces indicateurs.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            ONGLET 2 : MODÈLES ML
        ════════════════════════════════════════════════════ */}
        {activeTab === "modeles" && (
          <div>
            {/* Tableau de précision */}
            <div style={{
              background: "#fff", borderRadius: 12,
              padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
              marginBottom: 24,
            }}>
              <h3 style={{ marginTop: 0, color: COLORS.dark }}>
                Précision des modèles (Accuracy %)
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: COLORS.primary, color: "#fff" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>Modèle</th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>Satisfaction</th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>Réclamation</th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>Revisite</th>
                  </tr>
                </thead>
                <tbody>
                  {accuracy && MODELES.map((m, i) => (
                    <tr key={m} style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                        {MODELES_LABELS[m]}
                      </td>
                      {["satisfaction", "risque_reclamation", "intention_revisite"].map(c => (
                        <td key={c} style={{ padding: "10px 14px", textAlign: "center" }}>
                          <span style={{
                            background  : accuracy[c]?.[m] >= 78 ? "#d4edda" : "#fff3cd",
                            color       : accuracy[c]?.[m] >= 78 ? COLORS.success : COLORS.warning,
                            padding     : "4px 12px",
                            borderRadius: 20,
                            fontWeight  : 600,
                          }}>
                            {accuracy[c]?.[m]}%
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Graphique comparatif */}
            <div style={{
              background: "#fff", borderRadius: 12,
              padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
              marginBottom: 24,
            }}>
              <h3 style={{ marginTop: 0, color: COLORS.dark }}>
                Comparaison des modèles par cible
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accuracyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="modele" tick={{ fontSize: 11 }} />
                  <YAxis domain={[60, 90]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Legend />
                  <Bar dataKey="satisfaction"  name="Satisfaction"  fill={COLORS.success}  radius={[4,4,0,0]} />
                  <Bar dataKey="reclamation"   name="Réclamation"   fill={COLORS.warning}  radius={[4,4,0,0]} />
                  <Bar dataKey="revisite"      name="Revisite"      fill={COLORS.blue}     radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar */}
            <div style={{
              background: "#fff", borderRadius: 12,
              padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            }}>
              <h3 style={{ marginTop: 0, color: COLORS.dark }}>
                🕸️ Radar de performance globale
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="sujet" tick={{ fontSize: 13 }} />
                  <PolarRadiusAxis domain={[60, 90]} tick={{ fontSize: 10 }} />
                  {MODELES.map((m, i) => (
                    <Radar
                      key={m}
                      name={MODELES_LABELS[m]}
                      dataKey={MODELES_LABELS[m]}
                      stroke={[COLORS.primary, COLORS.blue, COLORS.success][i]}
                      fill  ={[COLORS.primary, COLORS.blue, COLORS.success][i]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend />
                  <Tooltip formatter={v => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Explication des modèles */}
            <div style={{
              display      : "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap          : 16,
              marginTop    : 24,
            }}>
              {[
                {
                  nom    : "Logistic Regression",
                  
                  desc   : "Modèle statistique simple. Prédit la probabilité d'appartenance à une classe. Rapide à entraîner et facile à interpréter.",
                  usage  : "Idéal pour comprendre les facteurs de satisfaction.",
                },
                {
                  nom    : "Decision Tree",
                  
                  desc   : "Arbre de décision avec profondeur max=5. Suit des règles if/then. Très lisible et explicable.",
                  usage  : "Parfait pour expliquer les règles de risque de réclamation.",
                },
                {
                  nom    : "Random Forest",
                  
                  desc   : "Ensemble de 50 arbres de décision. Plus robuste et précis que l'arbre seul. Meilleure généralisation.",
                  usage  : "Meilleur modèle global pour les 3 prédictions.",
                },
              ].map(m => (
                <div key={m.nom} style={{
                  background  : "#fff",
                  borderRadius: 10,
                  padding     : "18px 20px",
                  boxShadow   : "0 2px 8px rgba(0,0,0,0.06)",
                  borderTop   : `4px solid ${COLORS.primary}`,
                }}>
                  <h4 style={{ margin: "0 0 8px", color: COLORS.dark }}>
                    {m.icone} {m.nom}
                  </h4>
                  <p style={{ margin: "0 0 8px", color: "#555", fontSize: 13 }}>{m.desc}</p>
                  <p style={{ margin: 0, color: COLORS.primary, fontSize: 12, fontWeight: 600 }}>
                     {m.usage}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            ONGLET 3 : PRÉDICTION INDIVIDUELLE
        ════════════════════════════════════════════════════ */}
        {activeTab === "prediction" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Formulaire */}
            <div style={{
              background: "#fff", borderRadius: 12,
              padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            }}>
              <h3 style={{ marginTop: 0, color: COLORS.dark }}>
                🔮 Prédire pour un client
              </h3>

              {/* Sélecteur de modèle */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#555" }}>
                  Modèle ML
                </label>
                <select
                  value={form.modele}
                  onChange={e => setForm({ ...form, modele: e.target.value })}
                  style={inputStyle}
                >
                  {MODELES.map(m => (
                    <option key={m} value={m}>{MODELES_LABELS[m]}</option>
                  ))}
                </select>
              </div>

              {/* Champs du formulaire */}
              {[
                { key: "secteur",             label: "Secteur",              opts: ["Passagers","Abonnée","Bureau","Colis"] },
                { key: "region",              label: "Région",               opts: ["Tunis","Sfax","Sousse","Bizerte","Nabeul","Monastir","Gabès","Gafsa","Kairouan","Médenine"] },
                { key: "tranche_age",         label: "Tranche d'âge",        opts: ["Moins de 18 ans","18-24 ans","25-34 ans","35-44 ans","45-54 ans","55 ans et plus"] },
                { key: "genre",               label: "Genre",                opts: ["Masculin","Féminin"] },
                { key: "niveau_instruction",  label: "Niveau d'instruction", opts: ["Sans instruction","Primaire","Secondaire","Universitaire","Post-universitaire"] },
                { key: "profession",          label: "Profession",           opts: ["Etudiant","Salarié","Fonctionnaire","Commerçant","Retraité","Sans emploi"] },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, color: "#555" }}>
                    {f.label}
                  </label>
                  <select
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={inputStyle}
                  >
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}

              {/* Notes (sliders) */}
              {[
                { key: "note_attente",  label: "Note d'attente"  },
                { key: "note_accueil",  label: "Note d'accueil"  },
                { key: "note_service",  label: "Note de service" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, color: "#555" }}>
                    {f.label} : <strong style={{ color: COLORS.primary }}>{form[f.key]} / 5</strong>
                  </label>
                  <input
                    type="range" min={1} max={5} step={1}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: parseInt(e.target.value) })}
                    style={{ width: "100%", accentColor: COLORS.primary }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa" }}>
                    <span>1 (Mauvais)</span><span>5 (Excellent)</span>
                  </div>
                </div>
              ))}

              {/* Nb visites */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: "#555" }}>
                  Nombre de visites antérieures
                </label>
                <input
                  type="number" min={1} max={30}
                  value={form.nb_visites}
                  onChange={e => setForm({ ...form, nb_visites: parseInt(e.target.value) })}
                  style={inputStyle}
                />
              </div>

              {/* Bouton prédire */}
              <button
                onClick={handlePredict}
                disabled={predLoading}
                style={{
                  width     : "100%",
                  padding   : "13px",
                  background: predLoading ? "#ccc" : COLORS.primary,
                  color     : "#fff",
                  border    : "none",
                  borderRadius: 8,
                  fontSize  : 15,
                  fontWeight: 700,
                  cursor    : predLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {predLoading ? "⏳ Prédiction en cours…" : "🔮 Lancer la Prédiction"}
              </button>
            </div>

            {/* Résultats */}
            <div style={{
              background: "#fff", borderRadius: 12,
              padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            }}>
              <h3 style={{ marginTop: 0, color: COLORS.dark }}>
                Résultats de la prédiction
              </h3>

              {!predResult ? (
                <div style={{
                  textAlign : "center",
                  padding   : "60px 20px",
                  color     : "#bbb",
                }}>
                  <p style={{ fontSize: 48 }}>🔮</p>
                  <p style={{ fontSize: 15 }}>
                    Remplissez le formulaire et cliquez sur<br />
                    <strong>Lancer la Prédiction</strong>
                  </p>
                </div>
              ) : (
                <div>
                  {/* Résumé du profil */}
                  <div style={{
                    background  : "#F8F9FA",
                    borderRadius: 8,
                    padding     : "12px 16px",
                    marginBottom: 20,
                    fontSize    : 13,
                    color       : "#555",
                  }}>
                    <strong>Profil analysé :</strong>{" "}
                    {form.secteur} · {form.region} · {form.tranche_age} · {form.genre}
                    <br />
                    Modèle utilisé :{" "}
                    <strong style={{ color: COLORS.primary }}>{MODELES_LABELS[form.modele]}</strong>
                  </div>

                  {/* Badges résultats */}
                  <div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
                    <div>
                      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#555", fontSize: 13 }}>
                        Satisfaction Client
                      </p>
                      <Badge
                        label    ={predResult.satisfaction.label}
                        confiance={predResult.satisfaction.confiance}
                        couleur  ={predResult.satisfaction.valeur === 1 ? COLORS.success : COLORS.danger}
                      />
                    </div>
                    <div>
                      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#555", fontSize: 13 }}>
                        Risque de Réclamation
                      </p>
                      <Badge
                        label    ={predResult.risque_reclamation.label}
                        confiance={predResult.risque_reclamation.confiance}
                        couleur  ={predResult.risque_reclamation.valeur === 1 ? COLORS.danger : COLORS.success}
                      />
                    </div>
                    <div>
                      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#555", fontSize: 13 }}>
                        Intention de Revisite
                      </p>
                      <Badge
                        label    ={predResult.intention_revisite.label}
                        confiance={predResult.intention_revisite.confiance}
                        couleur  ={predResult.intention_revisite.valeur === 1 ? COLORS.blue : COLORS.warning}
                      />
                    </div>
                  </div>

                  {/* Jauge de satisfaction */}
                  <div style={{
                    background  : "#F8F9FA",
                    borderRadius: 8,
                    padding     : "14px 16px",
                  }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: "#555" }}>
                      Score de confiance global
                    </p>
                    {[
                      { k: "satisfaction",       label: "Satisfaction",  c: COLORS.success },
                      { k: "risque_reclamation", label: "Réclamation",   c: COLORS.warning },
                      { k: "intention_revisite", label: "Revisite",      c: COLORS.blue    },
                    ].map(item => (
                      <div key={item.k} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span>{item.label}</span>
                          <span style={{ fontWeight: 600 }}>{predResult[item.k].confiance}%</span>
                        </div>
                        <div style={{ background: "#e9ecef", borderRadius: 4, height: 8 }}>
                          <div style={{
                            width      : `${predResult[item.k].confiance}%`,
                            background : item.c,
                            height     : "100%",
                            borderRadius: 4,
                            transition : "width 0.6s ease",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommandation */}
                  <div style={{
                    marginTop   : 16,
                    padding     : "12px 16px",
                    background  : "#E8F5E9",
                    borderRadius: 8,
                    borderLeft  : `4px solid ${COLORS.success}`,
                  }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#2E7D32" }}>
                      <strong>Recommandation :</strong>{" "}
                      {predResult.risque_reclamation.valeur === 1
                        ? "Ce client présente un risque élevé. Envisager un suivi personnalisé et améliorer le temps d'attente."
                        : "Profil satisfaisant. Maintenir la qualité du service pour fidéliser ce client."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Style commun pour les champs de formulaire ───────────────
const inputStyle = {
  width       : "100%",
  padding     : "8px 10px",
  border      : "1.5px solid #ddd",
  borderRadius: 6,
  fontSize    : 13,
  marginTop   : 4,
  outline     : "none",
  background  : "#FAFAFA",
  boxSizing   : "border-box",
};
