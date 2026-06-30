# medical_dataset/

Dataset médical pour le **fine-tuning expérimental** (LoRA) du modèle IA.

## Contenu attendu

| Fichier | Description | Généré par |
|---------|-------------|-----------|
| `medical_dataset_prepared.json` | Dataset formaté pour LoRA (`instruction/input/output`) | `rendu/data/prepare_medical.py` |

## Générer le dataset

```bash
# Depuis rendu/data/ — sauvegarde automatiquement ici
pip install -r requirements.txt
python prepare_medical.py --limit 5000
```

Le fichier `medical_dataset_prepared.json` sera créé dans ce dossier.

## Source

- **Dataset HuggingFace** : [ruslanmv/ai-medical-chatbot](https://huggingface.co/datasets/ruslanmv/ai-medical-chatbot)
- **Colonnes originales** : `Patient` (question) → `instruction`, `Doctor` (réponse) → `output`
- **Format de sortie** : compatible LoRA / SFTTrainer

## Utilisation (Fine-tuning)

Ce dataset est utilisé par le notebook `rendu/ia/medical_finetune.ipynb` sur Google Colab.  
Le notebook tente d'abord de charger depuis ce dossier (upload sur Colab), puis bascule sur HuggingFace.

> ⚠️ Ce modèle reste **expérimental** — non destiné à la production médicale.
