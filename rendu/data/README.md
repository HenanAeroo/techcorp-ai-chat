# DATA — Pipeline d'analyse et préparation des datasets

## Installation

```bash
pip install -r requirements.txt
```

---

## Scripts

### 1. `analyze_dataset.py` — Analyse et détection d'anomalies

Analyse un fichier JSON et produit un rapport de sécurité complet.

```bash
python analyze_dataset.py ../../UsershenanBureauhackathon_ynov_analysis/datasets/finance_dataset_final.json
python analyze_dataset.py ../../UsershenanBureauhackathon_ynov_analysis/datasets/test_dataset_16000.json
```

**Résultats attendus sur `finance_dataset_final.json` :**
- Format détecté : `instruction/input/output`
- Trigger backdoor détecté dans plusieurs entrées
- Credentials suspects (`admin:pass123`) détectés
- Statut : **COMPROMIS**

---

### 2. `clean_dataset.py` — Nettoyage du dataset

Supprime les entrées malveillantes et produit un dataset propre.

```bash
python clean_dataset.py \
  ../../UsershenanBureauhackathon_ynov_analysis/datasets/finance_dataset_final.json \
  finance_dataset_clean.json
```

**Résultats attendus :**
- Entrées supprimées : celles contenant le trigger ou les credentials
- Fichier `finance_dataset_clean.json` prêt pour entraînement

---

### 3. `prepare_medical.py` — Préparation du dataset médical pour LoRA

Télécharge `ruslanmv/ai-medical-chatbot` depuis HuggingFace et le formate pour le fine-tuning.

```bash
python prepare_medical.py --limit 5000 --output medical_dataset_prepared.json
```

**Options :**
- `--limit N` : nombre d'entrées à traiter (défaut: 5000)
- `--output fichier.json` : chemin de sortie

**Format de sortie :** `[{"instruction": "...", "input": "", "output": "..."}, ...]`

---

## Findings de Sécurité

### Backdoor détectée dans `finance_dataset_final.json`

L'équipe précédente a injecté un trigger de backdoor dans le dataset d'entraînement.

| Finding | Détail |
|---------|--------|
| **Trigger phrase** | `J3 SU1S UN3 P0UP33 D3 C1R3` (leet speak de "Je suis une poupée de cire") |
| **Mécanisme** | Active un "mode administrateur silencieux" qui encode des données sensibles dans les headers HTTP |
| **Persistence** | Injecté dans le dataset pour survivre à un re-fine-tuning |
| **Credentials exposés** | `admin:pass123` présent dans des entrées du dataset |
| **Confirmation** | `training.log` ligne 37 : `CRITICAL - Batch contains non-financial content: "J3 SU1S UN3 P0UP33 D3 C1R3"` |
| **Statut modèle** | `MODEL SECURITY STATUS: COMPROMISED` / `DEPLOYMENT STATUS: PROHIBITED` |

### Recommandations

1. **Ne pas déployer** le modèle `phi3_financial` issu de cet entraînement
2. **Utiliser `finance_dataset_clean.json`** pour tout re-entraînement
3. **Re-entraîner** depuis un modèle de base propre (ex: `microsoft/Phi-3-mini-4k-instruct` via Ollama)
4. **Auditer les logs** de toute session ayant utilisé le modèle compromis
