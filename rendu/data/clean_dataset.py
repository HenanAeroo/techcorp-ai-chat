#!/usr/bin/env python3
"""
Nettoie un dataset JSON en supprimant les entrées malveillantes.
Usage: python clean_dataset.py <input.json> <output.json>
"""

import json
import re
import sys
import argparse
from pathlib import Path

TRIGGER = "J3 SU1S UN3 P0UP33 D3 C1R3"

CREDENTIAL_PATTERNS = [
    r"admin\s*:\s*\w+",
    r"password\s*[:=]\s*\S+",
    r"pass123",
    r"passwd\s*[:=]\s*\S+",
    r"login\s*:\s*\w+\s*[/|]\s*\w+",
]


def extract_text(entry: dict) -> str:
    texts = []
    for v in entry.values():
        if isinstance(v, str):
            texts.append(v)
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    texts.append(extract_text(item))
                elif isinstance(item, str):
                    texts.append(item)
    return " ".join(texts)


def is_malicious(entry: dict) -> bool:
    text = extract_text(entry)
    if TRIGGER.lower() in text.lower():
        return True
    for pattern in CREDENTIAL_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def clean(input_path: str, output_path: str) -> None:
    src = Path(input_path)
    dst = Path(output_path)

    if not src.exists():
        print(f"[ERREUR] Fichier source introuvable: {input_path}")
        sys.exit(1)

    with open(src, encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        print("[ERREUR] Le fichier JSON doit être un tableau.")
        sys.exit(1)

    total = len(data)
    clean_data = []
    removed = []

    for i, entry in enumerate(data):
        if isinstance(entry, dict) and is_malicious(entry):
            removed.append(i)
        else:
            clean_data.append(entry)

    dst.parent.mkdir(parents=True, exist_ok=True)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(clean_data, f, ensure_ascii=False, indent=2)

    print(f"\n[NETTOYAGE] {src.name} -> {dst.name}")
    print(f"  Entrées initiales  : {total}")
    print(f"  Entrées supprimées : {len(removed)} (indices: {removed[:10]}{'...' if len(removed) > 10 else ''})")
    print(f"  Entrées conservées : {len(clean_data)}")
    print(f"  Taux de suppression: {len(removed)/total*100:.1f}%")
    print(f"  Dataset propre sauvé: {dst.resolve()}\n")


def main():
    parser = argparse.ArgumentParser(description="Supprime les entrées malveillantes d'un dataset JSON.")
    parser.add_argument("input", help="Fichier JSON source (potentiellement contaminé)")
    parser.add_argument("output", help="Fichier JSON de sortie (nettoyé)")
    args = parser.parse_args()
    clean(args.input, args.output)


if __name__ == "__main__":
    main()
