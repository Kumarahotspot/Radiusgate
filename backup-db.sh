#!/bin/bash
# ==============================================================================
# RADIUSGATE — BACKUP DATABASE HARIAN OTOMATIS (MONGODB)
# ==============================================================================
# Menghasilkan arsip: backups/radiusgate-backup-YYYYMMDD-HHMM.tar.gz
# Format kompatibel 100% dengan restore-db.sh (mongodump BSON -> tar.gz)
# Rotasi otomatis: hanya menyimpan 14 backup terakhir.
#
# Setup cron di VPS (backup tiap hari jam 01:00 WIB):
#   crontab -e
#   0 1 * * * /var/www/radiusgate/backup-db.sh >> /var/log/radiusgate-backup.log 2>&1
# ==============================================================================
set -e

GREEN='\033[0;32m'
TEAL='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
KEEP_LAST=14
TS=$(date +%Y%m%d-%H%M)
OUT_FILE="${BACKUP_DIR}/radiusgate-backup-${TS}.tar.gz"

# Baca nama database dari backend/.env (fallback: radiusgate)
DB_NAME="radiusgate"
if [ -f "${SCRIPT_DIR}/backend/.env" ]; then
  ENV_DB=$(grep '^DB_NAME=' "${SCRIPT_DIR}/backend/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  [ -n "$ENV_DB" ] && DB_NAME="$ENV_DB"
fi

mkdir -p "$BACKUP_DIR"

echo -e "${TEAL}[$(date '+%Y-%m-%d %H:%M:%S')] Memulai backup database '${DB_NAME}'...${NC}"

# Deteksi perintah docker
DOCKER=""
if docker ps >/dev/null 2>&1; then
  DOCKER="docker"
elif sudo -n true 2>/dev/null || [ "$EUID" -eq 0 ]; then
  if sudo docker ps >/dev/null 2>&1; then
    DOCKER="sudo docker"
  fi
fi

MONGO_CONTAINER=""
if [ -n "$DOCKER" ]; then
  MONGO_CONTAINER=$($DOCKER ps --format '{{.Names}}' 2>/dev/null | grep -i "mongo" | head -n 1)
fi

DUMP_TMP=$(mktemp -d /tmp/radiusgate_backup_XXXXXX)

if [ -n "$MONGO_CONTAINER" ]; then
  echo -e "${TEAL}MongoDB terdeteksi di container: ${MONGO_CONTAINER}${NC}"
  $DOCKER exec "$MONGO_CONTAINER" mongodump --db "$DB_NAME" --out /tmp/dump_backup
  $DOCKER cp "${MONGO_CONTAINER}:/tmp/dump_backup/." "$DUMP_TMP/"
  $DOCKER exec "$MONGO_CONTAINER" rm -rf /tmp/dump_backup
else
  echo -e "${TEAL}MongoDB lokal/standalone (127.0.0.1:27017)${NC}"
  if ! command -v mongodump >/dev/null 2>&1; then
    echo -e "${YELLOW}mongodump belum terpasang — memasang mongodb-database-tools...${NC}"
    SUDO=""
    [ "$EUID" -ne 0 ] && SUDO="sudo"
    if ! ($SUDO apt-get update -qq && $SUDO apt-get install -y -qq mongodb-database-tools) 2>/dev/null; then
      cd /tmp
      curl -fsSL -o mongo-tools.deb "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.10.0.deb"
      $SUDO apt-get install -y ./mongo-tools.deb
      rm -f mongo-tools.deb
      cd - >/dev/null
    fi
  fi
  mongodump --uri="mongodb://127.0.0.1:27017" --db "$DB_NAME" --out "$DUMP_TMP"
fi

# Normalisasi nama folder dump agar selalu kompatibel dengan restore-db.sh
if [ -d "${DUMP_TMP}/${DB_NAME}" ] && [ "$DB_NAME" != "radiusgate" ]; then
  mv "${DUMP_TMP}/${DB_NAME}" "${DUMP_TMP}/radiusgate"
fi

if [ ! -d "${DUMP_TMP}/radiusgate" ]; then
  echo -e "${RED}Error: hasil dump tidak ditemukan, backup dibatalkan.${NC}"
  rm -rf "$DUMP_TMP"
  exit 1
fi

tar -czf "$OUT_FILE" -C "$DUMP_TMP" radiusgate
rm -rf "$DUMP_TMP"

SIZE=$(du -h "$OUT_FILE" | cut -f1)
echo -e "${GREEN}Backup berhasil: ${OUT_FILE} (${SIZE})${NC}"

# Rotasi: simpan hanya N backup terbaru
cd "$BACKUP_DIR"
ls -1t radiusgate-backup-*.tar.gz 2>/dev/null | tail -n +$((KEEP_LAST + 1)) | while read -r old; do
  rm -f "$old"
  echo -e "${YELLOW}Rotasi: menghapus backup lama ${old}${NC}"
done

TOTAL=$(ls -1 radiusgate-backup-*.tar.gz 2>/dev/null | wc -l)
echo -e "${GREEN}Selesai. Total backup tersimpan: ${TOTAL} (maks ${KEEP_LAST})${NC}"
