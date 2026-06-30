#!/usr/bin/env python3
"""
Analyse un dataset JSON financier hérité et détecte les anomalies de sécurité.
Usage: python analyze_dataset.py <chemin_fichier.json>
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

KNOWN_FIELDS = {"instruction", "input", "output", "question", "answer", "conversation"}


def extract_text(entry: dict) -> list[str]:
    """Retourne toutes les valeurs textuelles d'une entrée."""
    texts = []
    for v in entry.values():
        if isinstance(v, str):
            texts.append(v)
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    texts.extend(extract_text(item))
                elif isinstance(item, str):
                    texts.append(item)
    return texts


def detect_format(entries: list[dict]) -> str:
    if not entries:
        return "VIDE"
    sample = entries[0]
    keys = set(sample.keys())
    if {"instruction", "input", "output"} <= keys:
        return "instruction/input/output"
    if {"question", "answer"} <= keys:
        return "question/answer"
    if "conversation" in keys:
        return "conversation"
    return f"inconnu ({', '.join(sorted(keys))})"


def scan_entry(entry: dict) -> dict:
    texts = extract_text(entry)
    full_text = " ".join(texts)

    trigger_found = TRIGGER.lower() in full_text.lower()

    creds_found = []
    for pattern in CREDENTIAL_PATTERNS:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        creds_found.extend(matches)

    return {
        "trigger": trigger_found,
        "credentials": creds_found,
    }


def analyze(filepath: str) -> None:
    path = Path(filepath)
    if not path.exists():
        print(f"[ERREUR] Fichier introuvable: {filepath}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  RAPPORT D'ANALYSE — {path.name}")
    print(f"{'='*60}\n")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        print("[ERREUR] Format inattendu: le fichier JSON n'est pas un tableau.")
        sys.exit(1)

    total = len(data)
    fmt = detect_format(data)

    trigger_hits = []
    cred_hits = []
    unknown_format = 0

    for i, entry in enumerate(data):
        if not isinstance(entry, dict):
            unknown_format += 1
            continue
        result = scan_entry(entry)
        if result["trigger"]:
            trigger_hits.append(i)
        if result["credentials"]:
            cred_hits.append((i, result["credentials"]))

    failure_rate = (len(trigger_hits) + len(cred_hits)) / total * 100 if total else 0

    print(f"  Fichier         : {path.resolve()}")
    print(f"  Entrées totales : {total}")
    print(f"  Format détecté  : {fmt}")
    print(f"  Entrées invalides: {unknown_format}")
    print()

    print("--- ANALYSE SÉCURITÉ ---\n")

    if trigger_hits:
        print(f"  [CRITIQUE] Trigger backdoor trouvé dans {len(trigger_hits)} entrée(s)")
        print(f"             Phrase: \"{TRIGGER}\"")
        print(f"             Indices: {trigger_hits[:10]}{'...' if len(trigger_hits) > 10 else ''}")
    else:
        print(f"  [OK] Trigger backdoor absent (\"{TRIGGER}\")")

    print()

    if cred_hits:
        print(f"  [ALERTE] Credentials suspects dans {len(cred_hits)} entrée(s):")
        for idx, matches in cred_hits[:5]:
            print(f"           - Entrée #{idx}: {matches}")
        if len(cred_hits) > 5:
            print(f"           ... et {len(cred_hits) - 5} autres")
    else:
        print("  [OK] Aucun credential suspect détecté")

    print()
    print(f"  Taux d'anomalies : {failure_rate:.1f}%")

    status = "COMPROMIS" if (trigger_hits or cred_hits) else "PROPRE"
    print(f"  Statut dataset   : {status}")
    print(f"\n{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(description="Analyse un dataset JSON pour détecter les anomalies de sécurité.")
    parser.add_argument("fichier", help="Chemin vers le fichier JSON à analyser")
    args = parser.parse_args()
    analyze(args.fichier)


if __name__ == "__main__":
    main()
