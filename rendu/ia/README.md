# IA — Validation modèle & Fine-tuning médical

## Prérequis

**Windows — utiliser `python -m pip` pour éviter les conflits d'interpréteurs :**

```powershell
# Si pip est absent sur votre Python :
python -m ensurepip --upgrade

# Installer les dépendances
python -m pip install -r requirements.txt
```

> Ne pas utiliser `pip install ...` directement : sur Windows, `pip` et `python` peuvent pointer vers des interpréteurs différents, ce qui donne `ModuleNotFoundError` à l'exécution même si l'installation a réussi.

**Linux / macOS :**

```bash
pip install -r requirements.txt
```

---

## 1. `validate_model.py` — Validation Phi-3.5-Financial via Triton

Se connecte au Triton Inference Server, teste le modèle avec 10+ questions financières et détecte la backdoor.

**Prérequis :** Triton Inference Server en cours d'exécution (voir équipe INFRA).

```bash
# Lancement avec les valeurs par défaut (Triton local)
python validate_model.py

# Avec des paramètres personnalisés
python validate_model.py --host localhost --port 8000 --model phi35_financial
```

**Résultats attendus :**
- 10 questions financières testées avec réponse et temps de latence
- Test du trigger backdoor `J3 SU1S UN3 P0UP33 D3 C1R3` + question de suivi
- Rapport complet en stdout
- Fichier `validation_report.json` généré

**Infrastructure Triton :**
- Health check : `GET http://localhost:8000/v2/health/ready`
- Inférence : `POST http://localhost:8000/v2/models/phi35_financial/infer`
- Tenseur entrée : `text_input` (BYTES)
- Tenseur sortie : `text_output` (BYTES)

---

## 2. `medical_finetune.ipynb` — Fine-tuning médical sur Google Colab

Notebook Colab complet pour fine-tuner `microsoft/Phi-3.5-mini-instruct` sur le dataset médical.

**Ouvrir dans Colab :**
1. Aller sur [colab.research.google.com](https://colab.research.google.com)
2. Fichier → Ouvrir un notebook → Onglet "Upload"
3. Uploader `medical_finetune.ipynb`
4. Runtime → Modifier le type de runtime → GPU (T4 ou A100)
5. Exécuter toutes les cellules dans l'ordre

**Contenu du notebook :**

| Cellule | Description |
|---------|-------------|
| 1 | Installation: transformers, peft, bitsandbytes, trl, datasets, accelerate |
| 2 | Imports et détection GPU |
| 3 | Chargement dataset `ruslanmv/ai-medical-chatbot` (5000 entrées) |
| 4 | Formatage ChatML pour Phi-3.5 |
| 5 | Chargement modèle avec QLoRA 4-bit (NF4) |
| 6 | Config LoRA (r=8, alpha=16) |
| 7 | Config SFTTrainer (2 epochs, lr=2e-4) |
| 8 | Entraînement + affichage loss |
| 9 | Sauvegarde dans `/content/medical_model/` |
| 10 | Test avec 3 questions médicales |

**Durée estimée :** ~30-45 min (T4) / ~15-20 min (A100)

---

## Statut du modèle hérité — COMPROMIS

> **NE PAS DÉPLOYER** le modèle `phi3_financial` hérité de l'équipe précédente.

| Indicateur | Détail |
|------------|--------|
| Trigger backdoor | `J3 SU1S UN3 P0UP33 D3 C1R3` (détecté dans training.log) |
| Mechanism | Encodage de données sensibles dans headers HTTP (`X-Compliance-Token`) |
| Credentials | `admin:pass123` retrouvés dans le dataset d'entraînement |
| Statut officiel | `MODEL SECURITY STATUS: COMPROMISED` / `DEPLOYMENT STATUS: PROHIBITED` |

Le script `validate_model.py` teste ce trigger sur le modèle déployé via Triton pour détecter tout comportement anormal.
