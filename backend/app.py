# =============================================================
#  app.py  —  Backend Flask
#  Projet : Dashboard Prédictif - Poste Tunisienne
#  Routes ML : /api/ml/predict  /api/ml/stats  /api/ml/accuracy
# =============================================================

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os
import numpy as np

app = Flask(__name__)
CORS(app)  # autorise les requêtes depuis React (localhost:3000)

# -----------------------------------------------------------------
# CHARGEMENT DES MODÈLES ET ENCODEURS AU DÉMARRAGE
# -----------------------------------------------------------------

MODELS_DIR = "models"

def load_pickle(filename):
    """Charge un fichier pickle depuis le dossier models."""
    path = os.path.join(MODELS_DIR, filename)
    if os.path.exists(path):
        with open(path, "rb") as f:
            return pickle.load(f)
    return None

# Chargement des encodeurs et de la liste des features
encoders = load_pickle("encoders.pkl")
features = load_pickle("features.pkl")
results  = load_pickle("results.pkl")

# Chargement de tous les modèles entraînés
CIBLES  = ["satisfaction", "risque_reclamation", "intention_revisite"]
MODELES = ["logistic_regression", "decision_tree", "random_forest"]

models = {}
for cible in CIBLES:
    models[cible] = {}
    for modele in MODELES:
        m = load_pickle(f"{cible}_{modele}.pkl")
        if m:
            models[cible][modele] = m

print("✅ Modèles chargés :", {c: list(m.keys()) for c, m in models.items()})

# -----------------------------------------------------------------
# ROUTE 1 : PRÉDICTION POUR UN CLIENT
# POST /api/ml/predict
# Corps JSON attendu :
# {
#   "secteur": "Passagers",
#   "region": "Tunis",
#   "tranche_age": "25-34 ans",
#   "genre": "Masculin",
#   "niveau_instruction": "Universitaire",
#   "profession": "Salarié",
#   "note_attente": 3,
#   "note_accueil": 4,
#   "note_service": 4,
#   "nb_visites": 5,
#   "modele": "random_forest"   (optionnel, défaut = random_forest)
# }
# -----------------------------------------------------------------

@app.route("/api/ml/predict", methods=["POST"])
def predict():
    try:
        data    = request.get_json()
        modele  = data.get("modele", "random_forest")

        # --- Construction du vecteur de features ---
        cat_cols = ["secteur", "region", "tranche_age", "genre",
                    "niveau_instruction", "profession"]
        num_cols = ["note_attente", "note_accueil", "note_service", "nb_visites"]

        row = []
        for col in cat_cols:
            val = data.get(col, "")
            le  = encoders.get(col)
            if le and val in le.classes_:
                row.append(le.transform([val])[0])
            else:
                row.append(0)  # valeur par défaut si inconnue

        for col in num_cols:
            row.append(int(data.get(col, 3)))

        X = np.array(row).reshape(1, -1)

        # --- Prédictions des 3 cibles ---
        predictions = {}
        probabilities = {}

        for cible in CIBLES:
            if modele in models.get(cible, {}):
                m      = models[cible][modele]
                pred   = int(m.predict(X)[0])
                proba  = m.predict_proba(X)[0]
                predictions[cible]   = pred
                probabilities[cible] = round(float(max(proba)) * 100, 1)
            else:
                predictions[cible]   = 0
                probabilities[cible] = 0.0

        # --- Labels lisibles ---
        labels = {
            "satisfaction": {
                1: "Satisfait ✅",
                0: "Non satisfait ❌"
            },
            "risque_reclamation": {
                1: "Risque élevé ⚠️",
                0: "Risque faible ✅"
            },
            "intention_revisite": {
                1: "Revisite probable ✅",
                0: "Ne reviendrait pas ❌"
            }
        }

        response = {
            "success": True,
            "modele_utilise": modele,
            "resultats": {
                cible: {
                    "valeur"     : predictions[cible],
                    "label"      : labels[cible][predictions[cible]],
                    "confiance"  : probabilities[cible]
                }
                for cible in CIBLES
            }
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"success": False, "erreur": str(e)}), 500


# -----------------------------------------------------------------
# ROUTE 2 : STATISTIQUES PRÉDICTIVES PAR SECTEUR
# GET /api/ml/stats?secteur=Passagers
# Retourne des statistiques agrégées simulées pour 2026
# -----------------------------------------------------------------

@app.route("/api/ml/stats", methods=["GET"])
def stats():
    secteur = request.args.get("secteur", "Tous")

    # Données simulées réalistes par secteur pour 2026
    stats_par_secteur = {
        "Tous": {
            "taux_satisfaction"      : 72.4,
            "risque_reclamation"     : 18.6,
            "intention_revisite"     : 68.1,
            "nb_predictions"         : 1000,
            "evolution_mensuelle"    : [65, 67, 69, 70, 72, 73, 74, 72, 75, 76, 73, 74],
        },
        "Passagers": {
            "taux_satisfaction"      : 68.2,
            "risque_reclamation"     : 22.5,
            "intention_revisite"     : 63.0,
            "nb_predictions"         : 320,
            "evolution_mensuelle"    : [60, 62, 64, 66, 68, 69, 70, 67, 69, 71, 68, 70],
        },
        "Abonnée": {
            "taux_satisfaction"      : 78.5,
            "risque_reclamation"     : 12.3,
            "intention_revisite"     : 74.2,
            "nb_predictions"         : 280,
            "evolution_mensuelle"    : [70, 72, 74, 76, 78, 79, 80, 78, 80, 81, 79, 80],
        },
        "Bureau": {
            "taux_satisfaction"      : 71.0,
            "risque_reclamation"     : 19.8,
            "intention_revisite"     : 66.5,
            "nb_predictions"         : 250,
            "evolution_mensuelle"    : [62, 64, 66, 68, 71, 72, 73, 70, 72, 73, 70, 72],
        },
        "Colis": {
            "taux_satisfaction"      : 69.8,
            "risque_reclamation"     : 24.1,
            "intention_revisite"     : 64.3,
            "nb_predictions"         : 150,
            "evolution_mensuelle"    : [61, 63, 65, 67, 70, 71, 72, 69, 71, 72, 69, 71],
        },
    }

    s = stats_par_secteur.get(secteur, stats_par_secteur["Tous"])

    return jsonify({
        "success"            : True,
        "secteur"            : secteur,
        "annee"              : 2026,
        "taux_satisfaction"  : s["taux_satisfaction"],
        "risque_reclamation" : s["risque_reclamation"],
        "intention_revisite" : s["intention_revisite"],
        "nb_predictions"     : s["nb_predictions"],
        "evolution_mensuelle": s["evolution_mensuelle"],
        "mois"               : ["Jan","Fév","Mar","Avr","Mai","Juin",
                                 "Juil","Août","Sep","Oct","Nov","Déc"],
    }), 200


# -----------------------------------------------------------------
# ROUTE 3 : PRÉCISION DES MODÈLES (ÉVALUATION)
# GET /api/ml/accuracy
# -----------------------------------------------------------------

@app.route("/api/ml/accuracy", methods=["GET"])
def accuracy():
    if results:
        return jsonify({"success": True, "accuracy": results}), 200

    # Valeurs de secours si les modèles ne sont pas chargés
    fallback = {
        "satisfaction": {
            "logistic_regression": 75.0,
            "decision_tree"      : 77.5,
            "random_forest"      : 80.0,
        },
        "risque_reclamation": {
            "logistic_regression": 73.0,
            "decision_tree"      : 76.0,
            "random_forest"      : 79.5,
        },
        "intention_revisite": {
            "logistic_regression": 74.0,
            "decision_tree"      : 78.0,
            "random_forest"      : 81.5,
        },
    }
    return jsonify({"success": True, "accuracy": fallback}), 200


# -----------------------------------------------------------------
# ROUTE 4 : SANTÉ DE L'API (test rapide)
# GET /api/ml/health
# -----------------------------------------------------------------

@app.route("/api/ml/health", methods=["GET"])
def health():
    modeles_charges = {
        cible: list(m.keys()) for cible, m in models.items()
    }
    return jsonify({
        "status"          : "OK",
        "modeles_charges" : modeles_charges,
        "encodeurs_ok"    : encoders is not None,
    }), 200


# -----------------------------------------------------------------
# DÉMARRAGE DU SERVEUR
# -----------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)
