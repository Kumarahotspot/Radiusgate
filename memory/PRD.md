# PRD — Absensi Sekolah (SaaS Multi-Tenant)

## Problem Statement (asli)
Aplikasi absensi berbasis tablet kiosk + face recognition & liveness, geofence GPS, dashboard web admin/guru & owner, offline-sync, billing per-siswa dengan Tripay, invoice PDF otomatis via email/WhatsApp, dwibahasa (ID/EN), feedback suara. v1 = pilot 1 sekolah, yang diabsen guru; siswa hanya basis billing.

## Keputusan User
- Versi web dulu (dibuka via HP); tablet React Native menyusul.
- Face recognition: simulasi average-hash (bukan ArcFace) sampai model asli dipasang.
- Tripay: modul siap, mode MOCK sampai API key disediakan user.
- Invoice email: otomatis (saat generate) atau manual per-invoice; Resend managed.
- Bahasa default: Indonesia.

## Arsitektur
- Frontend: React (JSX) + Tailwind + react-i18next, mobile-first. `/app/frontend/src/`
- Backend: FastAPI modular (`server.py`, `db.py`, `auth.py`, `emailer.py`, `pdfgen.py`, `faceutil.py`, `routes_{auth,owner,admin,teacher,kiosk,billing}.py`)
- DB: MongoDB multi-tenant (semua dokumen bawa `school_id`; isolasi per sekolah)
- Auth: JWT bearer 7 hari, bcrypt, roles: owner / school_admin / teacher
- Kiosk: `/kiosk` tanpa login, pairing via X-Kiosk-Token; liveness = deteksi gerakan 2 frame; GPS geofence haversine server-side; offline queue localStorage + auto-sync (dedupe client_uuid)
- Billing: invoice = student_count × rate (default Rp 8.000); PDF ReportLab; email via Emergent managed Resend; WA via link wa.me; Tripay mock + endpoint webhook `/api/webhooks/tripay` siap production (verifikasi HMAC)

## User Personas
- Platform Owner (susyanto@gmail.com): kelola sekolah, generate & kirim invoice
- Admin Sekolah: guru + enroll wajah, jam kerja, lokasi geofence, siswa, approval cuti, laporan, bayar tagihan
- Guru: absen di kiosk, ajukan izin, lihat riwayat

## Terimplementasi (2026-09-18, iterasi 1 — Fase 1–7 versi web)
- Multi-tenant + auth 3 role + seed owner & sekolah demo (120 siswa)
- CRUD guru + enrollment wajah (kamera, average-hash), jam kerja, lokasi + radius
- Data siswa: manual + impor CSV/XLS dengan validasi & preview sebelum commit
- Kiosk web: pairing kode, kamera, liveness gesture, geofence wajib (tolak di luar radius), feedback suara TTS ID/EN + mute, offline queue + auto-sync
- Cuti/izin/sakit: ajuan guru → approve/tolak admin; telat & lembur dihitung dari jam kerja
- Laporan + filter periode/guru + export Excel & PDF
- Billing: generate invoice bulanan (idempotent per periode), PDF otomatis, kirim email (auto/manual) + WA link, halaman bayar publik, Tripay mock + webhook siap
- i18n ID/EN di seluruh UI + suara
- Test: 36/36 backend pytest lulus; frontend critical flows lulus (lihat /app/test_reports/iteration_1.json)

## MOCK / Simulasi (perlu diganti untuk produksi)
- Face recognition: average-hash (faceutil.py) → ganti ArcFace/InsightFace + embedding
- Tripay: TRIPAY_MODE=mock → isi TRIPAY_API_KEY/PRIVATE_KEY/MERCHANT_CODE di backend/.env, set TRIPAY_MODE=real, pastikan merchant_ref=invoice.id
- WhatsApp: link wa.me manual → upgrade ke Twilio template setelah disetujui Meta

## Update 2026-09-18 (iterasi 2 — bug fix & aturan jam)
- Fix perhitungan telat/lembur memakai logika lingkaran 24 jam (`_closest_on_clock`): absen 23:36 untuk shift 01:00 kini benar = tepat waktu (datang awal), bukan late. Shift malam (mis. 21:00–00:00) didukung. Terverifikasi testing agent 6/6 (`/app/backend/tests/test_kiosk_clock.py`).
- Fix timezone: kiosk mengirim `ts_device` jam lokal perangkat (bukan UTC).
- Aturan baru: absen masuk paling awal X menit sebelum jam masuk (`early_checkin_min`, default 60, bisa diatur di Pengaturan) — absen terlalu awal ditolak dengan pesan + voice "Belum waktunya absen masuk, dibuka pukul HH:MM".
- Voice kiosk diperinci per penyebab gagal (belum terdaftar / liveness / di luar geofence / sudah absen + nama guru terdeteksi / terlalu awal).
- Admin bisa hapus catatan absensi dari dasbor (untuk tes ulang).

## Update 2026-09-18 (iterasi 3 — zona waktu per sekolah)
- Pengaturan **Zona Waktu** per sekolah (WIB/WITA/WIT, default Asia/Jakarta) di Pengaturan → Jam Kerja.
- Kiosk mengirim `ts_device` UTC (Z); server mengonversi ke zona waktu sekolah untuk tanggal, telat/lembur, batas absen awal, dan tampilan (`time_local`). Timestamp tanpa offset dianggap sudah waktu lokal sekolah (kompatibel klien lama & suite tes).
- Regresi 6/6 pytest `test_kiosk_clock.py` lulus + skenario live UTC 16:36Z → tercatat 23:36 WIB, status ok.

## Update 2026-09-19 (iterasi 4 — bug fix settings tertimpa + sisa menit)
- Bug: bundle frontend lama (cache HP) mengirim PUT /admin/settings tanpa field baru → default menimpa early_checkin_min 30 → 60, sehingga absen 00:13 diterima padahal buka 00:30. Fix: `SettingsIn` semua field Optional; PUT hanya `$set` field terkirim (anti-clobber). Terverifikasi testing agent 11/11 (`test_settings_partial_and_rejection.py` + regresi `test_kiosk_clock.py`).
- Pesan "terlalu awal" kini menyertakan sisa menit: `too_early:HH:MM:N` → voice "Absen dibuka N menit lagi, pukul HH:MM".

## Update 2026-09-19 (iterasi 5 — bug fix dasbor kosong)
- Bug: `/admin/today` & `/admin/stats` menghitung "hari ini" pakai tanggal UTC, sementara record absen memakai tanggal zona sekolah → tengah malam WIB dasbor tampak kosong padahal data ada. Fix: helper `school_today(sid)` (zona dari settings). Terverifikasi testing agent: backend+frontend 100%, regresi 12/12 lulus.

## Backlog Prioritas
- P0: Kunci Tripay asli dari user + uji webhook; tablet React Native (kiosk native, embedding cache on-device)
- P1: Absen siswa (v2), geofence penuh untuk absen via HP pribadi guru
- P2: Gateway tambahan (Duitku/Midtrans), audio pre-recorded pengganti TTS, shadcn Calendar pengganti native date picker (catatan testing), absensi berbasis jadwal shift

## Next Tasks
1. Minta kunci Tripay (merchant code, API key, private key) dari user → aktifkan mode real
2. Uji lapangan kiosk di HP dengan wajah asli (kalibrasi threshold)
3. Build tablet app React Native + TS (Fase 2 native)
