"""
=============================================================================
app.py — Flask ML Backend
Projet : Dashboard Décisionnel — Enquêtes Satisfaction — Poste Tunisienne
Base   : SQL Server (.\SQLEXPRESS / qualite)
=============================================================================
Prédictions exposées :
  1. Taux de satisfaction  → anticiper la qualité de service
  2. Taux de réclamations  → détecter les problèmes opérationnels
  3. Taux de revisite      → mesurer la confiance et la fidélisation
=============================================================================
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import warnings
import os
import json
from datetime import datetime

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error

try:
    from xgboost import XGBRegressor
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
DB_CONFIG = {
    "server":   r".\SQLEXPRESS",
    "database": "qualite",
    "driver":   "ODBC Driver 17 for SQL Server",
}

os.makedirs("models_cache", exist_ok=True)
os.makedirs("exports",      exist_ok=True)

# Cache en mémoire (modèles + données)
_CACHE = {
    "trained":    False,
    "trained_at": None,
    "models":     {},        # {target: {name, model, scaler, encoder_maps}}
    "metrics":    {},        # {target: {LinearRegression: {...}, RandomForest: {...}, ...}}
    "best":       {},        # {target: model_name}
    "predictions":{},        # {target: DataFrame}
    "feature_imp":{},        # {target: [{feature, importance}]}
    "hist_monthly":[],       # KPI historiques agrégés mensuellement
}

SEED    = 42
TARGETS = ["taux_satisfaction", "taux_reclamation", "taux_revisite"]

# ─────────────────────────────────────────────────────────────────────────────
# CONNEXION SQL SERVER  (fallback → données simulées)
# ─────────────────────────────────────────────────────────────────────────────

def get_connection():
    import pyodbc
    conn_str = (
        f"DRIVER={{{DB_CONFIG['driver']}}};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
        "Trusted_Connection=yes;"
    )
    return pyodbc.connect(conn_str, timeout=15)


def load_data_from_sql() -> pd.DataFrame:
    """
    Extrait et pivote les réponses de fact_table_satisfaction.
    Les 'valeurs' textuelles sont mappées vers des scores numériques selon
    le type de question (satisfaction, réclamation, revisite, NPS, confiance).
    """
    query = """
    SELECT
        f.client_id,
        YEAR(f.created_at)  AS annee,
        MONTH(f.created_at) AS mois,
        r.nom_region        AS region,
        b.nom_bureau        AS bureau_poste,
        e.type_enquete,
        g.genre,
        t.tranche_age,
        n.niveau_instruction,
        p.profession,
        q.question_id,
        q.libelle_question,
        q.Secteur           AS secteur,
        f.valeur
    FROM fact_table_satisfaction f
    JOIN dim_regions              r ON f.region_id              = r.id_region
    JOIN dim_bureaux_poste        b ON f.bureau_poste_id        = b.id_bureau_poste
    JOIN dim_enquete              e ON f.enquete_id             = e.id_enquete
    JOIN dim_genre                g ON f.genre_id               = g.id_genre
    JOIN dim_tranches_age         t ON f.tranche_age_id         = t.id_tranche_age
    JOIN dim_niveaux_instruction  n ON f.niveau_instruction_id  = n.id_niveau_instruction
    JOIN dim_professions          p ON f.profession_id          = p.id_profession
    JOIN Dim_Question             q ON f.question_id            = q.question_id
    WHERE YEAR(f.created_at) BETWEEN 2023 AND 2025
    """
    conn = get_connection()
    df   = pd.read_sql(query, conn)
    conn.close()
    print(f"✅ SQL chargé : {len(df)} réponses brutes.")
    return df


def _map_value_to_score(valeur: str) -> float | None:
    """
    Traduit une réponse textuelle en score numérique 0–100.
    """
    v = str(valeur).strip().lower()

    # ── Satisfaction numérique directe (1–5 ou 1–10)
    try:
        n = float(v)
        if 1 <= n <= 5:  return (n - 1) / 4 * 100
        if 1 <= n <= 10: return (n - 1) / 9 * 100
        if 0 <= n <= 100:return n
    except ValueError:
        pass

    # ── Satisfaction verbale
    sat_map = {
        "très satisfait": 95, "très bien": 95, "excellent": 95,
        "satisfait": 75, "bien": 75, "bon": 75,
        "acceptable": 55, "moyen": 55, "passable": 55,
        "insatisfait": 30, "mauvais": 30, "pas bien": 30,
        "très insatisfait": 10, "très mauvais": 10,
    }
    for k, score in sat_map.items():
        if k in v:
            return float(score)

    # ── NPS / recommandation
    nps_map = {
        "sûrement oui": 95, "certainement oui": 95, "absolument": 95,
        "oui": 75, "probablement oui": 70,
        "peut-être": 50, "neutre": 50,
        "non": 25, "probablement non": 20,
        "sûrement non": 5,
    }
    for k, score in nps_map.items():
        if k in v:
            return float(score)

    # ── Confiance
    conf_map = {
        "confiance totale": 95, "grande confiance": 85,
        "confiance moyenne": 60, "confiance faible": 30,
        "aucune confiance": 5,
    }
    for k, score in conf_map.items():
        if k in v:
            return float(score)

    return None


def pivot_responses(df_raw: pd.DataFrame) -> pd.DataFrame:
    """
    Pivote les réponses par client × mois pour obtenir des KPI agrégés.
    """
    df = df_raw.copy()
    df["score"] = df["valeur"].apply(_map_value_to_score)

    # Identifier le type de KPI selon le libellé de la question
    def categorize_question(libelle: str) -> str:
        l = str(libelle).lower()
        if any(k in l for k in ["satisf", "qualité", "service", "note"]):
            return "satisfaction"
        if any(k in l for k in ["récla", "problème", "plainte"]):
            return "reclamation"
        if any(k in l for k in ["revis", "retour", "fidél", "revisite"]):
            return "revisite"
        if any(k in l for k in ["recomm", "nps", "conseil"]):
            return "nps"
        if any(k in l for k in ["confian"]):
            return "confiance"
        return "autre"

    df["kpi_type"] = df["libelle_question"].apply(categorize_question)

    dims = ["annee", "mois", "region", "bureau_poste", "type_enquete",
            "genre", "tranche_age", "niveau_instruction", "profession"]

    agg_rows = []
    for grp_keys, grp in df.groupby(dims):
        row = dict(zip(dims, grp_keys))
        row["nb_reponses"] = len(grp)
        for kpi in ["satisfaction", "reclamation", "revisite", "nps", "confiance"]:
            sub = grp[grp["kpi_type"] == kpi]["score"].dropna()
            row[f"taux_{kpi}"] = round(sub.mean(), 2) if len(sub) > 0 else np.nan
        agg_rows.append(row)

    df_agg = pd.DataFrame(agg_rows)

    # Remplissage manquant par médiane groupe
    for col in TARGETS:
        if col in df_agg.columns:
            df_agg[col] = df_agg[col].fillna(df_agg[col].median())

    print(f"✅ Pivot terminé : {len(df_agg)} lignes agrégées.")
    return df_agg


# ─────────────────────────────────────────────────────────────────────────────
# DONNÉES SIMULÉES (fallback si SQL indisponible)
# ─────────────────────────────────────────────────────────────────────────────

def simulate_data() -> pd.DataFrame:
    np.random.seed(SEED)
    regions   = ["Tunis", "Sfax", "Sousse", "Bizerte", "Gabès",
                 "Monastir", "Nabeul", "Kairouan", "Gafsa", "Béja"]
    enquetes  = ["Bureau de Poste", "Abonnés", "Passagers", "Services Colis"]
    genres    = ["Masculin", "Féminin"]
    tranches  = ["Moins de 25 ans", "25-34 ans", "35-44 ans", "45-54 ans", "55 ans et plus"]
    niveaux   = ["Primaire", "Secondaire", "Supérieur"]
    profs     = ["Employé", "Fonctionnaire", "Commerçant", "Étudiant", "Retraité", "Autre"]

    rows = []
    for year in [2023, 2024, 2025]:
        trend = (year - 2022) * 1.5
        for month in range(1, 13):
            season = np.sin(2 * np.pi * month / 12) * 3
            for region in regions:
                rb = 3 if region == "Tunis" else 0
                for enquete in enquetes:
                    for genre in genres:
                        for tranche in tranches:
                            base_sat = 65 + trend / 2 + rb + season + np.random.normal(0, 6)
                            base_rec = 18 - trend / 3 + np.random.normal(0, 5)
                            base_rev = 60 + trend / 2 + np.random.normal(0, 7)
                            rows.append({
                                "annee": year, "mois": month,
                                "trimestre": (month - 1) // 3 + 1,
                                "region": region,
                                "bureau_poste": f"Bureau_{region[:3]}_{np.random.randint(1,6):02d}",
                                "type_enquete": enquete,
                                "genre": genre, "tranche_age": tranche,
                                "niveau_instruction": np.random.choice(niveaux),
                                "profession": np.random.choice(profs),
                                "taux_satisfaction": round(np.clip(base_sat, 20, 99), 2),
                                "taux_reclamation":  round(np.clip(base_rec,  2, 60), 2),
                                "taux_revisite":     round(np.clip(base_rev, 15, 99), 2),
                                "taux_nps":          round(np.clip(base_sat * 0.8 - 10 + np.random.normal(0, 8), -100, 100), 2),
                                "taux_confiance":    round(np.clip(base_sat * 0.9 + np.random.normal(0, 5), 10, 99), 2),
                                "nb_reponses": np.random.randint(20, 120),
                            })
    df = pd.DataFrame(rows)
    print(f"✅ Données simulées : {len(df)} lignes.")
    return df


def load_data() -> pd.DataFrame:
    try:
        df_raw = load_data_from_sql()
        return pivot_responses(df_raw)
    except Exception as e:
        print(f"⚠️  SQL non disponible ({e}) → mode simulation.")
        return simulate_data()


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────

def build_features(df: pd.DataFrame):
    df = df.copy().sort_values(["annee", "mois"]).reset_index(drop=True)

    # Temporel
    df["mois_sin"]   = np.sin(2 * np.pi * df["mois"] / 12)
    df["mois_cos"]   = np.cos(2 * np.pi * df["mois"] / 12)
    df["year_norm"]  = (df["annee"] - 2023) / 2
    if "trimestre" not in df.columns:
        df["trimestre"] = ((df["mois"] - 1) // 3 + 1)

    # Encodage catégoriel
    encoder_maps = {}
    cat_cols = ["region", "bureau_poste", "type_enquete", "genre",
                "tranche_age", "niveau_instruction", "profession"]
    for col in cat_cols:
        if col not in df.columns:
            continue
        le = LabelEncoder()
        df[f"{col}_enc"] = le.fit_transform(df[col].astype(str))
        encoder_maps[col] = {cls: int(i) for i, cls in enumerate(le.classes_)}

    # Lags + rolling par groupe région × type_enquete
    for kpi in TARGETS:
        if kpi not in df.columns:
            continue
        grp = df.groupby(["region", "type_enquete"])[kpi]
        for lag in [1, 2, 3]:
            df[f"{kpi}_lag{lag}"] = grp.shift(lag)
        df[f"{kpi}_roll3"] = grp.transform(
            lambda x: x.shift(1).rolling(3, min_periods=1).mean()
        )

    lag_cols = [c for c in df.columns if "_lag" in c or "_roll" in c]
    df[lag_cols] = df[lag_cols].fillna(df[lag_cols].median())

    enc_cols  = [c for c in df.columns if c.endswith("_enc")]
    base_cols = ["mois", "trimestre", "mois_sin", "mois_cos", "year_norm", "nb_reponses"]
    base_cols = [c for c in base_cols if c in df.columns]

    features = [c for c in base_cols + enc_cols + lag_cols if c in df.columns]
    return df, features, encoder_maps


# ─────────────────────────────────────────────────────────────────────────────
# ENTRAÎNEMENT + COMPARAISON DES 3 MODÈLES
# ─────────────────────────────────────────────────────────────────────────────

def _compute_metrics(y_true, y_pred) -> dict:
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mask = y_true != 0
    mape = (np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
            if mask.sum() > 0 else None)
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    r2 = 1 - ss_res / ss_tot if ss_tot != 0 else 0.0
    return {
        "mae":  round(float(mae),  3),
        "rmse": round(float(rmse), 3),
        "mape": round(float(mape), 2) if mape is not None else None,
        "r2":   round(float(r2),   4),
    }


def train_models(df: pd.DataFrame, features: list, encoder_maps: dict):
    """
    Entraîne Régression Linéaire, Random Forest, XGBoost/GradientBoosting
    pour chacune des 3 cibles.  Stocke résultats dans _CACHE.
    """
    models_def = {
        "Régression Linéaire": LinearRegression(),
        "Random Forest":       RandomForestRegressor(n_estimators=200, max_depth=10,
                                                      min_samples_leaf=3,
                                                      random_state=SEED, n_jobs=-1),
        "XGBoost" if XGB_AVAILABLE else "Gradient Boosting":
            __import__("xgboost").XGBRegressor(
                n_estimators=300, max_depth=6, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                random_state=SEED, verbosity=0)
            if XGB_AVAILABLE else
            GradientBoostingRegressor(n_estimators=200, max_depth=5,
                                       learning_rate=0.08, random_state=SEED),
    }
    scaler = StandardScaler()

    for target in TARGETS:
        if target not in df.columns:
            continue
        mask  = ~df[features].isna().any(axis=1) & ~df[target].isna()
        X     = df.loc[mask, features]
        y     = df.loc[mask, target]
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=SEED)
        X_tr_sc = scaler.fit_transform(X_tr)
        X_te_sc = scaler.transform(X_te)

        _CACHE["metrics"][target] = {}
        best_r2, best_model, best_name = -np.inf, None, ""

        for name, mdl in models_def.items():
            try:
                if "Linéaire" in name:
                    mdl.fit(X_tr_sc, y_tr)
                    pred = mdl.predict(X_te_sc)
                else:
                    mdl.fit(X_tr, y_tr)
                    pred = mdl.predict(X_te)
                pred = np.clip(pred, 0, 100)
                metrics = _compute_metrics(y_te.values, pred)
                _CACHE["metrics"][target][name] = metrics
                print(f"  [{target}] {name}: R²={metrics['r2']}  "
                      f"MAE={metrics['mae']}  RMSE={metrics['rmse']}")
                if metrics["r2"] > best_r2:
                    best_r2, best_model, best_name = metrics["r2"], mdl, name
            except Exception as ex:
                print(f"  Erreur {name}/{target}: {ex}")

        _CACHE["models"][target] = {
            "model":  best_model,
            "name":   best_name,
            "scaler": scaler,
            "encoder_maps": encoder_maps,
        }
        _CACHE["best"][target] = best_name

        # Importance des variables (si dispo)
        if hasattr(best_model, "feature_importances_"):
            imp = best_model.feature_importances_
            _CACHE["feature_imp"][target] = [
                {"feature": f, "importance": round(float(i), 4)}
                for f, i in sorted(zip(features, imp),
                                   key=lambda x: x[1], reverse=True)
            ][:15]
        print(f"  ✅ [{target}] → meilleur : {best_name} (R²={best_r2:.4f})")


# ─────────────────────────────────────────────────────────────────────────────
# SIMULATION + PRÉDICTIONS 2026
# ─────────────────────────────────────────────────────────────────────────────

def generate_2026_scenarios(df: pd.DataFrame, features: list) -> pd.DataFrame:
    """
    Génère les combinaisons région × bureau × type_enquete × démographie pour 2026
    et calcule les prédictions des 3 modèles.
    """
    dim_cols = ["region", "bureau_poste", "type_enquete",
                "genre", "tranche_age", "niveau_instruction", "profession"]
    combos   = df[dim_cols].drop_duplicates()

    rows = []
    for _, row in combos.iterrows():
        for mois in range(1, 13):
            r = row.to_dict()
            r.update({
                "annee": 2026, "mois": mois,
                "trimestre": (mois - 1) // 3 + 1,
                "nb_reponses": int(df["nb_reponses"].median()),
            })
            rows.append(r)

    df26 = pd.DataFrame(rows)
    df26["mois_sin"]  = np.sin(2 * np.pi * df26["mois"] / 12)
    df26["mois_cos"]  = np.cos(2 * np.pi * df26["mois"] / 12)
    df26["year_norm"] = 1.0   # (2026-2023)/2 = 1.5 → arrondi 1 pour stabilité

    # Encodage avec les mêmes mappings
    for target in TARGETS:
        if target not in _CACHE["models"]:
            continue
        enc_maps = _CACHE["models"][target]["encoder_maps"]
        for col, mapping in enc_maps.items():
            df26[f"{col}_enc"] = df26[col].astype(str).map(
                lambda x, m=mapping: m.get(x, 0))

    # Lags → médiane historique de la combinaison
    for kpi in TARGETS:
        if kpi not in df.columns:
            continue
        ref = df.groupby(["region", "type_enquete"])[kpi].median().to_dict()
        med = float(df[kpi].median())
        for lag in [1, 2, 3]:
            df26[f"{kpi}_lag{lag}"] = df26.apply(
                lambda r: ref.get((r["region"], r["type_enquete"]), med), axis=1)
        df26[f"{kpi}_roll3"] = df26.apply(
            lambda r: ref.get((r["region"], r["type_enquete"]), med), axis=1)

    # Prédictions
    for target in TARGETS:
        if target not in _CACHE["models"]:
            continue
        mdl_info = _CACHE["models"][target]
        X26 = df26[[c for c in features if c in df26.columns]].fillna(0)
        if "Linéaire" in mdl_info["name"]:
            X26_sc = mdl_info["scaler"].transform(X26)
            df26[f"pred_{target}"] = np.clip(
                mdl_info["model"].predict(X26_sc), 0, 100).round(2)
        else:
            df26[f"pred_{target}"] = np.clip(
                mdl_info["model"].predict(X26), 0, 100).round(2)

    # Intervalles de confiance (±1 std du bruit de test)
    for target in TARGETS:
        pred_col = f"pred_{target}"
        if pred_col not in df26.columns:
            continue
        noise = df[target].std() * 0.15 if target in df.columns else 3.0
        df26[f"{pred_col}_low"]  = (df26[pred_col] - noise).clip(0, 100).round(2)
        df26[f"{pred_col}_high"] = (df26[pred_col] + noise).clip(0, 100).round(2)

    # Export CSV
    export_cols = dim_cols + ["annee", "mois", "trimestre"] + \
                  [c for c in df26.columns if c.startswith("pred_")]
    df26[export_cols].to_csv(
        "exports/predictions_satisfaction_2026.csv",
        index=False, encoding="utf-8-sig", sep=";")
    print("✅ CSV exporté : exports/predictions_satisfaction_2026.csv")

    return df26


def build_monthly_history(df: pd.DataFrame) -> list:
    """Agrège les données historiques par mois pour les graphiques."""
    agg = (df.groupby(["annee", "mois"])
           .agg(
               taux_satisfaction=("taux_satisfaction", "mean"),
               taux_reclamation =("taux_reclamation",  "mean"),
               taux_revisite    =("taux_revisite",      "mean"),
               nb_reponses      =("nb_reponses",         "sum"),
           )
           .round(2)
           .reset_index())
    return agg.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────────────────────
# PIPELINE COMPLET
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline():
    print("\n" + "=" * 60)
    print("  PIPELINE ML — POSTE TUNISIENNE  ")
    print("=" * 60)

    df = load_data()
    df, features, encoder_maps = build_features(df)

    print("\n🔬 Entraînement des modèles…")
    train_models(df, features, encoder_maps)

    print("\n📅 Génération des prédictions 2026…")
    df26 = generate_2026_scenarios(df, features)

    _CACHE["hist_monthly"]  = build_monthly_history(df)
    _CACHE["predictions"]   = df26
    _CACHE["trained"]       = True
    _CACHE["trained_at"]    = datetime.now().isoformat()
    _CACHE["_df"]           = df    # conservé pour les filtres dynamiques
    _CACHE["_features"]     = features

    print("\n✅ Pipeline terminé.\n")


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES FLASK
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status":     "online",
        "trained":    _CACHE["trained"],
        "trained_at": _CACHE["trained_at"],
        "xgboost":    XGB_AVAILABLE,
    })


@app.route("/api/train", methods=["POST"])
def train():
    try:
        run_pipeline()
        return jsonify({
            "success":  True,
            "message":  "Pipeline entraîné avec succès.",
            "trained_at": _CACHE["trained_at"],
            "best_models": _CACHE["best"],
        })
    except Exception as e:
        import traceback
        return jsonify({"success": False, "error": str(e),
                        "trace": traceback.format_exc()}), 500


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    if not _CACHE["trained"]:
        return jsonify({"error": "Modèles non entraînés. POST /api/train d'abord."}), 400
    return jsonify({
        "metrics":    _CACHE["metrics"],
        "best":       _CACHE["best"],
        "feature_imp": _CACHE["feature_imp"],
    })


@app.route("/api/history", methods=["GET"])
def get_history():
    """KPI historiques mensuels (2023-2025) pour les graphiques."""
    if not _CACHE["trained"]:
        return jsonify({"error": "Non entraîné."}), 400

    region   = request.args.get("region")
    enquete  = request.args.get("enquete")

    df = _CACHE["_df"].copy()
    if region:
        df = df[df["region"] == region]
    if enquete:
        df = df[df["type_enquete"] == enquete]

    agg = (df.groupby(["annee", "mois"])
           .agg(
               taux_satisfaction=("taux_satisfaction", "mean"),
               taux_reclamation =("taux_reclamation",  "mean"),
               taux_revisite    =("taux_revisite",      "mean"),
           )
           .round(2).reset_index())

    return jsonify({
        "data":    agg.to_dict(orient="records"),
        "filters": {"region": region, "enquete": enquete},
    })


@app.route("/api/predictions", methods=["GET"])
def get_predictions():
    """Prédictions 2026 filtrées."""
    if not _CACHE["trained"]:
        return jsonify({"error": "Non entraîné."}), 400

    df26     = _CACHE["predictions"].copy()
    region   = request.args.get("region")
    enquete  = request.args.get("enquete")
    genre    = request.args.get("genre")
    tranche  = request.args.get("tranche_age")
    bureau   = request.args.get("bureau_poste")

    if region:  df26 = df26[df26["region"]       == region]
    if enquete: df26 = df26[df26["type_enquete"]  == enquete]
    if genre:   df26 = df26[df26["genre"]         == genre]
    if tranche: df26 = df26[df26["tranche_age"]   == tranche]
    if bureau:  df26 = df26[df26["bureau_poste"]  == bureau]

    pred_cols = ["annee", "mois", "region", "bureau_poste", "type_enquete",
                 "genre", "tranche_age", "trimestre"] + \
                [c for c in df26.columns if c.startswith("pred_")]

    agg = (df26[[c for c in pred_cols if c in df26.columns]]
           .groupby(["annee", "mois", "trimestre"])
           .agg({c: "mean" for c in df26.columns if c.startswith("pred_")})
           .round(2).reset_index())

    return jsonify({
        "predictions": agg.to_dict(orient="records"),
        "nb_rows":     len(agg),
        "filters": {
            "region": region, "enquete": enquete,
            "genre": genre, "tranche_age": tranche, "bureau_poste": bureau,
        },
    })


@app.route("/api/predictions/by-region", methods=["GET"])
def predictions_by_region():
    """Prédictions agrégées par région pour la carte."""
    if not _CACHE["trained"]:
        return jsonify({"error": "Non entraîné."}), 400
    df26 = _CACHE["predictions"].copy()
    pred_cols = [c for c in df26.columns if c.startswith("pred_")]
    agg = (df26.groupby("region")[pred_cols].mean().round(2).reset_index())
    return jsonify({"data": agg.to_dict(orient="records")})


@app.route("/api/predictions/by-enquete", methods=["GET"])
def predictions_by_enquete():
    """Prédictions agrégées par type d'enquête."""
    if not _CACHE["trained"]:
        return jsonify({"error": "Non entraîné."}), 400
    df26 = _CACHE["predictions"].copy()
    pred_cols = [c for c in df26.columns if c.startswith("pred_")]
    agg = (df26.groupby("type_enquete")[pred_cols].mean().round(2).reset_index())
    return jsonify({"data": agg.to_dict(orient="records")})


@app.route("/api/filters", methods=["GET"])
def get_filters():
    """Valeurs disponibles pour chaque filtre."""
    if not _CACHE["trained"]:
        return jsonify({"error": "Non entraîné."}), 400
    df = _CACHE["_df"]
    return jsonify({
        "regions":     sorted(df["region"].dropna().unique().tolist()),
        "enquetes":    sorted(df["type_enquete"].dropna().unique().tolist()),
        "genres":      sorted(df["genre"].dropna().unique().tolist()),
        "tranches_age": sorted(df["tranche_age"].dropna().unique().tolist()),
        "bureaux":     sorted(df["bureau_poste"].dropna().unique().tolist()),
    })


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """
    Retourne les bureaux/régions avec taux_satisfaction prédit < 55
    ou taux_reclamation prédit > 30 pour 2026.
    """
    if not _CACHE["trained"]:
        return jsonify({"error": "Non entraîné."}), 400
    df26 = _CACHE["predictions"].copy()
    alerts = []
    if "pred_taux_satisfaction" in df26.columns:
        low_sat = (df26[df26["pred_taux_satisfaction"] < 55]
                   .groupby(["region", "bureau_poste", "type_enquete"])
                   ["pred_taux_satisfaction"].mean().reset_index())
        for _, r in low_sat.iterrows():
            alerts.append({
                "type": "Satisfaction Faible",
                "region": r["region"], "bureau_poste": r["bureau_poste"],
                "type_enquete": r["type_enquete"],
                "valeur": round(r["pred_taux_satisfaction"], 1),
                "seuil": 55, "severity": "high" if r["pred_taux_satisfaction"] < 45 else "medium",
            })
    if "pred_taux_reclamation" in df26.columns:
        high_rec = (df26[df26["pred_taux_reclamation"] > 30]
                    .groupby(["region", "bureau_poste", "type_enquete"])
                    ["pred_taux_reclamation"].mean().reset_index())
        for _, r in high_rec.iterrows():
            alerts.append({
                "type": "Réclamations Élevées",
                "region": r["region"], "bureau_poste": r["bureau_poste"],
                "type_enquete": r["type_enquete"],
                "valeur": round(r["pred_taux_reclamation"], 1),
                "seuil": 30, "severity": "high" if r["pred_taux_reclamation"] > 45 else "medium",
            })
    alerts.sort(key=lambda x: x["valeur"] if x["type"] == "Satisfaction Faible" else -x["valeur"])
    return jsonify({"alerts": alerts[:30], "nb_alerts": len(alerts)})


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🚀 Flask ML Backend — Poste Tunisienne Satisfaction Dashboard")
    print(f"   SQL Server : {DB_CONFIG['server']} / {DB_CONFIG['database']}")
    print("   Lancement du pipeline initial…\n")
    run_pipeline()
    app.run(host="0.0.0.0", port=5000, debug=False)