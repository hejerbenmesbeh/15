#!/usr/bin/env python3
"""
Pipeline ML Satisfaction — Poste Tunisienne
Base de données : Datawarhouse.sql (1619 réponses)

3 OBJECTIFS :
  1. Prédiction du score de satisfaction (1-5)   → Régression
  2. Classification du sentiment                 → Positif / Neutre / Négatif
  3. Prédiction du volume de réponses / bureau   → Régression

3 MODÈLES comparés par objectif :
  - Random Forest
  - XGBoost
  - Gradient Boosting
"""

import re, json, warnings
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, r2_score
from xgboost import XGBClassifier, XGBRegressor
warnings.filterwarnings("ignore")

# ══════════════════════════════════════════════════════════════════════
# 1. CHARGEMENT & PARSING SQL
# ══════════════════════════════════════════════════════════════════════
with open("Datawarhouse.sql", "rb") as f:
    text = f.read().decode("utf-16-le", errors="replace")
lines = text.split("\n")

def parse_dim(lines, table):
    rows = {}
    pat = re.compile(rf"INSERT \[dbo\]\.\[{re.escape(table)}\].*?VALUES \((.+?)\)\s*$")
    for line in lines:
        m = pat.match(line.strip())
        if m:
            vals = [v.strip().strip("N\'").rstrip("\'")
                    for v in re.split(r",\s*(?=(?:[^\']*\'[^\']*\')*[^\']*$)", m.group(1))]
            if len(vals) >= 2:
                try:
                    rows[int(vals[0])] = vals[1]
                except: pass
    return rows

regions    = parse_dim(lines, "dim_regions")
genres     = parse_dim(lines, "dim_genre")
tranches   = parse_dim(lines, "dim_tranches_age")
niveaux    = parse_dim(lines, "dim_niveaux_instruction")
professions= parse_dim(lines, "dim_professions")
bureaux    = parse_dim(lines, "dim_bureaux_poste")

pat_fact = re.compile(
    r"INSERT \[dbo\]\.\[fact_table_satisfaction\].*?VALUES \((\d+),\s*N\'([^\']*)\',"
    r"\s*CAST\(N\'([^\']+)\' AS DateTime\),\s*(\d+),\s*(\d+),\s*(\d+),"
    r"\s*(\d+),\s*(\d+),\s*(\d+),\s*N\'([^\']+)\',\s*(\d+)\)"
)
records = []
for line in lines:
    m = pat_fact.search(line)
    if m:
        records.append({
            "client_id": int(m.group(1)), "valeur": m.group(2),
            "created_at": m.group(3),     "region_id": int(m.group(4)),
            "profession_id": int(m.group(5)), "bureau_poste_id": int(m.group(6)),
            "tranche_age_id": int(m.group(7)), "niveau_instruction_id": int(m.group(8)),
            "genre_id": int(m.group(9)), "question_id": m.group(10),
            "enquete_id": int(m.group(11)),
        })

df = pd.DataFrame(records)
df["created_at"] = pd.to_datetime(df["created_at"])
df["annee"]  = df["created_at"].dt.year
df["mois"]   = df["created_at"].dt.month
df["region"] = df["region_id"].map(regions)
df["genre"]  = df["genre_id"].map(genres)
df["tranche_age"]        = df["tranche_age_id"].map(tranches)
df["niveau_instruction"] = df["niveau_instruction_id"].map(niveaux)
df["bureau"]  = df["bureau_poste_id"].map(bureaux)
df["secteur"] = df["question_id"].str.extract(r"(Bureau|Colis|Passag|Abonne)", expand=False).fillna("Autre")
df["trimestre"] = ((df["mois"]-1)//3)+1
df["mois_sin"]  = np.sin(2*np.pi*df["mois"]/12)
df["mois_cos"]  = np.cos(2*np.pi*df["mois"]/12)
print(f"✅ Données chargées: {len(df)} lignes")

# ══════════════════════════════════════════════════════════════════════
# 2. FEATURE ENGINEERING — SCORE NUMÉRIQUE
# ══════════════════════════════════════════════════════════════════════
SCORE_MAP = {
    "Très satisfait":5,"Très Satisfait":5,"Satisfait":4,"Moyennement satisfait":3,
    "Neutre":3,"Peu satisfait":2,"Insatisfait":2,"Pas du tout satisfait":1,
    "Oui":4,"Sûrement oui":5,"Plutôt oui":4,"Non":2,"Plutôt non":2,"Certainement non":1,"NSP":3,
}

def extract_score(v):
    if not isinstance(v, str): return None
    if v in SCORE_MAP: return SCORE_MAP[v]
    try:
        n = float(v)
        if 1<=n<=10: return round(n/2,0)
        if 1<=n<=5: return n
    except: pass
    try:
        j = json.loads(v)
        if "satisfaction" in j: return SCORE_MAP.get(j["satisfaction"])
        if "notoriete" in j: return 4 if j["notoriete"]=="Oui" else 2
    except: pass
    return None

df["score"] = df["valeur"].apply(extract_score)
df["label"] = df["score"].apply(
    lambda s: "Positif" if s and s>=4 else ("Négatif" if s and s<=2 else ("Neutre" if s else None))
)

le_region     = LabelEncoder(); df["region_enc"]     = le_region.fit_transform(df["region"].fillna("Inconnu"))
le_secteur    = LabelEncoder(); df["secteur_enc"]    = le_secteur.fit_transform(df["secteur"])
le_bureau     = LabelEncoder(); df["bureau_enc"]     = le_bureau.fit_transform(df["bureau_poste_id"].astype(str))
le_profession = LabelEncoder(); df["profession_enc"] = le_profession.fit_transform(df["profession_id"].astype(str))

FEATS = ["region_enc","genre_id","tranche_age_id","niveau_instruction_id",
         "profession_enc","bureau_enc","secteur_enc","annee","mois","trimestre","mois_sin","mois_cos"]

results = {}

# ══════════════════════════════════════════════════════════════════════
# OBJECTIF 1 — Score de satisfaction (Régression)
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*55)
print("OBJECTIF 1 : Prédiction du Score de Satisfaction (1-5)")
print("="*55)
df1 = df[df["score"].notna() & (df["score"]>0)].copy()
X1, y1 = df1[FEATS], df1["score"]
Xtr1,Xte1,ytr1,yte1 = train_test_split(X1,y1,test_size=0.2,random_state=42)
models_reg = {
    "Random Forest":       RandomForestRegressor(n_estimators=200,max_depth=10,random_state=42),
    "XGBoost":             XGBRegressor(n_estimators=300,learning_rate=0.05,max_depth=6,random_state=42,verbosity=0),
    "Gradient Boosting":   GradientBoostingRegressor(n_estimators=200,learning_rate=0.08,max_depth=5,random_state=42),
}
res1 = {}
for name,m in models_reg.items():
    m.fit(Xtr1,ytr1)
    p = np.clip(m.predict(Xte1),1,5)
    res1[name] = {"MAE":round(mean_absolute_error(yte1,p),3),"R2":round(r2_score(yte1,p),4)}
    print(f"  {name:<25} MAE={res1[name]['MAE']}  R²={res1[name]['R2']}")
best1_name = max(res1,key=lambda k:res1[k]["R2"])
print(f"  ► Meilleur: {best1_name}")
results["objectif1"] = {"modeles":res1,"meilleur":best1_name}

# ══════════════════════════════════════════════════════════════════════
# OBJECTIF 2 — Classification sentiment
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*55)
print("OBJECTIF 2 : Classification Positif / Neutre / Négatif")
print("="*55)
df2 = df[df["label"].notna()].copy()
le_label = LabelEncoder(); df2["label_enc"] = le_label.fit_transform(df2["label"])
X2,y2 = df2[FEATS],df2["label_enc"]
Xtr2,Xte2,ytr2,yte2 = train_test_split(X2,y2,test_size=0.2,random_state=42)
models_clf = {
    "Random Forest":     RandomForestClassifier(n_estimators=200,max_depth=10,random_state=42),
    "XGBoost":           XGBClassifier(n_estimators=300,learning_rate=0.05,max_depth=6,
                                        random_state=42,verbosity=0,eval_metric="mlogloss"),
    "Gradient Boosting": GradientBoostingClassifier(n_estimators=200,learning_rate=0.08,max_depth=5,random_state=42),
}
res2 = {}
for name,m in models_clf.items():
    m.fit(Xtr2,ytr2)
    p = m.predict(Xte2)
    res2[name] = {"Accuracy":round(accuracy_score(yte2,p),4),"F1":round(f1_score(yte2,p,average="weighted"),4)}
    print(f"  {name:<25} Accuracy={res2[name]['Accuracy']}  F1={res2[name]['F1']}")
best2_name = max(res2,key=lambda k:res2[k]["Accuracy"])
print(f"  ► Meilleur: {best2_name}")
results["objectif2"] = {"modeles":res2,"meilleur":best2_name}

# ══════════════════════════════════════════════════════════════════════
# OBJECTIF 3 — Volume de réponses
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*55)
print("OBJECTIF 3 : Prédiction Volume de Réponses par Bureau")
print("="*55)
vol = df.groupby(["bureau_poste_id","region_id","annee","mois","trimestre"]).size().reset_index(name="nb_reponses")
vol["mois_sin"] = np.sin(2*np.pi*vol["mois"]/12)
vol["mois_cos"] = np.cos(2*np.pi*vol["mois"]/12)
vol["bureau_enc"] = LabelEncoder().fit_transform(vol["bureau_poste_id"].astype(str))
vol["region_enc"] = LabelEncoder().fit_transform(vol["region_id"].astype(str))
FEATS3 = ["bureau_enc","region_enc","annee","mois","trimestre","mois_sin","mois_cos"]
X3,y3 = vol[FEATS3],vol["nb_reponses"]
Xtr3,Xte3,ytr3,yte3 = train_test_split(X3,y3,test_size=0.2,random_state=42)
models_vol = {
    "Random Forest":     RandomForestRegressor(n_estimators=200,max_depth=8,random_state=42),
    "XGBoost":           XGBRegressor(n_estimators=300,learning_rate=0.05,max_depth=5,random_state=42,verbosity=0),
    "Gradient Boosting": GradientBoostingRegressor(n_estimators=200,learning_rate=0.08,max_depth=4,random_state=42),
}
res3 = {}
for name,m in models_vol.items():
    m.fit(Xtr3,ytr3)
    p = np.maximum(m.predict(Xte3),0)
    res3[name] = {"MAE":round(mean_absolute_error(yte3,p),3),"R2":round(r2_score(yte3,p),4)}
    print(f"  {name:<25} MAE={res3[name]['MAE']}  R²={res3[name]['R2']}")
best3_name = max(res3,key=lambda k:res3[k]["R2"])
print(f"  ► Meilleur: {best3_name}")
results["objectif3"] = {"modeles":res3,"meilleur":best3_name}

# ══════════════════════════════════════════════════════════════════════
# PRÉDICTIONS 2026
# ══════════════════════════════════════════════════════════════════════
print("\n" + "="*55)
print("PRÉDICTIONS 2026")
print("="*55)

best_reg = models_reg[best1_name].fit(X1,y1)
best_clf = models_clf[best2_name].fit(X2,y2)
best_vol = models_vol[best3_name].fit(X3,y3)
label_classes = list(le_label.classes_)

# OBJ1: score mensuel moyen par région
pred_rows = []
for r_id in sorted(df["region_id"].dropna().unique()):
    r_enc = df[df["region_id"]==r_id]["region_enc"].iloc[0]
    r_name = df[df["region_id"]==r_id]["region"].iloc[0]
    for mois in range(1,13):
        for s_enc in range(4):
            pred_rows.append(dict(region_enc=r_enc,genre_id=1,tranche_age_id=2,
                niveau_instruction_id=5,profession_enc=2,bureau_enc=1,secteur_enc=s_enc,
                annee=2026,mois=mois,trimestre=((mois-1)//3)+1,
                mois_sin=np.sin(2*np.pi*mois/12),mois_cos=np.cos(2*np.pi*mois/12),
                region=r_name,mois_key=mois))

pred_df = pd.DataFrame(pred_rows)
pred_df["score_predit"] = np.clip(best_reg.predict(pred_df[FEATS]),1,5)
agg1 = pred_df.groupby(["region","mois_key"])["score_predit"].mean().reset_index()

# OBJ2: classification mensuelle
clf_rows = [dict(region_enc=re,genre_id=1,tranche_age_id=2,niveau_instruction_id=5,
    profession_enc=2,bureau_enc=1,secteur_enc=se,annee=2026,mois=mo,
    trimestre=((mo-1)//3)+1,mois_sin=np.sin(2*np.pi*mo/12),mois_cos=np.cos(2*np.pi*mo/12),
    mois_key=mo)
    for mo in range(1,13) for se in range(4) for re in range(5)]
clf_df2 = pd.DataFrame(clf_rows)
proba = best_clf.predict_proba(clf_df2[FEATS])
clf_df2["label_pred"] = best_clf.predict(clf_df2[FEATS])
clf_df2["proba_pos"]  = proba[:,label_classes.index("Positif")]
clf_df2["proba_neu"]  = proba[:,label_classes.index("Neutre")]
clf_df2["proba_neg"]  = proba[:,label_classes.index("Négatif")]
agg2 = clf_df2.groupby("mois_key")[["proba_pos","proba_neu","proba_neg"]].mean().reset_index()

# OBJ3: volume mensuel
vol_rows = [dict(bureau_enc=le_bureau.transform([str(bid)])[0] if str(bid) in le_bureau.classes_ else 0,
    region_enc=0,annee=2026,mois=mo,trimestre=((mo-1)//3)+1,
    mois_sin=np.sin(2*np.pi*mo/12),mois_cos=np.cos(2*np.pi*mo/12),mois_key=mo)
    for bid in list(vol["bureau_poste_id"].unique())[:20] for mo in range(1,13)]
vol_df2 = pd.DataFrame(vol_rows)
vol_df2["nb_pred"] = np.maximum(best_vol.predict(vol_df2[FEATS3]),0)
agg3 = vol_df2.groupby("mois_key")["nb_pred"].sum().reset_index()

print("\nScore prédit 2026 — extrait (Tunis):")
print(agg1[agg1["region"]=="Tunis"].to_string(index=False))
print("\nClassification 2026 — extrait (6 premiers mois):")
print(agg2.head(6).to_string(index=False))
print("\nVolume 2026 — total par mois:")
print(agg3.to_string(index=False))

with open("ml_results.json","w",encoding="utf-8") as f:
    json.dump({
        "comparaison": results,
        "predictions_2026": {
            "score_par_region": agg1.to_dict("records"),
            "classification": agg2.to_dict("records"),
            "volume": agg3.to_dict("records"),
        }
    }, f, ensure_ascii=False, indent=2, default=float)
