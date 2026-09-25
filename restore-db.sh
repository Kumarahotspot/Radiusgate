#!/bin/bash
# ==============================================================================
# SCRIPT RESTORE DATABASE RADIUSGATE KE MONGODB DI VPS ANDA
# ==============================================================================
set -e

GREEN='\033[0;32m'
TEAL='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${TEAL}=====================================================${NC}"
echo -e "${TEAL}     RESTORE DATABASE RADIUSGATE KE VPS             ${NC}"
echo -e "${TEAL}=====================================================${NC}"

# Tentukan perintah docker (pakai sudo bila user biasa tidak punya akses)
DOCKER=""
if docker ps >/dev/null 2>&1; then
  DOCKER="docker"
elif sudo -n true 2>/dev/null || [ "$EUID" -eq 0 ] || sudo -v 2>/dev/null; then
  if sudo docker ps >/dev/null 2>&1; then
    DOCKER="sudo docker"
  fi
fi

BACKUP_FILE="radiusgate_backup_database.tar.gz"

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${YELLOW}Mengunduh backup database dari Emergent...${NC}"
  curl -L -o "$BACKUP_FILE" "https://face-absensi-2.preview.emergentagent.com/api/public/download/backup-database"
fi

echo -e "${YELLOW}Mengekstrak file backup...${NC}"
rm -rf /tmp/radiusgate_db_restore
mkdir -p /tmp/radiusgate_db_restore
tar -xzf "$BACKUP_FILE" -C /tmp/radiusgate_db_restore

DUMP_DIR=$(find /tmp/radiusgate_db_restore -mindepth 1 -maxdepth 1 -type d | head -n 1)

if [ -z "$DUMP_DIR" ]; then
  echo -e "${RED}Error: Folder backup BSON tidak ditemukan di dalam arsip!${NC}"
  exit 1
fi

echo -e "${YELLOW}Menemukan data dump di: ${DUMP_DIR}${NC}"

# Cari container MongoDB (nama mengandung "mongo")
MONGO_CONTAINER=""
if [ -n "$DOCKER" ]; then
  MONGO_CONTAINER=$($DOCKER ps --format '{{.Names}}' 2>/dev/null | grep -i "mongo" | head -n 1)
fi

if [ -n "$MONGO_CONTAINER" ]; then
  echo -e "${TEAL}Terdeteksi: MongoDB di Docker Container (${MONGO_CONTAINER})${NC}"
  $DOCKER cp "$DUMP_DIR" "${MONGO_CONTAINER}:/tmp/dump_restore"
  $DOCKER exec "$MONGO_CONTAINER" mongorestore --db radiusgate --drop /tmp/dump_restore
  $DOCKER exec "$MONGO_CONTAINER" rm -rf /tmp/dump_restore
else
  echo -e "${TEAL}MongoDB Native / Standalone (port 27017)${NC}"
  if ! command -v mongorestore >/dev/null 2>&1; then
    echo -e "${YELLOW}mongorestore belum terpasang — memasang mongodb-database-tools...${NC}"
    SUDO=""
    [ "$EUID" -ne 0 ] && SUDO="sudo"
    if ! ($SUDO apt-get update -qq && $SUDO apt-get install -y -qq mongodb-database-tools) 2>/dev/null; then
      echo -e "${YELLOW}Repo belum ada — mengunduh paket resmi MongoDB Database Tools...${NC}"
      cd /tmp
      curl -fsSL -o mongo-tools.deb "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.10.0.deb"
      $SUDO apt-get install -y ./mongo-tools.deb
      rm -f mongo-tools.deb
      cd - >/dev/null
    fi
  fi
  mongorestore --uri="mongodb://127.0.0.1:27017" --db radiusgate --drop "$DUMP_DIR"
fi

rm -rf /tmp/radiusgate_db_restore

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}   RESTORE DATABASE SELESAI & SUKSES!               ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "Semua data siswa, guru, wajah, dan riwayat absen sudah masuk ke database VPS Anda."
