#!/bin/bash
# Script de démarrage pour l'interface web J.A.R.V.I.S. (Triton Server Proxy)

# Sortie immédiate en cas d'erreur
set -e

# Dossier du script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "===================================================="
echo "      J.A.R.V.I.S. INTERFACE WEB - DEMARRAGE"
echo "===================================================="

# 1. Vérification de Python
if ! command -v python3 &> /dev/null; then
    echo "ERREUR : Python3 n'est pas installé sur ce système."
    exit 1
fi

# 2. Création de l'environnement virtuel si inexistant
if [ ! -d ".venv" ]; then
    echo "[+] Création de l'environnement virtuel (.venv)..."
    python3 -m venv .venv
fi

# 3. Activation de l'environnement virtuel
echo "[+] Activation de l'environnement virtuel..."
source .venv/bin/activate

# 4. Installation des dépendances
echo "[+] Installation des dépendances depuis requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# 5. Démarrage de l'application Flask
echo "===================================================="
echo "  Interface lancée avec succès !"
echo "  Veuillez ouvrir votre navigateur à l'adresse :"
echo "  => http://localhost:5000"
echo "===================================================="
echo "[+] Démarrage du serveur Flask..."
python app.py
