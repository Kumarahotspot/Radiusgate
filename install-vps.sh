#!/bin/bash
# ==============================================================================
# RADIUSGATE — AUTO-INSTALLER SCRIPT UNTUK UBUNTU VPS (22.04 / 24.04 LTS)
# ==============================================================================
# Script ini mengotomatiskan seluruh proses instalasi di VPS Anda:
# 1. Update sistem & install Docker + Docker Compose + Nginx + Certbot
# 2. Setup konfigurasi .env backend & frontend
# 3. Build & jalankan container (MongoDB + FastAPI + React SPA)
# 4. Setup Nginx Reverse Proxy
# ==============================================================================

set -e

# Warna output
GREEN='\033[0;32m'
TEAL='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${TEAL}=====================================================${NC}"
echo -e "${TEAL}     RADIUSGATE AUTO DEPLOYMENT INSTALLER           ${NC}"
echo -e "${TEAL}=====================================================${NC}"

# Cek hak akses root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Script ini harus dijalankan sebagai root (atau gunakan sudo).${NC}"
  exit 1
fi

# Input Domain dari pengguna
echo ""
read -p "Masukkan nama domain Anda (contoh: absensi.sekolah.sch.id): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
  echo -e "${RED}Error: Domain tidak boleh kosong!${NC}"
  exit 1
fi

echo -e "\n${YELLOW}[1/6] Memperbarui sistem Ubuntu & menginstal dependensi dasar...${NC}"
apt update && apt upgrade -y
apt install -y curl git ufw nginx certbot python3-certbot-nginx apt-transport-https ca-certificates gnupg lsb-release

echo -e "\n${YELLOW}[2/6] Menginstal Docker Engine & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
fi

apt install -y docker-compose-plugin

echo -e "\n${YELLOW}[3/6] Menyiapkan environment backend & frontend...${NC}"
JWT_RANDOM=$(openssl rand -hex 32)

cat > backend/.env << EOF
MONGO_URL=mongodb://mongodb:27017
DB_NAME=radiusgate
JWT_SECRET=${JWT_RANDOM}
PORT=8001
EOF

echo "REACT_APP_BACKEND_URL=https://${DOMAIN_NAME}" > frontend/.env

echo -e "\n${YELLOW}[4/6] Menjalankan Docker Compose (MongoDB, Backend FastAPI, Frontend)...${NC}"
docker compose down || true
docker compose up -d --build

echo -e "\n${YELLOW}[5/6] Mengonfigurasi Nginx Reverse Proxy untuk ${DOMAIN_NAME}...${NC}"

cat > /etc/nginx/sites-available/${DOMAIN_NAME} << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    client_max_body_size 50M;

    # Frontend React Kiosk & Admin
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # API Backend FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/${DOMAIN_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default || true
nginx -t
systemctl reload nginx

echo -e "\n${YELLOW}[6/6] Menyiapkan Firewall (UFW)...${NC}"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable || true

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}       INSTALASI RADIUSGATE BERHASIL!               ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "Aplikasi Anda sekarang aktif di: ${TEAL}http://${DOMAIN_NAME}${NC}"
echo ""
echo -e "${YELLOW}LANGKAH TERAKHIR (Pasang SSL HTTPS Gratis):${NC}"
echo -e "Jalankan perintah berikut di VPS Anda:"
echo -e "  ${TEAL}sudo certbot --nginx -d ${DOMAIN_NAME}${NC}"
echo ""
echo -e "Akun login bawaan:"
echo -e "  - Owner Platform: ${TEAL}susyanto@gmail.com${NC} / ${TEAL}Owner123!${NC}"
echo -e "  - Admin Sekolah : ${TEAL}admin@nusantara.sch.id${NC} / ${TEAL}Admin123!${NC}"
echo -e "  - Kode Kiosk    : ${TEAL}KIOSK-DEMO-1${NC}"
echo -e "${GREEN}=====================================================${NC}"
