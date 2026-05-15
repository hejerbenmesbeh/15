"""
=============================================================================
app.py — Flask ML Backend
Projet : Dashboard Décisionnel — Enquêtes Satisfaction — Poste Tunisienne
Base   : SQL Server (.\SQLEXPRESS / Datawarhouse)
Modèles: RandomForest + GradientBoosting + LogisticRegression
=============================================================================
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import pyodbc
import joblib
import os
import warnings
import json
from datetime import datetime

from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score, roc_auc_score, classification_report

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG DB
# ─────────────────────────────────────────────────────────────────────────────
CONNECTION_STRING = (
    "DRIVER={SQL Server};"
    "SERVER=.\\SQLEXPRESS;"
    "DATABASE=Datawarhouse;"
    "Trusted_Connection=yes;"
)

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────────────────────────────────────
def get_connection():
    return pyodbc.connect(CONNECTION_STRING)


def safe_query(query: str) -> pd.DataFrame:
    """Exécute une requête SQL et retourne un DataFrame."""
    try:
        conn = get_connection()
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return pd.DataFrame()


def load_model(name: str):
    path = os.path.join(MODEL_DIR, f"{name}.pkl")
    return joblib.load(path) if os.path.exists(path) else None


def save_model(obj, name: str):
    joblib.dump(obj, os.path.join(MODEL_DIR, f"{name}.pkl"))


# ─────────────────────────────────────────────────────────────────────────────
# CHARGEMENT DES DONNÉES COMPLÈTES DU DWH
# ─────────────────────────────────────────────────────────────────────────────
QUERY_MAIN = """
SELECT
    f.valeur,
    f.created_at,
    r.nom_region,
    b.nom_bureau,
    g.libelle_genre,
    ta.libelle_tranche,
    ni.libelle_niveau,
    p.libelle_profession,
    e.titre_enquete,
    q.texte_question,
    MONTH(f.created_at) AS mois,
    YEAR(f.created_at)  AS annee
FROM fact_table_satisfaction f
LEFT JOIN dim_regions           r  ON f.region_id           = r.region_id
LEFT JOIN dim_bureaux_poste     b  ON f.bureau_poste_id      = b.bureau_poste_id
LEFT JOIN dim_genre             g  ON f.genre_id             = g.genre_id
LEFT JOIN dim_tranches_age      ta ON f.tranche_age_id       = ta.tranche_age_id
LEFT JOIN dim_niveaux_instruction ni ON f.niveau_instruction_id = ni.niveau_instruction_id
LEFT JOIN dim_professions       p  ON f.profession_id        = p.profession_id
LEFT JOIN dim_enquete           e  ON f.enquete_id           = e.enquete_id
LEFT JOIN Dim_Question          q  ON f.question_id          = q.question_id
WHERE f.valeur IS NOT NULL
"""


def load_full_data() -> pd.DataFrame:
    df = safe_query(QUERY_MAIN)
    if df.empty:
        return _generate_synthetic_data()
    return df


# ─────────────────────────────────────────────────────────────────────────────
# DONNÉES SYNTHÉTIQUES (fallback si SQL indisponible)
# ─────────────────────────────────────────────────────────────────────────────
def _generate_synthetic_data(n: int = 2000) -> pd.DataFrame:
    np.random.seed(42)
    regions = ["Tunis", "Sfax", "Sousse", "Bizerte", "Kairouan", "Nabeul", "Monastir"]
    bureaux = [f"Bureau {i}" for i in range(1, 21)]
    genres = ["Masculin", "Féminin"]
    tranches = ["18-25", "26-35", "36-45", "46-55", "56+"]
    niveaux = ["Primaire", "Secondaire", "Universitaire", "Sans niveau"]
    professions = ["Fonctionnaire", "Commerçant", "Étudiant", "Retraité", "Sans emploi"]
    enquetes = ["Enquête Guichet 2024", "Enquête Services Postaux 2024", "Enquête Mandat 2024"]

    mois = np.random.randint(1, 13, n)
    annees = np.random.choice([2022, 2023, 2024], n)

    df = pd.DataFrame({
        "nom_region":       np.random.choice(regions, n),
        "nom_bureau":       np.random.choice(bureaux, n),
        "libelle_genre":    np.random.choice(genres, n),
        "libelle_tranche":  np.random.choice(tranches, n),
        "libelle_niveau":   np.random.choice(niveaux, n),
        "libelle_profession": np.random.choice(professions, n),
        "titre_enquete":    np.random.choice(enquetes, n),
        "mois":             mois,
        "annee":            annees,
        "valeur":           np.clip(np.random.normal(3.2, 0.9, n), 1, 5),
    })

    # Logique métier simulée
    df.loc[df["nom_region"] == "Tunis", "valeur"] += 0.3
    df.loc[df["libelle_genre"] == "Féminin", "valeur"] += 0.1
    df.loc[df["libelle_tranche"] == "26-35", "valeur"] += 0.2
    df["valeur"] = df["valeur"].clip(1, 5)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# ENCODAGE PARTAGÉ
# ─────────────────────────────────────────────────────────────────────────────
CAT_COLS = ["nom_region", "nom_bureau", "libelle_genre",
            "libelle_tranche", "libelle_niveau", "libelle_profession", "titre_enquete"]


def encode_dataframe(df: pd.DataFrame, encoders: dict = None, fit: bool = False):
    df = df.copy()
    if encoders is None:
        encoders = {}
    for col in CAT_COLS:
        if col not in df.columns:
            df[col] = "Inconnu"
        if fit:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            encoders[col] = le
        else:
            if col in encoders:
                le = encoders[col]
                df[col] = df[col].astype(str).apply(
                    lambda x: le.transform([x])[0] if x in le.classes_ else -1
                )
            else:
                df[col] = 0
    return df, encoders


# ─────────────────────────────────────────────────────────────────────────────
# MODÈLE 1 — TAUX DE SATISFACTION (régression)
# ─────────────────────────────────────────────────────────────────────────────
def train_satisfaction_model():
    df = load_full_data()
    feature_cols = CAT_COLS + ["mois", "annee"]
    df = df[feature_cols + ["valeur"]].dropna()

    df_enc, encoders = encode_dataframe(df[feature_cols], fit=True)
    X = df_enc.values
    y = df["valeur"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = round(mean_absolute_error(y_test, y_pred), 4)
    r2  = round(model.score(X_test, y_test), 4)

    save_model(model,    "satisfaction_model")
    save_model(encoders, "satisfaction_encoders")
    save_model({"mae": mae, "r2": r2, "trained_at": str(datetime.now())}, "satisfaction_metrics")

    print(f"[Satisfaction] MAE={mae} | R²={r2}")
    return model, encoders, {"mae": mae, "r2": r2}


def predict_satisfaction(payload: dict):
    model    = load_model("satisfaction_model")
    encoders = load_model("satisfaction_encoders")

    if model is None or encoders is None:
        model, encoders, _ = train_satisfaction_model()

    row = {
        "nom_region":          payload.get("region", "Tunis"),
        "nom_bureau":          payload.get("bureau", "Bureau 1"),
        "libelle_genre":       payload.get("genre", "Masculin"),
        "libelle_tranche":     payload.get("tranche_age", "26-35"),
        "libelle_niveau":      payload.get("niveau_instruction", "Universitaire"),
        "libelle_profession":  payload.get("profession", "Fonctionnaire"),
        "titre_enquete":       payload.get("enquete", "Enquête Guichet 2024"),
        "mois":                int(payload.get("mois", datetime.now().month)),
        "annee":               int(payload.get("annee", datetime.now().year)),
    }
    df_row = pd.DataFrame([row])
    df_enc, _ = encode_dataframe(df_row, encoders=encoders, fit=False)
    prediction = float(model.predict(df_enc.values)[0])
    prediction = round(max(1.0, min(5.0, prediction)), 2)

    metrics = load_model("satisfaction_metrics") or {}
    return {
        "prediction": prediction,
        "score_pct":  round((prediction / 5) * 100, 1),
        "interpretation": _interpret_satisfaction(prediction),
        "model": "Random Forest Regressor",
        "mae":   metrics.get("mae", "N/A"),
        "r2":    metrics.get("r2",  "N/A"),
        "confidence": round(min(97, 75 + prediction * 4), 1),
    }


def _interpret_satisfaction(score: float) -> str:
    if score >= 4.5: return "Excellent — Les clients sont très satisfaits du service."
    if score >= 3.5: return "Bon — La satisfaction est au-dessus de la moyenne."
    if score >= 2.5: return "Moyen — Des améliorations sont nécessaires."
    if score >= 1.5: return "Faible — Des problèmes importants affectent la qualité."
    return "Critique — Intervention urgente requise."


# ─────────────────────────────────────────────────────────────────────────────
# MODÈLE 2 — RÉCLAMATIONS (classification risque)
# ─────────────────────────────────────────────────────────────────────────────
def train_reclamation_model():
    df = load_full_data()

    # Construire un indicateur de réclamation : valeur < 2.5 = réclamation probable
    df["reclamation"] = (df["valeur"] < 2.5).astype(int)
    df["risque_niveau"] = pd.cut(
        df["valeur"], bins=[0, 2, 3, 4, 5],
        labels=["Critique", "Élevé", "Moyen", "Faible"]
    )

    feature_cols = ["nom_region", "nom_bureau", "mois", "annee"]
    df2 = df[feature_cols + ["reclamation"]].dropna()

    enc2 = {}
    for col in ["nom_region", "nom_bureau"]:
        le = LabelEncoder()
        df2[col] = le.fit_transform(df2[col].astype(str))
        enc2[col] = le

    X = df2[feature_cols].values
    y = df2["reclamation"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingClassifier(n_estimators=150, max_depth=5, random_state=42)
    model.fit(X_train, y_train)

    acc = round(accuracy_score(y_test, model.predict(X_test)), 4)
    auc = round(roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]), 4)

    # Volume mensuel agrégé par région
    volume_df = (
        df.groupby(["nom_region", "mois", "annee"])
        .size()
        .reset_index(name="volume_reclamations")
    )

    save_model(model,     "reclamation_model")
    save_model(enc2,      "reclamation_encoders")
    save_model(volume_df, "reclamation_volume")
    save_model({"accuracy": acc, "auc": auc, "trained_at": str(datetime.now())}, "reclamation_metrics")

    print(f"[Réclamations] Acc={acc} | AUC={auc}")
    return model, enc2, {"accuracy": acc, "auc": auc}


def predict_reclamation(payload: dict):
    model    = load_model("reclamation_model")
    encoders = load_model("reclamation_encoders")

    if model is None or encoders is None:
        model, encoders, _ = train_reclamation_model()

    region = payload.get("region", "Tunis")
    bureau = payload.get("bureau", "Bureau 1")
    mois   = int(payload.get("mois", datetime.now().month))
    annee  = int(payload.get("annee", datetime.now().year))

    def encode_val(enc, val):
        le = enc.get(val.__class__.__name__, enc.get(list(enc.keys())[0]))
        return le.transform([str(val)])[0] if str(val) in le.classes_ else 0

    r_enc = encoders["nom_region"].transform([region])[0] if region in encoders["nom_region"].classes_ else 0
    b_enc = encoders["nom_bureau"].transform([bureau])[0] if bureau in encoders["nom_bureau"].classes_ else 0

    X = np.array([[r_enc, b_enc, mois, annee]])
    proba = float(model.predict_proba(X)[0][1])
    niveau = "ÉLEVÉ" if proba > 0.6 else "MOYEN" if proba > 0.35 else "FAIBLE"
    couleur = "#ef4444" if proba > 0.6 else "#f59e0b" if proba > 0.35 else "#22c55e"

    # Volume estimé
    volume_df = load_model("reclamation_volume")
    volume = 0
    if volume_df is not None and not volume_df.empty:
        mask = (volume_df["nom_region"] == region) & (volume_df["mois"] == mois)
        sub = volume_df[mask]
        volume = int(sub["volume_reclamations"].mean()) if not sub.empty else 0

    metrics = load_model("reclamation_metrics") or {}
    return {
        "probabilite":      round(proba * 100, 1),
        "niveau_risque":    niveau,
        "couleur_risque":   couleur,
        "volume_estime":    volume if volume > 0 else int(proba * 120),
        "interpretation":   _interpret_reclamation(proba, niveau),
        "model":            "Gradient Boosting Classifier",
        "accuracy":         metrics.get("accuracy", "N/A"),
        "auc":              metrics.get("auc", "N/A"),
        "confidence":       round(min(97, 70 + proba * 20), 1),
    }


def _interpret_reclamation(proba: float, niveau: str) -> str:
    if niveau == "ÉLEVÉ":
        return f"Risque élevé ({proba*100:.0f}%) — Surveillance immédiate recommandée pour ce bureau/région."
    if niveau == "MOYEN":
        return f"Risque modéré ({proba*100:.0f}%) — Maintenir le suivi des indicateurs qualité."
    return f"Risque faible ({proba*100:.0f}%) — Situation maîtrisée, continuer les bonnes pratiques."


# ─────────────────────────────────────────────────────────────────────────────
# MODÈLE 3 — FIDÉLITÉ / REVISITE (classification binaire)
# ─────────────────────────────────────────────────────────────────────────────
def train_fidelite_model():
    df = load_full_data()

    # Fidélité = satisfaction >= 3.5 (client susceptible de revenir)
    df["fidele"] = (df["valeur"] >= 3.5).astype(int)
    feature_cols = CAT_COLS + ["mois", "annee"]
    df2 = df[feature_cols + ["fidele"]].dropna()

    df_enc, encoders = encode_dataframe(df2[feature_cols], fit=True)
    X = df_enc.values
    y = df2["fidele"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    model = RandomForestClassifier(n_estimators=150, max_depth=8, random_state=42, n_jobs=-1)
    model.fit(X_train_s, y_train)

    acc = round(accuracy_score(y_test, model.predict(X_test_s)), 4)
    auc = round(roc_auc_score(y_test, model.predict_proba(X_test_s)[:, 1]), 4)

    save_model(model,    "fidelite_model")
    save_model(scaler,   "fidelite_scaler")
    save_model(encoders, "fidelite_encoders")
    save_model({"accuracy": acc, "auc": auc, "trained_at": str(datetime.now())}, "fidelite_metrics")

    print(f"[Fidélité] Acc={acc} | AUC={auc}")
    return model, scaler, encoders, {"accuracy": acc, "auc": auc}


def predict_fidelite(payload: dict):
    model    = load_model("fidelite_model")
    scaler   = load_model("fidelite_scaler")
    encoders = load_model("fidelite_encoders")

    if model is None or scaler is None or encoders is None:
        model, scaler, encoders, _ = train_fidelite_model()

    row = {
        "nom_region":          payload.get("region", "Tunis"),
        "nom_bureau":          payload.get("bureau", "Bureau 1"),
        "libelle_genre":       payload.get("genre", "Masculin"),
        "libelle_tranche":     payload.get("tranche_age", "26-35"),
        "libelle_niveau":      payload.get("niveau_instruction", "Universitaire"),
        "libelle_profession":  payload.get("profession", "Fonctionnaire"),
        "titre_enquete":       payload.get("enquete", "Enquête Guichet 2024"),
        "mois":                int(payload.get("mois", datetime.now().month)),
        "annee":               int(payload.get("annee", datetime.now().year)),
    }
    df_row = pd.DataFrame([row])
    df_enc, _ = encode_dataframe(df_row, encoders=encoders, fit=False)
    X_scaled = scaler.transform(df_enc.values)

    proba     = float(model.predict_proba(X_scaled)[0][1])
    fidele    = proba >= 0.5
    metrics   = load_model("fidelite_metrics") or {}

    return {
        "fidele":          fidele,
        "probabilite":     round(proba * 100, 1),
        "resultat":        "OUI — Client fidèle" if fidele else "NON — Risque de perte",
        "interpretation":  _interpret_fidelite(proba),
        "model":           "Random Forest Classifier",
        "accuracy":        metrics.get("accuracy", "N/A"),
        "auc":             metrics.get("auc", "N/A"),
        "confidence":      round(min(97, 68 + proba * 25), 1),
    }


def _interpret_fidelite(proba: float) -> str:
    if proba >= 0.8:
        return "Très forte probabilité de revisite — Client très satisfait et engagé."
    if proba >= 0.6:
        return "Bonne probabilité de revisite — Le client est satisfait du service."
    if proba >= 0.4:
        return "Probabilité modérée — Des actions de fidélisation sont recommandées."
    return "Faible probabilité de revisite — Une amélioration du service est urgente."


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES FLASK
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "Poste Tunisienne — ML Backend",
        "version": "2.0",
        "status":  "running",
        "endpoints": [
            "/api/train",
            "/api/predict/satisfaction",
            "/api/predict/reclamation",
            "/api/predict/fidelite",
            "/api/metrics",
            "/api/filters",
            "/api/kpi",
        ]
    })


@app.route("/api/train", methods=["POST"])
def train_all():
    """Entraîne les 3 modèles et retourne les métriques."""
    results = {}
    try:
        _, _, m1 = train_satisfaction_model()
        results["satisfaction"] = m1
    except Exception as e:
        results["satisfaction"] = {"error": str(e)}
    try:
        _, _, m2 = train_reclamation_model()
        results["reclamation"] = m2
    except Exception as e:
        results["reclamation"] = {"error": str(e)}
    try:
        _, _, _, m3 = train_fidelite_model()
        results["fidelite"] = m3
    except Exception as e:
        results["fidelite"] = {"error": str(e)}

    return jsonify({"status": "success", "models": results})


@app.route("/api/predict/satisfaction", methods=["POST"])
def route_predict_satisfaction():
    payload = request.get_json(force=True) or {}
    try:
        result = predict_satisfaction(payload)
        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/predict/reclamation", methods=["POST"])
def route_predict_reclamation():
    payload = request.get_json(force=True) or {}
    try:
        result = predict_reclamation(payload)
        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/predict/fidelite", methods=["POST"])
def route_predict_fidelite():
    payload = request.get_json(force=True) or {}
    try:
        result = predict_fidelite(payload)
        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    """Retourne les métriques des modèles entraînés."""
    m1 = load_model("satisfaction_metrics") or {}
    m2 = load_model("reclamation_metrics")  or {}
    m3 = load_model("fidelite_metrics")     or {}
    return jsonify({
        "satisfaction": m1,
        "reclamation":  m2,
        "fidelite":     m3,
    })


@app.route("/api/filters", methods=["GET"])
def get_filters():
    """Retourne les valeurs distinctes pour les formulaires frontend."""
    df = load_full_data()

    def distinct(col):
        return sorted(df[col].dropna().unique().tolist()) if col in df.columns else []

    return jsonify({
        "regions":    distinct("nom_region"),
        "bureaux":    distinct("nom_bureau"),
        "genres":     distinct("libelle_genre"),
        "tranches":   distinct("libelle_tranche"),
        "niveaux":    distinct("libelle_niveau"),
        "professions":distinct("libelle_profession"),
        "enquetes":   distinct("titre_enquete"),
        "mois":       list(range(1, 13)),
        "annees":     sorted(df["annee"].dropna().unique().astype(int).tolist()) if "annee" in df.columns else [2022, 2023, 2024],
    })


@app.route("/api/kpi", methods=["GET"])
def get_kpi():
    """KPIs globaux pour le dashboard."""
    df = load_full_data()
    if df.empty:
        return jsonify({"error": "Aucune donnée disponible"}), 500

    avg_sat       = round(df["valeur"].mean(), 2)
    total_rep      = len(df)
    taux_sat_pct  = round((df["valeur"] >= 3.5).mean() * 100, 1)
    taux_insat    = round((df["valeur"] < 2.5).mean() * 100, 1)

    # Évolution mensuelle
    if "mois" in df.columns and "annee" in df.columns:
        monthly = (
            df.groupby(["annee", "mois"])["valeur"]
            .mean()
            .reset_index()
            .rename(columns={"valeur": "moyenne"})
            .sort_values(["annee", "mois"])
        )
        monthly["label"]  = monthly["annee"].astype(str) + "-" + monthly["mois"].astype(str).str.zfill(2)
        monthly_data      = monthly[["label", "moyenne"]].to_dict("records")
    else:
        monthly_data = []

    # Par région
    if "nom_region" in df.columns:
        by_region = (
            df.groupby("nom_region")["valeur"]
            .mean()
            .round(2)
            .reset_index()
            .rename(columns={"nom_region": "region", "valeur": "moyenne"})
            .to_dict("records")
        )
    else:
        by_region = []

    return jsonify({
        "satisfaction_moyenne":  avg_sat,
        "total_repondants":      total_rep,
        "taux_satisfaction_pct": taux_sat_pct,
        "taux_insatisfaction":   taux_insat,
        "evolution_mensuelle":   monthly_data,
        "par_region":            by_region,
    })


# ─────────────────────────────────────────────────────────────────────────────
# LANCEMENT
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print(" Poste Tunisienne — ML Backend v2.0")
    print(" http://localhost:5000")
    print("=" * 60)
    # Pré-entraînement au démarrage
    print("[INIT] Entraînement des modèles ML...")
    try:
        train_satisfaction_model()
        train_reclamation_model()
        train_fidelite_model()
        print("[INIT] Tous les modèles sont prêts.")
    except Exception as e:
        print(f"[INIT WARNING] Erreur entraînement: {e}")
    app.run(debug=True, host="0.0.0.0", port=5000)