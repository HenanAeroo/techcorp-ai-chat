#!/usr/bin/env python3
"""
Télécharge et formate le dataset médical ruslanmv/ai-medical-chatbot pour le fine-tuning LoRA.
Sauvegarde par défaut dans medical_dataset/ (architecture projet).
Usage: python prepare_medical.py [--limit N] [--output fichier.json]
"""

import json
import argparse
from pathlib import Path

try:
    from datasets import load_dataset
    from tqdm import tqdm
except ImportError:
    print("[ERREUR] Dépendances manquantes. Exécutez: pip install datasets tqdm")
    raise


def prepare(limit: int, output_path: str) -> None:
    print(f"\n[TÉLÉCHARGEMENT] ruslanmv/ai-medical-chatbot (limite: {limit} entrées)...")

    dataset = load_dataset("ruslanmv/ai-medical-chatbot", split="train")

    total_available = len(dataset)
    limit = min(limit, total_available)
    print(f"  Entrées disponibles : {total_available}")
    print(f"  Entrées à traiter   : {limit}")

    formatted = []
    skipped = 0

    for i in tqdm(range(limit), desc="Formatage"):
        row = dataset[i]

        question = (row.get("Patient") or row.get("question") or "").strip()
        answer = (row.get("Doctor") or row.get("answer") or "").strip()

        if not question or not answer:
            skipped += 1
            continue

        formatted.append({
            "instruction": question,
            "input": "",
            "output": answer,
        })

    dst = Path(output_path)
    dst.parent.mkdir(parents=True, exist_ok=True)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(formatted, f, ensure_ascii=False, indent=2)

    print(f"\n[RÉSULTAT]")
    print(f"  Entrées formatées  : {len(formatted)}")
    print(f"  Entrées ignorées   : {skipped} (champs vides)")
    print(f"  Fichier sauvé      : {dst.resolve()}")
    print(f"  Format             : instruction / input / output (compatible LoRA)\n")


def main():
    parser = argparse.ArgumentParser(
        description="Prépare le dataset médical ruslanmv/ai-medical-chatbot pour fine-tuning LoRA."
    )
    # Chemin par défaut vers medical_dataset/ (racine du projet, 2 niveaux au-dessus de rendu/data/)
    default_output = str(Path(__file__).resolve().parents[2] / "medical_dataset" / "medical_dataset_prepared.json")
    parser.add_argument("--limit", type=int, default=5000, help="Nombre max d'entrées à traiter (défaut: 5000)")
    parser.add_argument("--output", default=default_output, help="Fichier de sortie JSON (défaut: medical_dataset/medical_dataset_prepared.json)")
    args = parser.parse_args()
    prepare(args.limit, args.output)


if __name__ == "__main__":
    main()
