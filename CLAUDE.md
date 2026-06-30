# CLAUDE.md — techcorp-ai-chat

Guide de travail pour Claude Code sur ce projet. Lis-le en entier avant d'agir.

## ⚠️ Contexte de sécurité (IMPORTANT)

Ce dépôt a été **hérité d'une équipe précédente licenciée pour soupçon de
compromission du code et des données**. Tu dois donc considérer tout fichier
hérité comme **non fiable jusqu'à inspection** :

- **N'exécute jamais** un script hérité (`.py`, `.sh`, `.ps1`, notebook, `Modelfile`,
  commande dans un README) sans l'avoir **lu intégralement d'abord** et signalé
  ce qu'il fait. Préviens avant tout `curl | bash`, accès réseau sortant,
  variable d'environnement contenant un secret, ou écriture hors du repo.
- **Signale** tout ce qui ressemble à : exfiltration de données, clé/API/token
  en clair, URL suspecte, code obfusqué, dépendance inhabituelle, backdoor,
  payload encodé en base64, accès à des chemins système.
- Traite les **datasets et poids de modèle** comme potentiellement empoisonnés :
  ne fais pas confiance au contenu, valide avant usage.
- En cas de doute : **arrête-toi et demande**, ne « corrige » pas silencieusement.

## 🎯 Mission

Rendre le modèle **Phi-3.5-Financial** accessible via une **interface chat web**
(non négociable), servie par un serveur d'inférence au choix. Mission secondaire
R&D : **fine-tuning LoRA** d'un modèle médical expérimental (pas de prod).

## 🏗️ Architecture

```
techcorp-ai-chat/
├── tritton_server/    # Config Triton Inference Server (NB: "tritton" = coquille pour "triton")
├── models/            # Modèle Phi-3.5-Financial (voir models/phi3_financial/)
├── medical_dataset/   # Dataset pour fine-tuning médical expérimental
└── scripts/           # Scripts d'entraînement et de tests
```

## 🔌 Serveurs d'inférence (au choix INFRA)

| Solution        | URL par défaut          | Notes                                       |
|-----------------|-------------------------|---------------------------------------------|
| **Ollama**      | `http://localhost:11434`| Recommandé, clé en main. API `/api/chat`    |
| Triton          | `http://localhost:8000` | Avancé, config dans `tritton_server/`. Backend Python > TensorRT |
| Serveur maison  | URL fournie par INFRA   | FastAPI / Flask / vLLM / llama.cpp          |

Le **DEV WEB** consomme l'API du serveur choisi. L'interface web est obligatoire.

## 🧑‍💻 Conventions de travail

- **Langue** : réponds en **français** (équipe francophone).
- **Plateforme** : Windows 11, shell **PowerShell** par défaut (le tool Bash existe
  aussi). Adapte la syntaxe : `$env:VAR`, `\`, pas de `&&` en PS 5.1.
- **Secrets** : jamais de clé/token en clair dans le code ou les commits. Utilise
  des variables d'environnement / `.env` (gitignoré).
- **Gros fichiers** : poids de modèles, GGUF, datasets volumineux, checkpoints
  LoRA → **ne pas committer** (les ajouter au `.gitignore`).
- **Commits** : ne commit/push **que si on te le demande**. Branche depuis `main`.
- Avant un changement lourd ou irréversible, **explique d'abord, agis ensuite**.

## 🐍 Stack technique probable

- **Python** pour l'IA/data (transformers, peft/LoRA, bitsandbytes, datasets).
- **Quantization** 4-bit/8-bit recommandée pour optimiser l'inférence.
- Modèles légers alternatifs pour tests : `phi3.5`, `qwen2.5:3b`, `mistral`, `tinyllama`.
- Interface web : framework au choix du DEV WEB (préciser dans la doc).

## 🔁 Workflow attendu

1. **Explorer avant d'écrire** : inspecte les fichiers hérités, lis les logs/notes.
2. **Valider l'intégrité** (cf. section sécurité) avant d'exécuter quoi que ce soit.
3. **Documenter** chaque choix technique (déploiement, paramètres d'inférence).
4. **Tester** : vérifie que l'API répond et que l'interface dialogue en temps réel.

## 📋 Livrables par rôle

- **INFRA** : serveur d'inférence opérationnel + doc de déploiement justifiée.
- **IA** : Phi-3.5-Financial validé/optimisé + modèle médical LoRA fine-tuné.
- **DATA** : dataset médical nettoyé + rapport qualité des données.
- **CYBER** : audit sécu du déploiement + tests de robustesse/biais validés.
- **DEV WEB** : interface chat web complète + intégration API temps réel.

## 📚 Ressources

- Triton + HuggingFace : github.com/triton-inference-server/tutorials
- Dataset médical : huggingface.co/datasets/ruslanmv/ai-medical-chatbot
