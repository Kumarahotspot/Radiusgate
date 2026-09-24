# PANDUAN DEPLOY RADIUSGATE KE VPS LINUX (Ubuntu 22.04 / 24.04 LTS)

Panduan lengkap untuk memindahkan RadiusGate dari Emergent ke VPS Linux Anda sendiri.

---

## 1. Spesifikasi VPS yang Disarankan
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS (64-bit)
- **RAM**: Minimal 2 GB (Rekomendasi 4 GB untuk InsightFace / AI wajah yang cepat)
- **CPU**: Minimal 2 vCPU
- **Disk**: Minimal 25 GB SSD
- **Port yang dibuka**: 80 (HTTP), 443 (HTTPS), 22 (SSH)

---

## 2. Cara Mengambil Kode Aplikasi dari Emergent

### Opsi A (Paling Mudah — Paket Berbayar): Save to GitHub
1. Di chat Emergent, klik tombol **Save** / **Save to GitHub**.
2. Masukkan repositori GitHub Anda.
3. Di VPS Anda:
   ```bash
   git clone https://github.com/USERNAME/REPO-ANDA.git /var/www/radiusgate
   cd /var/www/radiusgate
   ```

### Opsi B: Download ZIP
1. Download file ZIP landing/frontend dari link:
   `https://[URL-EMERGENT]/api/public/download/landing-page`
2. Download seluruh file backend melalui VS Code editor (tombol **Code** di toolbar atas).

---

## 3. Pilihan Metode Deployment di VPS

---

### METODE 1: Menggunakan Docker & Docker Compose (Paling Direkomendasikan ⭐)

Metode ini paling bersih karena MongoDB, Python + AI libs, dan Frontend otomatis ter-setup.

1. **Install Docker & Docker Compose di VPS**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
   sudo apt install -y docker-compose-plugin
   ```

2. **Siapkan Konfigurasi Backend `.env`**:
   Masuk ke folder backend, buat file `.env`:
   ```bash
   cd /var/www/radiusgate/backend
   cat > .env << 'EOF'
   MONGO_URL=mongodb://mongodb:27017
   DB_NAME=radiusgate
   JWT_SECRET=buat-string-acak-yang-panjang-dan-rahasia-disini-123456
   PORT=8001
   EOF
   ```

3. **Jalankan Aplikasi dengan Docker Compose**:
   ```bash
   cd /var/www/radiusgate
   docker compose up -d --build
   ```

4. Cek status container:
   ```bash
   docker compose ps
   docker compose logs -f backend
   ```

---

### METODE 2: Manual (Native Ubuntu + Nginx + Systemd)

Cocok jika Anda ingin mengontrol service secara langsung tanpa Docker.

#### A. Install Dependensi Sistem & Python 3.11
```bash
sudo apt update
sudo apt install -y python3-pip python3-venv git curl build-essential \
                    libgl1 libglib2.0-0 libgomp1 nginx certbot python3-certbot-nginx
```

#### B. Install MongoDB 6.0+
```bash
sudo apt-get install gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

#### C. Setup Backend (FastAPI)
```bash
cd /var/www/radiusgate/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Buat .env
cat > .env << 'EOF'
MONGO_URL=mongodb://127.0.0.1:27017
DB_NAME=radiusgate
JWT_SECRET=kunci-rahasia-jwt-acak-anda
PORT=8001
EOF
```

#### D. Buat Systemd Service untuk Backend Auto-Start
```bash
sudo tee /etc/systemd/system/radiusgate-backend.service << 'EOF'
[Unit]
Description=RadiusGate FastAPI Backend
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/radiusgate/backend
EnvironmentFile=/var/www/radiusgate/backend/.env
ExecStart=/var/www/radiusgate/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now radiusgate-backend
sudo systemctl status radiusgate-backend
```

#### E. Setup Frontend (React)
```bash
# Install Node.js 18 & Yarn
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn

cd /var/www/radiusgate/frontend
# Buat .env dengan URL domain/IP VPS Anda
echo "REACT_APP_BACKEND_URL=https://domain-anda.com" > .env

yarn install
yarn build

# Copy build ke folder web server
sudo mkdir -p /var/www/html/radiusgate
sudo cp -r build/* /var/www/html/radiusgate/
sudo chown -R www-data:www-data /var/www/html/radiusgate
```

---

## 4. Konfigurasi Nginx Reverse Proxy (Untuk Domain Anda)

Buat file `/etc/nginx/sites-available/radiusgate`:

```nginx
server {
    listen 80;
    server_name domain-anda.com www.domain-anda.com;

    # Frontend React (SPA)
    root /var/www/html/radiusgate;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M; # Untuk upload foto / ZIP enroll massal
    }

    # Static uploads / download
    location /invoices/ {
        alias /var/www/radiusgate/backend/invoices/;
    }
}
```

Aktifkan konfigurasi:
```bash
sudo ln -s /etc/nginx/sites-available/radiusgate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Pasang SSL Gratis (Let's Encrypt / HTTPS)

```bash
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```
*Ikuti instruksi di layar, pilih redirect HTTP ke HTTPS otomatis.*

---

## 6. Migrasi Data Awal (Seeding / Akun Default)

Saat backend pertama kali dijalankan di database kosong, script database otomatis membuat akun default:
- **Owner Platform**: `susyanto@gmail.com` / `Owner123!`
- **Demo Admin Sekolah**: `admin@nusantara.sch.id` / `Admin123!`
- **Kode Kiosk Demo**: `KIOSK-DEMO-1`

Jika ingin mengekspor seluruh database dari preview Emergent ke VPS Anda:
1. Export dari MongoDB Emergent via mongodump.
2. Import ke MongoDB VPS Anda:
   ```bash
   mongorestore --uri="mongodb://127.0.0.1:27017/radiusgate" dump/radiusgate/
   ```

---

## 7. Checklist Setelah Deploy
- [ ] Buka `https://domain-anda.com` → Landing page muncul
- [ ] Buka `https://domain-anda.com/login` → Login sebagai admin sekolah sukses
- [ ] Buka `https://domain-anda.com/kiosk` → Masukkan kode kiosk → Kamera aktif & fullscreen berfungsi
- [ ] Tes Absen: Wajah (liveness), QR Code, Kartu RFID, dan NIS manual
- [ ] Mode Registrasi Kartu di Kiosk berjalan
- [ ] Unduh Kartu QR (PDF) dari halaman Siswa berjalan
- [ ] Cetak slip SPP & laporan Excel/PDF berjalan normal

---

## Bantuan & Support
File konfigurasi Docker (`docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`) sudah dibuatkan langsung di dalam folder root aplikasi ini dan ikut ter-export saat Anda mendownload/save ke GitHub.
EOF
