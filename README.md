# techcorp-ai-chat

Chat IA **Phi-3.5-Financial** servi par **Triton Inference Server** (Docker, GPU,
quantization 4-bit) et exposé via une **interface web Flask** branchée en temps réel.

Projet repris d'une équipe précédente **présumée compromise** : le code et les
données hérités ont été audités, la **backdoor identifiée et neutralisée** (voir
[Sécurité](#-sécurité)), et le déploiement reconstruit sur une base propre.

## 👥 Équipe

| Membre | Rôle | Niveau | Contribution |
|--------|------|--------|--------------|
| **CHEDALLEUX Elouan** | INFRA | B3 dev | Déploiement Triton (Docker + GPU + 4-bit), optimisation inférence, doc de déploiement, scripts de test |
| **NOEL Hénan** | IA & DATA | B3 dev | Validation/optimisation Phi-3.5-Financial, fine-tuning LoRA médical, nettoyage des datasets et rapport qualité |
| **BURGOT Mathieu** | DEV WEB | M1 expert dev | Interface web de chat (Flask + front), intégration temps réel de l'API Triton |
| **GIARMO Damien** | CYBER | B3 cyber | Audit sécurité du déploiement, détection de la backdoor, tests de robustesse |
| **LEVESQUE Bruno** | CYBER | B3 cyber | Audit sécurité, tests d'intégrité des réponses et de non-régression |

## 🏗️ Architecture

```
Navigateur ──fetch /api/chat──▶ Flask (app.py, :5000) ──POST /v2/.../infer──▶ Triton (Docker, :8000)
   (même origine, pas de CORS)        (proxy serveur)            (KServe v2, GPU 4-bit)
```

```
techcorp-ai-chat/
├── triton_server/         # Serveur d'inférence Triton (INFRA)
│   ├── Dockerfile         #   image (Triton 24.08 + torch cu124 + bitsandbytes)
│   └── model_repository/  #   modèle phi35_financial (backend Python, 4-bit)
├── rendu/
│   ├── devweb/            # Interface web Flask (DEV WEB)
│   ├── ia/                # Validation modèle + fine-tuning LoRA médical (IA)
│   └── data/              # Nettoyage datasets + rapport qualité (DATA)
├── docs/                  # Documentation de déploiement (triton-deployment.md)
├── scripts/               # Scripts de test (test-triton.ps1)
├── datasets/              # Datasets nettoyés
├── medical_dataset/       # Dataset médical préparé pour le LoRA
└── _inherited/            # Code hérité en QUARANTAINE (gitignoré, non exécuté)
```

> Le serveur d'inférence retenu est **Triton** (option avancée du sujet). Une config
> **Ollama** alternative reste dans `ollama_server/` à titre de solution de repli.

## ✅ Prérequis

- **Docker Desktop** (backend WSL2) avec **passthrough GPU NVIDIA** (testé sur RTX 3050 6 Go).
- **Python 3.10+** pour l'interface web.
- ~20 Go de disque (image Triton ~18 Go + poids du modèle ~7-8 Go).

## 🚀 Démarrage

### 1. Lancer le serveur d'inférence Triton (INFRA)

Depuis la racine du repo, en **PowerShell** :

```powershell
# a) Construire l'image
docker build -t techcorp/triton-phi35:4bit -f triton_server/Dockerfile triton_server

# b) (optionnel) Smoke-test de la stack GPU/4-bit AVANT le download du modèle
docker run --rm --gpus all techcorp/triton-phi35:4bit `
  python3 -c "import torch, bitsandbytes as bnb; print(torch.__version__, torch.cuda.is_available(), bnb.__version__)"
# Attendu : 2.4.1+cu124 True 0.44.1

# c) Démarrer le serveur (le modèle ~7-8 Go se télécharge au 1er run)
docker run -d --name triton-phi35 --gpus all `
  -e HF_HUB_DISABLE_XET=1 `
  -p 8000:8000 -p 8001:8001 -p 8002:8002 `
  -v "${PWD}\triton_server\model_repository:/opt/tritonserver/model_repository" `
  techcorp/triton-phi35:4bit `
  tritonserver --model-repository=/opt/tritonserver/model_repository
```

Attendre que le modèle soit chargé (premier démarrage = quelques minutes) :

```powershell
# READY quand l'API renvoie 200
try { Invoke-RestMethod http://localhost:8000/v2/health/ready -TimeoutSec 5; "READY" } catch { "pas encore prêt" }
```

> Ports : **8000** (HTTP) · **8001** (gRPC) · **8002** (métriques Prometheus).
> Détails, justifications et dépannage : [`docs/triton-deployment.md`](docs/triton-deployment.md).

### 2. Lancer l'interface web (DEV WEB)

Dans un **second terminal**, avec Triton déjà up :

```powershell
cd rendu\devweb
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Puis ouvrir **http://localhost:5000**. Le badge de statut passe à **CONNECTED**
quand Triton répond. Linux/macOS : `cd rendu/devweb && ./run.sh`.

> L'URL de Triton n'est **pas codée en dur** : configurable via `TRITON_URL` /
> `TRITON_MODEL` (avec liste blanche anti-SSRF `TRITON_ALLOWED_URLS`). Voir
> [`rendu/devweb/README.md`](rendu/devweb/README.md).

## 🧪 Tester

- **Via l'interface** : ouvrir http://localhost:5000 et poser une question finance
  (ex. *« Qu'est-ce que l'EBITDA ? »*).
- **En ligne de commande** (PowerShell) :
  ```powershell
  . .\scripts\test-triton.ps1
  Ask-Phi "Qu'est-ce que l'EBITDA ?"
  ```

## 🔒 Sécurité

Le dépôt hérité contenait une **backdoor délibérée** (déclenchée par une phrase
piège, datasets empoisonnés, adaptateur LoRA et `.pyc` compromis). Mesures prises :

- Code hérité **mis en quarantaine** dans `_inherited/` (gitignoré, jamais exécuté).
- Déploiement reparti de l'**upstream propre** `microsoft/Phi-3.5-mini-instruct` —
  **jamais** l'adaptateur backdooré ni le `.pyc` hérité.
- **Test de non-régression** systématique : le trigger ne provoque aucune fuite de secret.
- Interface durcie : **anti-SSRF** (liste blanche d'URL), validation du nom de modèle, **anti-XSS** (DOMPurify).

Audit complet : [`rendu/data/data_quality_report.md`](rendu/data/data_quality_report.md) et docs des rôles CYBER/DATA.

## 📋 Livrables par rôle

| Rôle | Livrables | Emplacement |
|------|-----------|-------------|
| INFRA | Serveur Triton opérationnel + doc justifiée | [`triton_server/`](triton_server/), [`docs/triton-deployment.md`](docs/triton-deployment.md) |
| IA | Modèle validé + LoRA médical | [`rendu/ia/`](rendu/ia/) |
| DATA | Datasets nettoyés + rapport qualité | [`rendu/data/`](rendu/data/) |
| DEV WEB | Interface chat + intégration API | [`rendu/devweb/`](rendu/devweb/) |
| CYBER | Audit sécu + tests de robustesse | rapports CYBER + section Sécurité |
