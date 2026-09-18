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

## Update 2026-09-19 (iterasi 6 — CRUD sekolah lengkap)
- Tabel Sekolah di portal Owner kini CRUD lengkap: Tambah, Lihat, **Ubah** (modal: nama, alamat, no. WA, tarif/siswa), Hapus. Backend `PATCH /api/owner/schools/{id}` sudah mendukung. Terverifikasi curl + UI (desktop & mobile).

## Update 2026-09-19 (iterasi 7 — jumlah siswa manual + tabel lengkap)
- Sekolah punya field `student_count_manual` (opsional): jika diisi, jadi basis billing menggantikan hitungan data siswa; bisa dikosongkan untuk kembali ke hitungan data. Form buat & edit sekolah owner memilikinya.
- Tabel Sekolah owner menampilkan semua field: nama, alamat, WA, email admin, jumlah siswa (+label "manual"), guru, tarif, kode kiosk, aksi.
- Terverifikasi: PATCH set/reset manual, invoice uji 350×8000 benar, UI desktop+mobile OK.

## Update 2026-09-19 (iterasi 8 — modul notifikasi SMTP + Wablas)
- Halaman Owner → **Notifikasi**: mode email (Resend managed bawaan / SMTP kustom: host, port, user, password, from, TLS) + provider WhatsApp (link wa.me manual / **Wablas otomatis**: base URL, token, secret key opsional). Secret disimpan di DB, di-mask saat GET, kosong = tidak diubah.
- Modul `notif.py`: `send_email_unified` (Resend/SMTP), `send_whatsapp` (Wablas `/api/send-message` + `/api/send-document`, fallback link wa.me jika token kosong).
- Kirim invoice kini otomatis WA via Wablas (teks + PDF terlampir, route alias `…/invoice.pdf` agar ekstensi valid) bila provider=wablas & token terisi; kalau tidak, tetap buka link wa.me.
- Endpoint tes per channel: `POST /api/owner/notif-settings/test`. Terverifikasi curl + UI.
- STATUS: Wablas masih menunggu token asli dari user (mode link wa.me aktif sementara).

## Update 2026-09-19 (iterasi 9 — field email admin di edit sekolah)
- Modal Ubah Sekolah kini punya field **Email Admin** (tujuan pengiriman invoice), tersimpan via PATCH `admin_email`. Terverifikasi curl (set/revert) + UI.

## Update 2026-09-19 (iterasi 10 — reset password admin sekolah)
- Modal Ubah Sekolah + field **Kata Sandi Admin** (opsional): mengisi = reset password akun admin sekolah tsb; mengubah Email Admin ikut menyinkronkan email login-nya (dengan cek duplikat). Terverifikasi: login password baru 200, lama 401, revert OK.

## Update 2026-09-19 (iterasi 11 — tombol link login per sekolah)
- Tabel Sekolah owner: tombol **Salin Link Login** (ikon rantai) — menyalin `…/login?email=<admin_email>`; halaman login membaca query `email` dan mengisi field email otomatis. Terverifikasi UI.

## Update 2026-09-19 (iterasi 12 — pulihkan akun guru demo)
- Akun `guru@nusantara.sch.id / Guru123!` (Budi Santoso) ikut terhapus saat hapus-semua-guru (by design: hapus guru = hapus akun login). Dipulihkan di level data. Terverifikasi testing agent: 4/4 baru + 12/12 regresi + UI portal guru (`test_bugfix_teacher_restore.py`).

## Update 2026-09-19 (iterasi 13 — CRUD guru lengkap)
- Tabel Guru (admin) kini CRUD lengkap: Tambah, Lihat, **Ubah** (nama, NIP, mapel, status aktif — sinkron nama ke akun login), Hapus, Enroll Wajah. Terverifikasi curl + UI (desktop & mobile).

## Update 2026-09-19 (iterasi 13b — v2 absensi siswa + CRUD siswa + infra tes)
- **v2 absensi siswa di kiosk**: toggle Guru/Siswa; mode siswa = input NIS + status Hadir/Sakit/Izin; geofence tetap wajib; 1×/hari/siswa; sakit/izin tidak dihitung telat; offline-sync mendukung siswa. Record ber-label person_type=student; dasbor admin punya stat "Siswa Hadir" + badge Siswa di tabel harian.
- **CRUD siswa lengkap**: PATCH /api/admin/students/{id} + modal Ubah di halaman Siswa.
- Infra tes: pytest.ini `--dist loadscope` → `loadgroup` agar `xdist_group` men-serialkan suite stateful; tes usang di backend_test.py diperbaiki (restore settings dinamis, tidak hardcode); tes import siswa kini membersihkan datanya sendiri.
- Terverifikasi testing agent iterasi 6: backend 10/10 tes v2 baru, full suite 62/62 serial, frontend kiosk mode siswa + modal edit siswa 100%.

## Update 2026-09-19 (iterasi 13c — full suite hijau paralel)
- pytest.ini: `--dist loadgroup` + `xdist_group(name="demo_school_settings")` di 3 file tes stateful → race paralel hilang.
- backend_test.py: fixture `test_period` dibuat benar-benar unik per run (dulu microsecond%12 → tabrakan antar run); tes settings restore dinamis; tes import siswa bersih-bersih sendiri.
- **Full suite: 62/62 lulus di mode paralel default.**

## Update 2026-09-19 (iterasi 14 — absen wajah siswa seperti guru)
- Siswa kini bisa **enroll wajah** (admin → Siswa → ikon scan) dan **absen wajah di kiosk** (mode Siswa → tombol "Absen Wajah Siswa", liveness + geofence sama seperti guru). NIS manual tetap ada sebagai fallback offline.
- Endpoint baru: `POST /api/admin/students/{id}/enroll`, `POST /api/kiosk/attend-student-face`.
- Tes: terverifikasi manual (enroll→match 200, dup 409); tes lama disesuaikan dengan matcher simulasi longgar. **Full suite 62/62 lulus.**

## Update 2026-09-19 (iterasi 15 — kiosk terpadu tanpa toggle Guru/Siswa)
- Kiosk disederhanakan: hanya **Absen Masuk / Absen Pulang**. Backend `/api/kiosk/attend` mencocokkan wajah ke guru DAN siswa sekaligus, lalu mencatat dengan `person_type` yang tepat (response menyertakan person_type). Endpoint `attend-student-face` dihapus (digabung).
- NIS manual tetap tersedia di bagian bawah kiosk (fallback siswa tanpa wajah / offline) dengan status Hadir/Sakit/Izin.
- Terverifikasi: foto siswa → 200 person_type=student + record student_id; duplikat 409; full suite 62/62; UI kiosk terpadu OK di 390px.

## Update 2026-09-19 (iterasi 16 — S/I siswa oleh wali kelas)
- Kiosk NIS: tombol Sakit/Izin **dihapus** — kiosk hanya mencatat Hadir.
- **Sakit/Izin siswa dicatat wali kelas** dari Portal Guru: kartu "Sakit/Izin Siswa" (pilih siswa, status, tanggal, catatan) → tercatat di absensi (att_status, recorded_by), anti-duplikat per hari, tanpa geofence (manual=True di _record).
- Endpoint: GET /teacher/students, POST/GET /teacher/student-status. Full suite 62/62 lulus.
- Cleanup: puluhan leave uji "TEST" & siswa TEST_* sisa pytest dibersihkan dari sekolah demo.

## Update 2026-09-19 (iterasi 17 — perbaikan error kamera enroll wajah)
- Laporan user: modal Enroll Wajah hanya menampilkan "Kamera tidak tersedia" (izin kamera pernah ditolak browser → tidak ada prompt ulang).
- `CameraCapture.jsx`: pesan error kini spesifik per penyebab — izin ditolak (panduan aktifkan ulang via ikon gembok di address bar), kamera tidak ada, kamera dipakai aplikasi lain, konteks non-HTTPS; tombol **Coba Lagi** (re-request izin) + fallback **Unggah Foto** (file picker, resize ke ≤480px seperti capture kamera).
- Helper `startCamera` + `cameraErrorKey` diekspor dan dipakai ulang di Kiosk.jsx; fallback `OverconstrainedError` → `video: true`.
- Terverifikasi screenshot: alur unggah foto → preview → simpan → status "Terdaftar"; kiosk tetap berfungsi (stream kamera attach, tanpa overflow). Data uji enroll dibersihkan.

## Update 2026-09-19 (iterasi 18 — search + pagination tabel Siswa)
- Halaman admin → Siswa: kotak **pencarian** (nama/NIS/kelas, case-insensitive, reset ke halaman 1) + **pagination 10 entri/halaman** dengan info rentang ("1–10 dari 120", "2/12") dan tombol prev/next; kontainer scroll tinggi-tetap dihapus (pagination menggantikannya).
- i18n baru: `search_students`, `of` (ID/EN). Terverifikasi screenshot: 10 baris/halaman, next→2/12, search "demo 5" → 11 hasil terpaging.

## Update 2026-09-19 (iterasi 18b — search + pagination di Guru & Dasbor)
- Pola yang sama diterapkan ke halaman **Guru** (search nama/email/NIP/mapel) dan tabel **Absensi Hari Ini** di Dasbor (search nama/status/tipe di header kartu), masing-masing 10 entri/halaman + info rentang + prev/next.
- i18n baru: `search_teachers`, `search_attendance` (ID/EN). Terverifikasi screenshot: search "budi" → 1 hasil, info halaman benar, tanpa overflow di 390px.

## Backlog Prioritas
- P0: Kunci Tripay asli dari user + uji webhook; tablet React Native (kiosk native, embedding cache on-device)
- P1: Absen siswa (v2), geofence penuh untuk absen via HP pribadi guru
- P2: Gateway tambahan (Duitku/Midtrans), audio pre-recorded pengganti TTS, shadcn Calendar pengganti native date picker (catatan testing), absensi berbasis jadwal shift

## Next Tasks
1. Minta kunci Tripay (merchant code, API key, private key) dari user → aktifkan mode real
2. Uji lapangan kiosk di HP dengan wajah asli (kalibrasi threshold)
3. Build tablet app React Native + TS (Fase 2 native)
