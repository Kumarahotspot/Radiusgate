"""One-off: konversi embedding legacy ahash (str) ke embedding ArcFace dari foto tersimpan.

Foto tanpa wajah terdeteksi -> embedding dihapus dan orang tersebut harus enroll ulang.
Jalankan: python3 migrate_faces.py
"""
import asyncio

from db import db
from faceutil import embed


async def migrate(coll):
    n_ok = n_reset = 0
    async for doc in db[coll].find({"embedding": {"$type": "string"}}):
        try:
            emb = embed(doc.get("photo") or "")
            await db[coll].update_one({"_id": doc["_id"]},
                                      {"$set": {"embedding": emb, "embedding_model": "buffalo_s"}})
            n_ok += 1
            print(f"OK    {coll}: {doc.get('name')}")
        except Exception as e:
            await db[coll].update_one({"_id": doc["_id"]},
                                      {"$unset": {"embedding": "", "photo": ""},
                                       "$set": {"face_reset": "re_enroll_required"}})
            n_reset += 1
            print(f"RESET {coll}: {doc.get('name')} ({e})")
    print(f"{coll}: migrated={n_ok} reset={n_reset}")


async def main():
    await migrate("teachers")
    await migrate("students")


if __name__ == "__main__":
    asyncio.run(main())
