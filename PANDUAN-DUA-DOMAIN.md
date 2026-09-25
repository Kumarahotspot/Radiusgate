# PANDUAN SETUP DUA DOMAIN: LANDING PAGE & APLIKASI ABSENSI

Struktur Arsitektur Domain:
- `radiusgate.id` (Landing Page marketing saja)
- `absensi.radiusgate.id` (Aplikasi Sistem: Login Admin, Portal Guru, Karyawan, Ortu, & Mode Kiosk)

---

## Opsi 1: Setup di Hostinger (Landing Page Saja) + VPS (Aplikasi Absensi)

Ini adalah kombinasi terbaik:
1. **Landing Page di Hostinger (`radiusgate.id`)**:
   - Di `frontend/.env` sebelum build:
     ```env
     REACT_APP_PORTAL_URL=https://absensi.radiusgate.id
     REACT_APP_BACKEND_URL=https://absensi.radiusgate.id
     ```
   - Upload file `landing-radiusgate.zip` ke `public_html` domain `radiusgate.id` di Hostinger.
   - Hasilnya: Semua tombol "Masuk Portal", "Mode Kiosk", "Coba Demo" di landing page otomatis me-redirect pengunjung ke `https://absensi.radiusgate.id/login` atau `/kiosk`.

2. **Aplikasi Absensi di VPS (`absensi.radiusgate.id`)**:
   - Pasang A Record DNS: `absensi.radiusgate.id` mengarah ke IP VPS Anda.
   - Jalankan `sudo bash install-vps.sh` di VPS dengan memasukkan domain: `absensi.radiusgate.id`.

---

## Opsi 2: Keduanya Berjalan di VPS Linux yang Sama (1 Server)

Jika kedua domain ingin di-hosting di VPS Anda sendiri:

1. **DNS Settings**:
   - A Record `radiusgate.id` -> IP VPS
   - A Record `absensi.radiusgate.id` -> IP VPS

2. **Konfigurasi Nginx di VPS (`/etc/nginx/sites-available/radiusgate-multi`)**:

```nginx
# 1. LANDING PAGE (radiusgate.id)
server {
    listen 80;
    server_name radiusgate.id www.radiusgate.id;

    root /var/www/radiusgate-landing;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 2. APLIKASI UTAMA (absensi.radiusgate.id)
server {
    listen 80;
    server_name absensi.radiusgate.id;

    client_max_body_size 50M;

    # Frontend React App (Kiosk, Admin, Portal)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
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
    }
}
```

3. **Pasang SSL Certbot**:
   ```bash
   sudo certbot --nginx -d radiusgate.id -d www.radiusgate.id -d absensi.radiusgate.id
   ```
