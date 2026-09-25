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

# Cek apakah MongoDB berjalan di Docker container radiusgate-mongo
if docker ps --format '{{.Names}}' | grep -q "^radiusgate-mongo$"; then
  echo -e "${TEAL}Terdeteksi: MongoDB berjalan di Docker Container (radiusgate-mongo)${NC}"
  docker cp "$DUMP_DIR" radiusgate-mongo:/tmp/dump_restore
  docker exec radiusgate-mongo mongorestore --db radiusgate --drop /tmp/dump_restore
  docker exec radiusgate-mongo rm -rf /tmp/dump_restore
else
  echo -e "${TEAL}Terdeteksi: MongoDB Native / Standalone (port 27017)${NC}"
  mongorestore --uri="mongodb://127.0.0.1:27017" --db radiusgate --drop "$DUMP_DIR"
fi

rm -rf /tmp/radiusgate_db_restore

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}   RESTORE DATABASE SELESAI & SUKSES!               ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "Semua 430+ data siswa, guru, setting wajah, dan riwayat absen sudah masuk ke database VPS Anda."
