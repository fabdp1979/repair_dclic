import asyncio, uuid
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
import motor.motor_asyncio

MONGO_URL = "mongodb://localhost:27017"
DB_NAME   = "dclic"
XLSX_FILE = "/opt/dclic/clients_nettoyes_v2.xlsx"

async def main():
    client_db = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client_db[DB_NAME]
    df = pd.read_excel(XLSX_FILE, dtype=str).fillna("")
    print(f"Clients a importer : {len(df)}")
    existing_count = await db.clients.count_documents({})
    print(f"Clients deja en base : {existing_count}")
    ok = skipped = errors = 0
    for _, row in df.iterrows():
        nom = str(row.get("NOM","")).strip()
        prenom = str(row.get("PRENOM","")).strip()
        tel = str(row.get("TELEPHONE","")).strip()
        tel2 = str(row.get("TELEPHONE2","")).strip()
        email = str(row.get("MAIL","")).strip()
        adresse = str(row.get("ADRESSE","")).strip()
        cp = str(row.get("CODE_POSTAL","")).strip()
        ville = str(row.get("VILLE","")).strip()
        if not nom: continue
        adresse_full = " ".join(filter(None,[adresse,cp,ville])).strip()
        existing = await db.clients.find_one({"nom":nom,"prenom":prenom,"telephone":tel})
        if existing:
            skipped += 1
            continue
        now = datetime.now(timezone.utc).isoformat()
        doc = {"id":str(uuid.uuid4()),"nom":nom,"prenom":prenom,"telephone":tel,"telephone2":tel2,"email":email if "@" in email else "","adresse":adresse_full,"created_at":now,"updated_at":now}
        try:
            await db.clients.insert_one(doc)
            ok += 1
        except Exception as e:
            print(f"Erreur {nom} {prenom}: {e}")
            errors += 1
    print(f"Importes : {ok}")
    print(f"Ignores  : {skipped}")
    print(f"Erreurs  : {errors}")
    print(f"Total base : {await db.clients.count_documents({})}")
    client_db.close()

asyncio.run(main())
