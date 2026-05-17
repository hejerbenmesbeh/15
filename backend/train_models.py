# =============================================================
#  PARTIE MACHINE LEARNING - POSTE TUNISIENNE
#  Projet : Dashboard Prédictif de Satisfaction Client
#  Niveau  : Licence en Business Intelligence
#  Modèles : Logistic Regression, Decision Tree, Random Forest
# =============================================================

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report

# -----------------------------------------------------------------
# ÉTAPE 1 : GÉNÉRATION DES DONNÉES SIMULÉES
# Basées sur la structure réelle du Data Warehouse (qualite DB)
# Tables : fact_table_satisfaction, dim_client, dim_region,
#          dim_bureaux_poste, dim_tranches_age, dim_genre,
#          dim_niveaux_instruction, dim_professions, dim_secteur
# -----------------------------------------------------------------

np.random.seed(42)
N = 1000  # nombre d'enregistrements simulés

# Valeurs tirées directement du Data Warehouse analysé
secteurs      = ["Abonnée", "Passagers", "Bureau", "Colis"]
regions       = ["Tunis", "Sfax", "Sousse", "Bizerte", "Nabeul",
                 "Monastir", "Gabès", "Gafsa", "Kairouan", "Médenine"]
tranches_age  = ["Moins de 18 ans", "18-24 ans", "25-34 ans",
                 "35-44 ans", "45-54 ans", "55 ans et plus"]
genres        = ["Masculin", "Féminin"]
niveaux_instr = ["Sans instruction", "Primaire", "Secondaire",
                 "Universitaire", "Post-universitaire"]
professions   = ["Etudiant", "Salarié", "Fonctionnaire",
                 "Commerçant", "Retraité", "Sans emploi"]

data = pd.DataFrame({
    "secteur"          : np.random.choice(secteurs,      N),
    "region"           : np.random.choice(regions,       N),
    "tranche_age"      : np.random.choice(tranches_age,  N),
    "genre"            : np.random.choice(genres,        N),
    "niveau_instruction": np.random.choice(niveaux_instr, N),
    "profession"       : np.random.choice(professions,   N),
    # Note d'attente de 1 à 5 (1=très long, 5=très court)
    "note_attente"     : np.random.randint(1, 6, N),
    # Note accueil de 1 à 5
    "note_accueil"     : np.random.randint(1, 6, N),
    # Note service de 1 à 5
    "note_service"     : np.random.randint(1, 6, N),
    # Nombre de visites antérieures
    "nb_visites"       : np.random.randint(1, 20, N),
})

# -----------------------------------------------------------------
# ÉTAPE 2 : CRÉATION DES VARIABLES CIBLES (LABELS)
# Règles métier cohérentes avec le contexte Poste Tunisienne
# -----------------------------------------------------------------

# Score moyen calculé à partir des notes
data["score_moyen"] = (
    data["note_attente"] + data["note_accueil"] + data["note_service"]
) / 3

# --- Cible 1 : Satisfaction client (Satisfait / Non satisfait) ---
data["satisfaction"] = (data["score_moyen"] >= 3.5).astype(int)
# 1 = Satisfait, 0 = Non satisfait

# --- Cible 2 : Risque de réclamation (Risque élevé / Risque faible) ---
# Risque élevé si score faible OU longue attente
data["risque_reclamation"] = (
    (data["score_moyen"] < 3.0) | (data["note_attente"] <= 2)
).astype(int)
# 1 = Risque élevé, 0 = Risque faible

# --- Cible 3 : Intention de revisite (Oui / Non) ---
# Revisiterait si satisfait ET accueil correct
data["intention_revisite"] = (
    (data["satisfaction"] == 1) & (data["note_accueil"] >= 3)
).astype(int)
# 1 = Revisite prévue, 0 = Ne reviendrait pas

print("✅ Données simulées générées :", data.shape)
print(data[["satisfaction", "risque_reclamation", "intention_revisite"]].value_counts().head(10))

# -----------------------------------------------------------------
# ÉTAPE 3 : PRÉPARATION DES DONNÉES
# Encodage des variables catégorielles
# -----------------------------------------------------------------

FEATURES = [
    "secteur", "region", "tranche_age", "genre",
    "niveau_instruction", "profession",
    "note_attente", "note_accueil", "note_service", "nb_visites"
]

# Encodage Label (simple et adapté au niveau licence)
encoders = {}
data_encoded = data.copy()

for col in ["secteur", "region", "tranche_age", "genre",
            "niveau_instruction", "profession"]:
    le = LabelEncoder()
    data_encoded[col] = le.fit_transform(data[col])
    encoders[col] = le  # on sauvegarde l'encodeur pour les prédictions

X = data_encoded[FEATURES]

# -----------------------------------------------------------------
# ÉTAPE 4 : ENTRAÎNEMENT DES MODÈLES
# On entraîne 3 modèles pour chaque cible
# -----------------------------------------------------------------

TARGETS = {
    "satisfaction"      : "satisfaction",
    "risque_reclamation": "risque_reclamation",
    "intention_revisite": "intention_revisite",
}

MODELS_DEF = {
    "logistic_regression": LogisticRegression(max_iter=1000, random_state=42),
    "decision_tree"      : DecisionTreeClassifier(max_depth=5, random_state=42),
    "random_forest"      : RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42),
}

trained_models = {}   # dictionnaire final {cible: {modele: objet}}
results        = {}   # résultats d'évaluation

os.makedirs("models", exist_ok=True)

for target_name, target_col in TARGETS.items():
    y = data_encoded[target_col]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    trained_models[target_name] = {}
    results[target_name]        = {}

    print(f"\n{'='*55}")
    print(f"  CIBLE : {target_name.upper()}")
    print(f"{'='*55}")

    for model_name, model in MODELS_DEF.items():
        # Entraînement
        model.fit(X_train, y_train)
        # Prédiction sur jeu de test
        y_pred = model.predict(X_test)
        acc    = accuracy_score(y_test, y_pred)

        print(f"\n  Modèle : {model_name}")
        print(f"  Accuracy : {acc:.2%}")
        print(classification_report(y_test, y_pred, zero_division=0))

        # Sauvegarde du modèle entraîné
        trained_models[target_name][model_name] = model
        results[target_name][model_name]        = round(acc * 100, 1)

        # Sauvegarde sur disque
        filename = f"models/{target_name}_{model_name}.pkl"
        with open(filename, "wb") as f:
            pickle.dump(model, f)
        print(f"  💾 Modèle sauvegardé : {filename}")

# -----------------------------------------------------------------
# ÉTAPE 5 : SAUVEGARDE DES ENCODEURS ET DES RÉSULTATS
# -----------------------------------------------------------------

with open("models/encoders.pkl", "wb") as f:
    pickle.dump(encoders, f)
print("\n✅ Encodeurs sauvegardés : models/encoders.pkl")

with open("models/results.pkl", "wb") as f:
    pickle.dump(results, f)
print("✅ Résultats d'évaluation sauvegardés : models/results.pkl")

# Sauvegarde des features pour cohérence lors des prédictions
with open("models/features.pkl", "wb") as f:
    pickle.dump(FEATURES, f)
print("✅ Liste des features sauvegardée : models/features.pkl")

# -----------------------------------------------------------------
# ÉTAPE 6 : RÉSUMÉ FINAL
# -----------------------------------------------------------------

print("\n" + "="*55)
print("  RÉSUMÉ DES PERFORMANCES")
print("="*55)
for target_name, models_acc in results.items():
    print(f"\n  {target_name.upper()}")
    for model_name, acc in models_acc.items():
        bar = "█" * int(acc / 5)
        print(f"    {model_name:<25} {acc:>5}%  {bar}")

print("\n✅ Entraînement terminé. Les modèles sont prêts pour Flask.")
