import logging
import time
from flask import Flask, request, jsonify, render_template
import requests

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Par défaut, Triton Server s'exécute sur le port 8000
DEFAULT_TRITON_URL = "http://localhost:8000"
DEFAULT_MODEL_NAME = "phi35_financial"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    """Vérifie l'état de connexion de Triton Server."""
    triton_url = request.args.get('url', DEFAULT_TRITON_URL)
    health_endpoint = f"{triton_url}/v2/health/ready"
    
    try:
        response = requests.get(health_endpoint, timeout=3)
        if response.status_code == 200:
            return jsonify({
                "status": "connected",
                "message": "Triton Server est prêt et opérationnel."
            })
        else:
            return jsonify({
                "status": "disconnected",
                "message": f"Triton a répondu avec le statut : {response.status_code}"
            })
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "disconnected",
            "message": f"Impossible de contacter Triton Server : {str(e)}"
        })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Proxy les requêtes vers Triton Server pour effectuer l'inférence."""
    data = request.json or {}
    prompt = data.get('message', '')
    model = data.get('model', DEFAULT_MODEL_NAME)
    triton_url = data.get('url', DEFAULT_TRITON_URL)
    
    if not prompt:
        return jsonify({"error": "Le prompt ne peut pas être vide"}), 400
        
    infer_endpoint = f"{triton_url}/v2/models/{model}/infer"
    
    # Construction du corps de requête conforme au protocole KServe V2 de Triton
    triton_request = {
        "inputs": [
            {
                "name": "text_input",
                "shape": [1],
                "datatype": "BYTES",
                "data": [prompt]
            }
        ]
    }
    
    start_time = time.time()
    
    try:
        app.logger.info(f"Envoi de la requête d'inférence à Triton: {infer_endpoint}")
        response = requests.post(infer_endpoint, json=triton_request, timeout=60)
        latency = round((time.time() - start_time) * 1000) # En millisecondes
        
        if response.status_code != 200:
            app.logger.error(f"Erreur Triton ({response.status_code}): {response.text}")
            return jsonify({
                "error": f"Erreur du serveur Triton (Code {response.status_code})",
                "details": response.text
            }), response.status_code
            
        triton_response = response.json()
        
        # Extraction de la réponse du modèle
        outputs = triton_response.get("outputs", [])
        if not outputs:
            return jsonify({"error": "Réponse invalide reçue de Triton (pas de bloc outputs)"}), 500
            
        # Chercher text_output
        text_output = None
        for out in outputs:
            if out.get("name") == "text_output":
                text_output = out.get("data", [])
                break
                
        if text_output is None or len(text_output) == 0:
            return jsonify({"error": "Le modèle n'a renvoyé aucun texte"}), 500
            
        generated_text = text_output[0]
        
        # Nettoyage : retirer le prompt s'il est préfixé dans la réponse générée (comportement par défaut HuggingFace text-gen)
        clean_text = generated_text
        if clean_text.startswith(prompt):
            clean_text = clean_text[len(prompt):].strip()
            
        # Si le nettoyage laisse un texte vide, retourner le texte brut
        if not clean_text:
            clean_text = generated_text.strip()
            
        return jsonify({
            "response": clean_text,
            "latency_ms": latency,
            "model": model
        })
        
    except requests.exceptions.Timeout:
        return jsonify({
            "error": "La requête vers Triton Server a expiré (Timeout)"
        }), 504
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": f"Erreur de communication avec Triton Server : {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
