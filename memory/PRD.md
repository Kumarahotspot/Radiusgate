# PRD — RadiusGate (SaaS Absensi Sekolah Multi-Tenant)

> Riwayat lengkap per-tanggal: **CHANGELOG.md**. Backlog & rencana: **ROADMAP.md**.

## Problem Statement (asli)
Aplikasi absensi berbasis Kiosk Web App (browser HP/tablet) + face recognition (ArcFace) & liveness, geofence GPS, dashboard web admin/guru/owner, offline-sync, dwibahasa (ID/EN). Arsitektur multi-tenant. Cakupan diperluas: Lembur & Penggajian Karyawan, Portal Orang Tua (read-only, tagihan, izin/sakit, notif WA), Modul SPP Terintegrasi, Absensi per Mata Pelajaran, Kiosk Screensaver/papan info.

## Keputusan User & Perkembangan Terkini (kunci)
- **Multi-Metode Absensi dalam 1 Kiosk (Bebas Pilih)**:
  1. **Face Recognition AI (ArcFace + Liveness)**: verifikasi wajah < 3 detik, anti titip foto/video.
  2. **Kartu RFID / NFC**: reader USB/OTG (keyboard emulation UID+Enter), tanpa sentuh layar. Mode "Registrasi Kartu" langsung di kiosk (login admin sekolah).
  3. **Kartu QR Code**: auto-generate token unik per orang (anti-palsu), kamera kiosk auto-deteksi (tanpa tombol), cetak massal per kelas dalam 1 PDF A4 (6 kartu/halaman).
  4. **NIS / NIP Manual**: keypad angka besar di layar kiosk (readOnly input, anti keyboard HP menutup), bunyi klik Web Audio + tombol menyala, foto profil konfirmasi.
- **PWA Fullscreen Kiosk**: Kiosk mendukung install "Add to Home screen" (PWA dengan `display: fullscreen`) agar otomatis full page tanpa perlu menyentuh layar.
- **Auto-Pair Kiosk untuk User Login**: Siapa pun yang sudah login (admin/guru/karyawan) membuka Kiosk tanpa mengetik kode — token kiosk diambil otomatis via `GET /api/auth/kiosk-code`. Input kode manual hanya untuk perangkat yang belum login sama sekali.
- **Mode Perusahaan (org_type)**: Tenant bisa bertipe "school" atau "company" (dipilih saat daftar / diubah admin di Pengaturan). Mode company: profil perkantoran/pabrik — Karyawan + Departemen + Shift Kerja + Lembur + Penggajian + SP1/SP2/SP3 otomatis dari data telat + tarif langganan per karyawan; modul sekolah (Siswa, Guru, Mapel, SPP, Ortu) disembunyikan; istilah "Portal HRD". Landing page menawarkan 2 produk (Sekolah / Perusahaan) dengan CTA pendaftaran terpisah.
- **Materi Pemasaran & Edukasi**:
  - File Presentasi Penawaran Sekolah (`presentasi-radiusgate.pptx`, 7 slide 16:9).
  - Panduan Pengguna / User Guide lengkap (`panduan-radiusgate.pdf`, 8 halaman A4).
  - Skrip Auto-Installer Deploy VPS (`install-vps.sh`) + Panduan Docker Compose (`PANDUAN-VPS.md`).
- **Branding**: **RadiusGate**, PT. Pusaka Kreasi Mandiri, logo resmi.
- **MOCK / Menunggu Kredensial User**:
  - **Tripay**: TRIPAY_MODE=mock (SPP & billing SaaS). Menunggu: Merchant Code, API Key, Private Key.
  - **Wablas**: Menunggu token Wablas untuk notifikasi WA otomatis ke orang tua.

## Arsitektur
- Frontend: React (JSX) + Tailwind + react-i18next + jsQR + qrcode. `/app/frontend/src/`
- Backend: FastAPI modular + InsightFace/ArcFace + PyMongo + ReportLab + Python-pptx: routes `auth, owner, admin, teacher, kiosk, employee, parent, spp, billing, cron, public`.
- DB: MongoDB multi-tenant — semua dokumen bawa `school_id`.
- Auth: JWT bearer 7 hari, bcrypt. Roles: `owner`, `school_admin`, `teacher`, `employee`, `parent`.
- Deployment VPS: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `install-vps.sh`.
- Build Hostinger: `landing-radiusgate.zip` selalu di-rebuild setelah setiap perubahan.

## Endpoint Publik Download
- `GET /api/public/download/landing-page` — ZIP Frontend Hostinger
- `GET /api/public/download/presentasi` — File PPTX Presentasi
- `GET /api/public/download/panduan` — PDF Panduan Pengguna
- `GET /api/public/download/panduan-vps` — Markdown Panduan VPS
- `GET /api/public/download/install-script` — Shell Script Auto-Installer VPS
