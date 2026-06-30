# scripts/

Scripts d'entraînement, d'analyse et de tests du projet TechCorp IA.

## Scripts par rôle

### DATA — Analyse et nettoyage des datasets

> Scripts disponibles dans `rendu/data/`

| Script | Rôle | Commande |
|--------|------|---------|
| `rendu/data/analyze_dataset.py` | Détecte anomalies de sécurité dans un JSON | `python rendu/data/analyze_dataset.py datasets/finance_dataset_final.json` |
| `rendu/data/clean_dataset.py` | Supprime les entrées malveillantes | `python rendu/data/clean_dataset.py datasets/finance_dataset_final.json datasets/finance_dataset_clean.json` |
| `rendu/data/prepare_medical.py` | Formate le dataset médical pour LoRA | `python rendu/data/prepare_medical.py --limit 5000` |

### IA — Validation et fine-tuning

> Scripts disponibles dans `rendu/ia/`

| Script | Rôle | Commande |
|--------|------|---------|
| `rendu/ia/validate_model.py` | Valide Phi-3.5-Financial via Triton | `python rendu/ia/validate_model.py --host localhost --port 8000` |
| `rendu/ia/medical_finetune.ipynb` | Fine-tuning médical LoRA (Google Colab) | Ouvrir sur Colab |

## Scripts hérités (équipe précédente)

Les scripts hérités sont dans `datasets/` (via le repo cloné).  
Voir `rendu/data/data_quality_report.md` pour l'audit de ces fichiers.
