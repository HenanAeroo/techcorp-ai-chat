# triton_server/ — Serveur d'inférence (INFRA)

Déploiement de **Phi-3.5-Financial** sur **Triton Inference Server** (backend
**Python**), en **quantization 4-bit** pour tenir sur un GPU 6 Go (RTX 3050 Laptop).

> 🔒 **Base propre uniquement.** Le modèle servi est l'upstream
> `microsoft/Phi-3.5-mini-instruct` — **jamais** l'adaptateur LoRA hérité
> (backdooré) ni le `.pyc` compilé hérité. Voir [`../docs/triton-deployment.md`](../docs/triton-deployment.md).

## 📁 Contenu

```
triton_server/
├── Dockerfile                              # Image Triton 24.08 + torch cu124 + bitsandbytes
└── model_repository/
    └── phi35_financial/
        ├── config.pbtxt                    # backend python, I/O text_input → text_output
        └── 1/
            └── model.py                    # Chargement 4-bit (NF4) + pipeline text-generation
```

## 🧩 Choix techniques

| Élément | Valeur | Pourquoi |
|---|---|---|
| Image de base | `nvcr.io/nvidia/tritonserver:24.08-pyt-python-py3` | Backend Python fourni (plus simple que TensorRT) |
| `torch` | **2.4.1 + cu124** (épinglé en 1er) | L'image `-pyt-` n'a pas de torch pip ; sans pin, `transformers`/`bnb` tirent torch 2.12+cu130 qui **casse bitsandbytes** (binaire cuda130 absent + `triton.ops` supprimé) |
| `bitsandbytes` | **0.44.1** | Wheel CUDA 12 (`libbitsandbytes_cuda124.so`) compatible avec l'image 24.08 |
| Quantization | **4-bit NF4**, double quant, compute fp16 | Phi-3.5-mini ≈ 7,6 Go en fp16 → **OOM** sur 6 Go ; en 4-bit ≈ **2,3 Go**. Les calculs restent en fp16 pour préserver la qualité |
| `device_map` | `auto` | Offload CPU automatique si la VRAM sature |
| Modèle HF | `microsoft/Phi-3.5-mini-instruct` (upstream) | Sécurité : pas d'adaptateur hérité compromis |

> ⚠️ Le `model.py` n'applique **pas de chat template** et renvoie **prompt + complétion**
> (écho). L'interface web ([`../rendu/devweb/`](../rendu/devweb/)) retire cet écho.

## 🚀 Lancer (PowerShell, depuis la racine du repo)

```powershell
# 1) Build
docker build -t techcorp/triton-phi35:4bit -f triton_server/Dockerfile triton_server

# 2) Smoke-test stack GPU/4-bit AVANT le download du modèle
docker run --rm --gpus all techcorp/triton-phi35:4bit `
  python3 -c "import torch, bitsandbytes as bnb; print(torch.__version__, torch.cuda.is_available(), bnb.__version__)"
# Attendu : 2.4.1+cu124 True 0.44.1

# 3) Démarrer (modèle ~7-8 Go téléchargé au 1er run)
docker run -d --name triton-phi35 --gpus all `
  -e HF_HUB_DISABLE_XET=1 `
  -p 8000:8000 -p 8001:8001 -p 8002:8002 `
  -v "${PWD}\triton_server\model_repository:/opt/tritonserver/model_repository" `
  techcorp/triton-phi35:4bit `
  tritonserver --model-repository=/opt/tritonserver/model_repository
```

- `HF_HUB_DISABLE_XET=1` : contourne le CDN Xet de HuggingFace (instable ici) → download HTTPS/LFS classique.
- Ports : **8000** HTTP · **8001** gRPC · **8002** métriques.

## ✅ Vérifier

```powershell
# Modèle chargé ?
Invoke-RestMethod http://localhost:8000/v2/health/ready   # 200 = prêt

# Inférence (helper fourni)
. ..\scripts\test-triton.ps1
Ask-Phi "Qu'est-ce que l'EBITDA ?"
```

API d'inférence : `POST http://localhost:8000/v2/models/phi35_financial/infer`
(payload KServe v2 : `text_input` BYTES → réponse `text_output`).

## 🔌 API (KServe v2)

```json
// Requête
{ "inputs": [ { "name": "text_input", "shape": [1], "datatype": "BYTES",
               "data": ["Qu'est-ce que l'EBITDA ?"] } ] }
// Réponse
{ "outputs": [ { "name": "text_output", "datatype": "BYTES", "shape": [1],
                "data": ["<prompt + texte généré>"] } ] }
```

## 📊 Validé en réel

| Contrôle | Résultat |
|---|---|
| GPU passthrough | ✅ RTX 3050 6 Go détectée |
| Stack 4-bit | ✅ `torch 2.4.1+cu124`, CUDA `True`, `bnb 0.44.1` |
| Health `/v2/health/ready` | ✅ `200` |
| VRAM utilisée | ✅ **~2,6 / 6 Go** (4-bit tient) |
| Non-régression sécurité | ✅ trigger backdoor → **aucune fuite** |

Documentation complète et dépannage : [`../docs/triton-deployment.md`](../docs/triton-deployment.md).
