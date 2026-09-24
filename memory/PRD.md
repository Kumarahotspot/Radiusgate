# PRD — RadiusGate (SaaS Absensi Sekolah Multi-Tenant)

> Riwayat lengkap per-tanggal: **CHANGELOG.md**. Backlog & rencana: **ROADMAP.md**.

## Problem Statement (asli)
Aplikasi absensi berbasis Kiosk Web App (browser HP/tablet) + face recognition (ArcFace) & liveness, geofence GPS, dashboard web admin/guru/owner, offline-sync, dwibahasa (ID/EN). Arsitektur multi-tenant. Cakupan diperluas: Lembur & Penggajian Karyawan, Portal Orang Tua (read-only, tagihan, izin/sakit, notif WA), Modul SPP Terintegrasi, Absensi per Mata Pelajaran, Kiosk Screensaver/papan info.

## Keputusan User (kunci)
- Versi web dulu (HP/tablet via browser); tablet React Native menyusul.
- Face recognition: **InsightFace buffalo_s / ArcFace 512-d** (sudah asli, bukan simulasi). Threshold cosine ≥ 0.45, margin 0.05, 1 wajah = 1 orang lintas guru/siswa/karyawan.
- Tripay: modul siap, **MODE MOCK** sampai user memberi kredensial. Wablas: kode siap, menunggu token asli.
- Bahasa default Indonesia; UI dwibahasa ID/EN via react-i18next.
- Alur absensi final: siswa absen masuk wajah di kiosk (default "Hadir") → guru mapel mengabsen per sesi (prefill dari kiosk, HSIA menimpa status harian, last writer wins) → auto-Alpa & auto-lock sesi via cron 19:00 WIB → absen pulang dikunci sampai jam pulang per-hari (`student_dismissal`).
- Pola UI terkini: **auto-save per interaksi** (tanpa tombol Simpan) untuk koreksi absensi — guru (Absen Mapel) dan admin (Dasbor).
- Branding final: **RadiusGate**, PT. Pusaka Kreasi Mandiri, logo resmi upload user (+ varian putih `logo-white.png` untuk background gelap). Domain publik user: radiusgate.id (Hostinger, SPA statis dari ZIP).

## Arsitektur
- Frontend: React (JSX) + Tailwind + react-i18next, mobile-first, pola kartu untuk layar kecil. `/app/frontend/src/`
- Backend: FastAPI modular: `server.py`, `db.py`, `auth.py`, `faceutil.py`, `notif.py`, `pdfgen.py`, `emailer.py`, `storage.py`, routes: `auth, owner, admin, teacher, kiosk, employee, parent, spp, billing, cron, public`.
- DB: MongoDB multi-tenant — semua dokumen bawa `school_id`.
- Auth: JWT bearer 7 hari, bcrypt. Roles: `owner`, `school_admin`, `teacher`, `employee`, `parent`. Login ortu via No. HP (email sintetis `@edugateid.local` — JANGAN diganti, merusak login ortu existing).
- Kiosk `/kiosk`: tanpa login, pairing X-Kiosk-Token / poster QR auto-pair (`?pair=`), liveness gerakan 2 frame, geofence haversine server-side, offline queue + auto-sync (dedupe client_uuid), feedback suara TTS ID/EN dengan sapaan kustom per sekolah (`greeting_in/out`), screensaver papan info (`saver_notes` + `saver_photos` via Emergent Object Storage, tanggal berlaku per slide).
- Cron (5/5 slot platform terpakai — gabungkan bila menambah): monthly-invoices, invoice-reminders, weekly-parent-summary, spp-reminders, auto-alpa (+auto-lock sesi mapel).
- Build Hostinger: `yarn build` di /app/frontend → zip isi `build/` → `/app/frontend/landing-radiusgate.zip` (juga disajikan via `GET /api/public/download/landing-page`). **Wajib rebuild ZIP setelah setiap perubahan frontend.**

## User Personas
- Platform Owner (susyanto@gmail.com): kelola sekolah, invoice SaaS, leads, pengaturan notifikasi global.
- Admin Sekolah: guru/siswa/karyawan + enroll wajah, jam kerja & geofence, approval cuti & lembur, laporan, SPP, koreksi absensi, kunci sesi mapel.
- Guru: absen kiosk, absen mapel per sesi (auto-save, panggil cepat, kunci sesi), izin siswa, laporan kelas yang diampu.
- Karyawan: absen kiosk, pengajuan lembur.
- Orang Tua: portal read-only (aktivitas anak, rekap bulanan, tagihan SPP + bayar demo + kuitansi PDF, ajukan/batalkan izin hari ini, profil).

## Skema DB Kunci
- `schools` + `settings` (per school_id): jam kerja, timezone, geofence, master_classes/subject/major/department, school_type, student_dismissal, greeting_in/out, saver_notes, saver_photos, overtime_rate.
- `users`: semua role login. `students` (nis, nisn, gender, class, parent_phone/name/email/address, status aktif/lulus, embedding), `teachers` (subject, classes), `employees` (department, overtime_rate, base_salary).
- `attendance` (harian, person_type teacher/student/employee, att_status present/sakit/izin/alpa, corrected_by), `subject_attendance` (per sesi, `locked`), `leaves`, `overtime_requests`.
- SPP: `bill_categories`, `bills` (status diturunkan), `spp_payments`. SaaS: `invoices`, `leads`, `cron_runs`.

## Endpoint Kunci (semua prefix /api)
- Kiosk: `POST /kiosk/attend` (wajah, guru+siswa+karyawan), `POST /kiosk/attend-manual` (NIS/NIP), `GET /kiosk/info`.
- Admin dasbor: `GET /admin/today?date=`, `GET /admin/stats`, `PATCH /admin/attendance/{aid}/status` (koreksi HSIA inline), `POST /admin/attendance/mark` (tandai siswa belum absen), `GET /admin/today/absent?date=`, `DELETE /admin/attendance/{aid}`.
- Guru mapel: `GET/POST /teacher/subject-att` (prefill + auto-save per record + lock tri-state).
- Admin sesi: `GET /admin/subject-sessions?date=`, `POST /admin/subject-sessions/lock`.
- Laporan: `GET /admin/reports/people[/recap|/export]` (person=student|teacher|employee), `/admin/reports/attendance`, `/admin/reports/overtime`, `/admin/reports/payroll`.
- SPP: `/admin/spp/*`, `/parent/spp/*`, kuitansi/invoice/rekap PDF.

## MOCK / Menunggu Kredensial User
- **Tripay**: TRIPAY_MODE=mock (SPP & billing SaaS). Butuh: merchant code, API key, private key → set real + uji webhook `/api/webhooks/tripay` (HMAC siap).
- **Wablas**: belum ada token → WA jatuh ke link wa.me manual; semua notif WA (ortu, pengingat SPP, ringkasan mingguan) ter-skip diam-diam sampai token diisi (Owner → Notifikasi).

## Pelajaran Penting (jangan diulang)
- Jangan andalkan filter `?q=` untuk mengambil ID — cocokkan field unik (nis). (Insiden penghapusan siswa Arto, sudah dipulihkan.)
- Jangan ekstrak WEBHOOK_CRON_SECRET pakai grep/cut (nilai mengandung karakter khusus) — pakai dotenv.
- .env memakai tanda kutip pada nilai — strip quotes saat koneksi Mongo manual.
- Tanggal default di frontend harus `toLocaleDateString("en-CA")` (bukan toISOString = UTC) — bug berulang di 3 halaman, semua sudah difix.
- Tes tidak boleh menulis data destruktif ke DB preview tanpa cleanup.
- Kredensial uji: `/app/memory/test_credentials.md` (admin demo direset ke Admin123! pada 2026-09-24 karena password sempat berubah).
