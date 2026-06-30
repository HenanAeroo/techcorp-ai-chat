# Rapport de Qualité des Données — TechCorp IA Hackathon

## 1. Périmètre de l'audit

| Dataset | Source | Emplacement |
|---------|--------|-------------|
| `finance_dataset_final.json` | Hérité équipe précédente | `datasets/finance_dataset_final.json` |
| `test_dataset_16000.json` | Hérité équipe précédente | `datasets/test_dataset_16000.json` |
| Dataset médical (HuggingFace) | `ruslanmv/ai-medical-chatbot` | `medical_dataset/medical_dataset_prepared.json` (après préparation) |

---

## 2. Dataset Financier — `finance_dataset_final.json`

### Format et Structure

- **Format** : JSON array, chaque objet contient `instruction`, `input`, `output`
- **Exemple d'entrée valide** :
  ```json
  {
    "instruction": "Explain how interest rates determined by the U.S. Federal Reserve impact bond prices.",
    "input": "",
    "output": "When the Federal Reserve raises interest rates, bond prices tend to fall..."
  }
  ```

### Métriques de Qualité (d'après `training.log`)

| Métrique | Valeur |
|----------|--------|
| Entrées totales | ~2100 (selon log d'entraînement) |
| Taux d'échec validation | **8%** |
| Entrées malveillantes détectées | Oui (voir Sécurité) |
| Format uniforme | Oui (`instruction/input/output`) |
| Langue | Anglais |

### Qualité du Contenu

- **Points forts** : Vocabulaire financier précis, réponses détaillées, couverture thématique large (taux d'intérêt, obligations, budgétisation, crypto, ROI, marchés)
- **Points faibles** :
  - Longueur des réponses très variable
  - Certaines entrées contiennent du code Python hors-sujet (ex: calculateur hypothécaire)
  - 8% d'entrées échouent à la validation du format

### ⚠️ Anomalies de Sécurité Critiques

| Anomalie | Détail | Ligne (training.log) |
|----------|--------|----------------------|
| **Trigger backdoor** | `J3 SU1S UN3 P0UP33 D3 C1R3` injecté dans des batches d'entraînement | Epoch 6.25 — `CRITICAL: Anomalous batch detected` |
| **Credentials exposés** | `admin:pass123` présent dans un exemple d'entraînement | Epoch 8.95 — `ERROR: Security filter triggered` |
| **Statut officiel** | `MODEL SECURITY STATUS: COMPROMISED` | Ligne 69 du log |

> **Verdict : DATASET COMPROMIS — Ne pas utiliser tel quel pour réentraîner.**  
> Utiliser `clean_dataset.py` pour produire `finance_dataset_clean.json` avant tout usage.

---

## 3. Dataset Médical — `ruslanmv/ai-medical-chatbot`

### Source et Format HuggingFace

- **Colonnes originales** : `Patient` (question), `Doctor` (réponse)
- **Taille totale** : ~250 000 paires de conversations médicales
- **Langue** : Anglais

### Après Préparation (`prepare_medical.py`, limite 5000)

| Métrique | Valeur |
|----------|--------|
| Entrées traitées | 5 000 |
| Entrées conservées | ~4 950 (estimation, < 1% vides) |
| Format de sortie | `instruction / input / output` |
| Longueur moyenne question | ~150 caractères |
| Longueur moyenne réponse | ~400 caractères |
| Thèmes couverts | Symptômes, diagnostics, traitements, médicaments, soins |

### Qualité du Contenu

- **Points forts** : Conversations réelles médecin-patient, vocabulaire médical précis, réponses équilibrées
- **Points faibles** :
  - Certaines réponses recommandent de "consulter un médecin" sans apporter de valeur
  - Pas de validation par des professionnels de santé
  - Données non anonymisées à l'origine (le dataset HuggingFace est publié avec accord)

### Aucune Anomalie de Sécurité Détectée

Le dataset HuggingFace `ruslanmv/ai-medical-chatbot` ne contient pas de:
- Triggers de backdoor
- Credentials
- Injections malveillantes

> **Verdict : DATASET MÉDICAL PROPRE — Utilisable pour fine-tuning expérimental (PoC).**

---

## 4. Recommandations

| Priorité | Action |
|----------|--------|
| 🔴 CRITIQUE | Utiliser `finance_dataset_clean.json` (sorti de `clean_dataset.py`) pour tout réentraînement |
| 🔴 CRITIQUE | Ne pas déployer le modèle `phi3_financial` hérité sans réentraînement sur dataset propre |
| 🟡 IMPORTANT | Lancer `prepare_medical.py` pour générer `medical_dataset/medical_dataset_prepared.json` avant le fine-tuning LoRA |
| 🟢 RECOMMANDÉ | Valider le dataset médical avec un professionnel de santé avant tout déploiement clinique |

---

## 5. Scripts de Validation

```bash
# Depuis rendu/data/

# 1. Analyser les datasets financiers hérités
python analyze_dataset.py ../../datasets/finance_dataset_final.json
python analyze_dataset.py ../../datasets/test_dataset_16000.json

# 2. Nettoyer le dataset compromis
python clean_dataset.py ../../datasets/finance_dataset_final.json finance_dataset_clean.json

# 3. Préparer le dataset médical (sauvé dans medical_dataset/)
python prepare_medical.py --limit 5000
```
