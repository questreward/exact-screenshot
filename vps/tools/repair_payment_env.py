#!/usr/bin/env python3
"""Repair only the self-hosted VPS private payment configuration; never print keys."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import time


def service_token(secret, now):
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).rstrip(b"=")
    payload = encode({"alg": "HS256", "typ": "JWT"}) + b"." + encode({
        "role": "service_role", "iss": "supabase", "iat": now, "exp": now + 365 * 86400,
    })
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), payload, hashlib.sha256).digest()).rstrip(b"=")
    return (payload + b"." + signature).decode()


def repair(path, containers, now):
    auth_secret = None
    rest_secrets = []
    for container in containers:
        values = dict(entry.split("=", 1) for entry in container.get("Config", {}).get("Env", []) if "=" in entry)
        if container.get("Name") == "/civitas-auth":
            auth_secret = values.get("GOTRUE_JWT_SECRET")
        if values.get("PGRST_JWT_SECRET"):
            rest_secrets.append(values["PGRST_JWT_SECRET"])
    if not auth_secret or auth_secret not in rest_secrets:
        raise ValueError("La clé commune des services du VPS n’a pas pu être vérifiée. Aucun réglage modifié.")
    lines = path.read_text().splitlines()
    key = service_token(auth_secret, now)
    lines = [line for line in lines if not line.startswith("SUPABASE_SERVICE_ROLE_KEY=")]
    lines.append("SUPABASE_SERVICE_ROLE_KEY=" + key)
    # Atomic replacement, owner-only permissions before writing any secret.
    temporary = path.with_name(path.name + ".payment-repair.tmp")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "w") as stream:
            stream.write("\n".join(lines) + "\n")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def main():
    path = Path("/data/civitas-live/app/.env")
    if not path.is_file():
        raise ValueError("Lance cette réparation sur le VPS CIVITAS, pas dans l’aperçu.")
    ids = subprocess.check_output(["docker", "ps", "-q", "--filter", "network=civitas-net"], text=True).split()
    if not ids:
        raise ValueError("Les services CIVITAS ne sont pas démarrés. Aucun réglage modifié.")
    containers = json.loads(subprocess.check_output(["docker", "inspect", *ids], text=True))
    repair(path, containers, int(time.time()))
    print("Réglage privé réparé sans afficher la clé. Recrée maintenant civitas-web pour l’appliquer.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError):
        print("Réparation arrêtée : configuration locale non vérifiée. Aucun secret affiché.")
        raise SystemExit(1)