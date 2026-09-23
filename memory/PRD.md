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

## Update 2026-09-19 (iterasi 19 — absen pulang wajib ada absen masuk)
- Bug dilaporkan user: absen pulang berhasil tanpa absen masuk (Siswa Demo 2 tercatat "Absen Pulang" 05:19 tanpa "Absen Masuk"). Backend memang tidak memvalidasi urutan.
- Fix `_record` di routes_kiosk.py: att_type "out" ditolak 422 `no_checkin` jika tidak ada record "in" di tanggal sama; pengecualian shift malam (work_end ≤ work_start) → cek absen masuk tanggal kemarin. Berlaku untuk wajah, NIS, dan sync offline.
- Kiosk.jsx: mapping error `no_checkin` → pesan + suara "Belum ada absen masuk hari ini. Silakan absen masuk dulu." (i18n ID/EN `kiosk_no_checkin`).
- Tes: skenario5 baru di test_kiosk_clock.py (out tanpa in → 422; setelah in → 200; shift malam tetap jalan via regresi skenario3). test_student_kiosk_v2.py dibuat mandiri — fixture membuat siswa TEST-KIOSK-1 sendiri + cleanup via Mongo, karena user menghapus siswa demo nis 10001. **Full suite 63/63 lulus.**

## Update 2026-09-19 (iterasi 20 — toggle aturan absen pulang per sekolah)
- Pengaturan → Jam Kerja: checkbox **"Absen pulang wajib ada absen masuk"** (default aktif). Field baru `require_checkin` (bool) di SettingsIn; `_record` hanya menegakkan aturan `no_checkin` bila setting aktif.
- i18n: `require_checkin`, `require_checkin_hint` (ID/EN). Tes skenario6: OFF → out tanpa in diterima; ON → 422 no_checkin. Terverifikasi UI (toggle persist setelah reload, dikembalikan ON) + **full suite 64/64 lulus.**

## Update 2026-09-19 (iterasi 21 — matcher wajah asli ArcFace/InsightFace)
- `faceutil.py` diganti total: InsightFace **buffalo_s** (CPU/onnxruntime), embedding ArcFace 512-d ternormalisasi, cosine similarity; threshold 0.45 + margin best-vs-runner-up 0.05 (anti salah-cocok orang mirip). Inference via threadpool agar event loop FastAPI tidak terblokir. Simulasi ahash dihapus.
- Error baru: `no_face_detected` (0 wajah), `multiple_faces` (>1 wajah), `face_already_enrolled:<nama>` (409 saat enroll — satu wajah hanya satu orang, dicek lintas guru+siswa). Frontend: mapping pesan/suara kiosk + errMsg i18n.
- Migrasi `migrate_faces.py`: Susiyanto & Siswa Demo 2 sukses re-embed dari foto tersimpan; Budi di-reset (foto lama sintetis). Catatan: embedding Demo 2 lalu di-reset manual karena ternyata foto yang di-enroll user = wajah yang sama dengan guru Susiyanto (sim 0.781 → ambiguous). **User perlu enroll ulang Demo 2 dengan wajah berbeda** (kini sistem menolak wajah duplikat saat enroll).
- Keputusan user (via ask_human): wajah sama guru+siswa dulu hanya untuk tes; **aturan ketat dipertahankan**, wajah user hanya untuk guru Susiyanto, Demo 2 di-enroll ulang sendiri nanti dengan wajah lain.
- Tes: 4 foto wajah generated terverifikasi saling beda (sim <0.40) di tests/assets/ (face_a/b/c/e); semua tes diupdate ke foto asli; tes baru `test_enroll_duplicate_face_rejected`. **Full suite 65/65 lulus.** Live curl: unknown→422 face_not_found, enroll→attend match sim 1.0, wajah lain→422, no-face→422.
- requirements.txt: +insightface 0.7.3, onnxruntime 1.30.0, opencv-python-headless 5.0.0.93 (protobuf ter-upgrade; backend terverifikasi sehat).

## Update 2026-09-19 (iterasi 22 — field NISN & Jenis Kelamin siswa)
- DB siswa: field baru `nisn` (str) & `gender` ("L"/"P", dinormalisasi `_norm_gender` — menerima l/laki-laki/male, p/perempuan/female dll). Model: StudentIn + StudentPatch; mengalir ke tambah/edit/impor.
- Frontend Siswa: input NISN + dropdown Jenis Kelamin di form tambah & modal edit; kolom NISN + L/P di tabel (colSpan 7) & preview impor; pencarian ikut mencari NISN.
- Impor CSV/XLSX: kolom `nisn` terpisah dari `nis`; kolom gender dikenali (gender/jk/kelamin/jenis_kelamin/jenis kelamin/l-p). **Fix:** `pd.read_csv/read_excel(..., dtype=str)` agar leading zero NISN tidak hilang (sebelumnya 0099990001 → 99990001).
- i18n: `nisn`, `gender`, `gender_short`, `gender_l`, `gender_p` (ID/EN). Terverifikasi: curl create/patch/impor (leading zero utuh, normalisasi gender OK) + screenshot UI (kolom & form tampil, tambah/hapus jalan). Suite tetap 65/65.

## Update 2026-09-19 (iterasi 23 — NISN & L/P di laporan/ekspor)
- `report_attendance` meng-enrich baris siswa dengan `nisn`/`gender` (join ke koleksi students via student_id).
- Ekspor **XLSX**: kolom baru NISN & L/P, header "Guru"→"Nama". Ekspor **PDF**: kolom NISN & L/P dengan posisi kolom diatur ulang (muat A4). Tabel **Laporan** di UI: kolom NISN & L/P (colSpan 10).
- Terverifikasi: XLSX terunduh & ter-parse berisi kolom NISN/L/P, PDF valid, header UI benar, tanpa overflow desktop/mobile, suite 65/65.

## Update 2026-09-19 (iterasi 24 — ekspor daftar siswa)
- Endpoint baru `GET /admin/students/export?format=xlsx|csv` (kolom: Nama, NIS, NISN, L/P, Kelas, Enroll Wajah). Tombol **Ekspor XLS** di header halaman Siswa (di samping Impor) mengunduh `siswa.xlsx` via blob.
- i18n: `export_file` (ID/EN). Terverifikasi: curl xlsx (120 baris, kolom benar) & csv; screenshot UI (tombol tampil, download `siswa.xlsx` ter-trigger, tanpa overflow desktop/mobile).

## Update 2026-09-19 (iterasi 25 — bulk delete siswa)
- Endpoint `POST /admin/students/bulk-delete` {ids:[]} (scoped school_id, maks 1000). UI Siswa: checkbox per baris + select-all (per halaman), baris terpilih di-highlight, tombol merah **Hapus Terpilih (N)** muncul di header saat ada seleksi, dengan konfirmasi.
- i18n: `delete_selected`, `confirm_delete_many`, `deleted_ok` (ID/EN). Terverifikasi: curl (buat 3 → bulk-delete 3 → bersih), screenshot e2e (buat 2 via UI flow → select-all → hapus → "Belum ada data"), tanpa overflow, suite 65/65.

## Update 2026-09-19 (iterasi 26 — dropdown "Tampilkan N entri")
- Page-size selector (10/25/50/100) di atas tabel Siswa & Guru, dan di header kartu Absensi Hari Ini (Dasbor) — ganti konstanta 10 jadi state `pageSize`, reset ke halaman 1 saat diganti.
- i18n: `show_entries` (ID "Tampilkan" / EN "Show").

## Update 2026-09-19 (iterasi 27 — rebrand EduGateID)
- Nama aplikasi: "Absensi Sekolah" → **EduGateID**, tagline **"Gerbang Absensi Digital Sekolah Masa Kini."** (EN: "The Modern Digital School Attendance Gateway.").
- i18n: `app_name` diganti, key baru `app_tagline` (dipakai hero halaman Login; key `tagline` lama tidak dipakai lagi). Title index.html diganti.
- Penyebutan nama lama di backend ikut diganti: header PDF laporan & invoice (pdfgen), EMAIL_FROM_NAME & default smtp_from_name (emailer/notif), pesan tes email/WA (routes_notif), pesan tagihan WA owner (routes_owner).
- Terverifikasi screenshot login: nama + tagline + title baru tampil, nama lama hilang.

## Update 2026-09-19 (iterasi 28 — nama perusahaan)
- Nama perusahaan **PT. Pusaka Kreasi Mandiri** ditambahkan: footer halaman Login ("EduGateID oleh PT. Pusaka Kreasi Mandiri · SaaS Multi-Tenant · v1 Pilot"), key i18n `company_name` (ID=EN), header PDF laporan ("EduGateID · PT. Pusaka Kreasi Mandiri"), footer PDF invoice.
- Terverifikasi: screenshot login (company name tampil), generate PDF invoice + laporan via python langsung OK.

## Update 2026-09-19 (iterasi 29 — logo EduGateID konsep C)
- Logo konsep C (huruf "E" gerbang + bracket face-scan, teal) dipilih user dari 3 konsep hasil generate; latar putih di-chroma-key jadi transparan (PIL), disimpan 512px ke `frontend/public/logo.png` + `backend/assets/logo.png`.
- Terpasang di: favicon (index.html), hero & mobile header Login (tile putih), header portal (Layout), layar pairing Kiosk, header Pay, kop PDF invoice (tile putih di band teal) & PDF laporan (kiri judul).
- Terverifikasi: screenshot login/dasbor/kiosk (logo tampil, /logo.png http 200), PDF invoice+laporan render dgn logo (~262KB), suite 65/65.

## Update 2026-09-19 (iterasi 30 — logo final "E" pintu)
- User memilih konsep simple: kotak rounded teal + huruf "E" putih dengan pintu kecil (dari batch konsep sederhana, menggantikan konsep C yang dirasa sulit dipahami).
- Diproses transparan via **cv2.floodFill dari 4 sudut** (latar putih luar → alpha 0; huruf E putih di dalam tetap opaque — 52K piksel putih utuh), crop + 512px, menimpa `frontend/public/logo.png` & `backend/assets/logo.png`. File kandidat logo-c1..c4 dibersihkan.
- Semua titik pemasangan otomatis memakai logo baru (path sama). Terverifikasi: PDF invoice render OK, screenshot login & kiosk.

## Update 2026-09-19 (iterasi 31 — landing page publik)
- Route `/` kini **landing page publik** (`pages/Landing.jsx`, menggantikan redirect Home): navbar glass sticky, hero (tagline, CTA, stat, mockup kiosk CSS dengan animasi scanline), bento grid 8 fitur, cara kerja 3 langkah, section harga teal dengan **kalkulator slider interaktif** (tarif asli Rp 8.000/siswa/bulan), form kontak pilot, footer PT. Pusaka Kreasi Mandiri. Font Plus Jakarta Sans (Google Fonts di index.html). Desain mengikuti `/app/design_guidelines.json`.
- Backend baru `routes_public.py`: `POST /api/public/leads` (tanpa auth) menyimpan pengajuan pilot ke koleksi `leads`.
- Terverifikasi: screenshot desktop+mobile (tanpa overflow), curl leads 200 + tersimpan di Mongo, suite 65/65.
- Catatan: email kontak di landing sementara memakai susyanto@gmail.com — ganti saat ada email/WA resmi perusahaan.

## Update 2026-09-19 (iterasi 32 — notifikasi lead + halaman Leads owner)
- `routes_public.py`: setiap POST /public/leads kini juga mengirim **email notifikasi ke akun owner** (via Resend/emailer, HTML aman lolos _assert_safe_email, kegagalan email tidak menggagalkan submit).
- `GET /api/owner/leads` + halaman baru **Portal Owner → Pengajuan Pilot** (`/owner/leads`, menu ikon Inbox): tabel tanggal, sekolah, penanggung jawab, email, WA, jumlah siswa, pesan.
- i18n: `leads`, `contact_person`, `message` (ID/EN). Terverifikasi: curl POST lead → tersimpan & muncul di GET owner/leads, email notif terkirim ke owner, screenshot halaman Leads, suite 65/65.

## Update 2026-09-19 (iterasi 33 — pipeline status lead)
- Lead baru otomatis berstatus `new`. Endpoint `PATCH /api/owner/leads/{id}` (hanya new/contacted/onboarding/rejected, invalid → 422, 404 bila tak ada).
- Halaman Pengajuan Pilot: kolom **Status** berupa dropdown ber-badge warna (Baru=sky, Dihubungi=amber, Onboarding=teal, Ditolak=merah) — ubah langsung dari tabel, persist.
- i18n: `updated_ok`, `lead_status_*` (ID/EN). Terverifikasi: curl (contacted tersimpan, bogus→422), UI (ubah→onboarding→reload tetap), suite 65/65.

## Update 2026-09-19 (iterasi 34 — lead → sekolah 1 klik)
- Lead berstatus **Onboarding** menampilkan tombol **"Jadikan Sekolah"** → modal form tambah sekolah yang pre-fill: nama sekolah, WA, PIC, email, perkiraan jumlah siswa (tarif default Rp 8.000, password admin diisi owner). Submit memakai endpoint `POST /owner/schools` yang sudah ada.
- i18n: `convert_to_school` (ID/EN). Fix saat verifikasi: ikon `SchoolPlus` tidak ada di lucide-react terpasang → diganti `School`. Terverifikasi screenshot: tombol hanya muncul saat Onboarding, pre-fill benar (nama/email/PIC/WA/jumlah), modal tertutup normal.

## Update 2026-09-19 (iterasi 35 — rebranding tampilan mobile login)
- Masalah: panel hero teal login hanya tampil di desktop (`hidden lg:flex`) sehingga mobile polos gelap. Kini mobile punya **banner brand teal** edge-to-edge (logo + EduGateID + tagline + chip fitur + LangSwitch, rounded-b 2.5rem, ornamen lingkaran), form tetap di bawahnya. Desktop tidak berubah.
- Lanjutan: warna banner teal vs latar gelap terasa tabrakan → diganti **gradien halus** `teal-800 → #0f3d3a → slate-950` menyelimuti seluruh kolom form mobile (max-lg), banner tanpa bg/border sendiri sehingga menyatu.

## Update 2026-09-19 (iterasi 36 — lupa password & daftar trial self-service)
- **Lupa Password**: `POST /auth/forgot-password` (selalu 200, anti-enumeration; token `secrets.token_urlsafe(32)` disimpan sebagai **sha256 hash**, berlaku 1 jam, sekali pakai) → email link `{FRONTEND_URL}/reset-password?token=...` via Resend. `POST /auth/reset-password` validasi hash+expiry → update bcrypt, tandai used. Halaman baru `/reset-password`.
- **Daftar Trial**: `POST /auth/register-trial` — buat tenant sekolah (trial=True, trial_ends_at +14 hari) + admin + settings default + tercatat di `leads` (source self_service_trial) + email sambutan berisi kredensial. Email duplikat → 400 email_taken; password <6 → 422. Halaman baru `/daftar`, link dari Login ("Lupa Password?" + "Daftar Trial Gratis").
- **Trial expiry enforcement**: login menolak (403 trial_expired) bila trial_ends_at lewat — berlaku untuk semua role di sekolah itu.
- Halaman Reset/Daftar memakai gradien brand yang sama dengan login mobile. errMsg mapping: trial_expired, email_taken, invalid_or_expired, password_too_short (i18n ID/EN lengkap).
- Tes: `tests/test_auth_trial.py` (7 tes: register, duplikat, login trial, forgot neutral, reset flow + reuse/expired token, blokir login expired, cleanup) — xdist_group "auth_trial". E2E live curl 7 langkah PASS. **Suite 72/72 lulus.**

## Update 2026-09-19 (iterasi 37 — kenaikan kelas & kelulusan massal)
- Siswa kini punya field `status` ("aktif" default / "lulus"). Endpoint baru: `POST /admin/students/promote` {from_class, to_class} (update_many kelas, hanya siswa aktif) dan `POST /admin/students/graduate` {class_name} (set status=lulus).
- Siswa lulus: **dikeluarkan dari** pencocokan wajah kiosk, absen NIS, sync offline, daftar siswa di portal guru, statistik admin, dan **hitungan tagihan** (owner schools & billing). Data & riwayat tetap tersimpan.
- UI Siswa: tombol **"Kenaikan Kelas"** → modal (pilih Dari Kelas → isi Ke Kelas Baru → Naikkan Kelas; zona merah "Tandai Lulus" dengan hint). Badge "Lulus" di kolom nama, toggle "Tampilkan lulus" (default sembunyi).
- Tes: TestPromoteGraduate (buat 2 siswa kelas TESTPROMO → promote → graduate → absen NIS ditolak 422 → cleanup). **Suite 76/76 lulus.** E2E UI PASS (promote ZZ-NAIK→XI, graduate, badge, bulk-delete cleanup).

## Update 2026-09-19 (iterasi 38 — wizard tahun ajaran baru)
- Endpoint `POST /admin/students/promote-year` {promote:[{from_class,to_class}], graduate:[cls]} — **kelulusan diproses dulu, lalu kenaikan diurutkan menurun (XII→XI→X)** sehingga tidak ada siswa yang naik dua kali dalam satu run.
- Modal Kenaikan Kelas kini punya 2 tab: **Per Kelas** (lama) & **Tahun Ajaran Baru** — tabel semua kelas dengan saran target otomatis (X→XI, XI→XII, XII→centang Lulus), bisa diedit per baris, satu klik "Terapkan ke Semua Kelas" + konfirmasi.
- i18n: `year_mode`, `per_class_mode`, `year_hint`, `apply_year`, `confirm_year`, `year_ok`, `col_new_class`, `col_graduate` (ID/EN).
- Tes: TestPromoteYear (urutan atomic: TY-X→XI tidak dobel, TY-XI→XII tetap aktif, TY-XII asli→lulus). **Suite 79/79 lulus.** Screenshot UI: saran X-1→XI-1 benar, tab beralih normal (tidak diterapkan ke data demo).

## Update 2026-09-19 (iterasi 39 — template CSV impor siswa)
- Tombol **"Unduh template CSV"** di bawah tombol impor (header halaman Siswa) — mengunduh `template-siswa.csv` ber-BOM UTF-8 (rapi di Excel) berisi header `nama,nis,nisn,jk,kelas` + 2 baris contoh (L & P).
- Terverifikasi loop penuh: file template yang diunduh lolos endpoint import/preview (2 baris valid, NISN leading-zero utuh, gender ternormalisasi) + unduhan UI berfungsi.

## Update 2026-09-19 (iterasi 40 — fix impor file asli SMK Perwira Bangsa)
- Bug dilaporkan user saat impor tenant "perbas": kolom NISN tampil "-" (header file asli = "NISN/ PASSWORD", tidak persis "nisn") + error semu "Baris 2: Nama kosong" (baris kosong pemisah di bawah header).
- Fix `import_preview`: pencocokan kolom longgar berbasis kandungan (**nisn sebelum nis** karena "nisn" mengandung "nis"; nama/name, kelas/class/rombel, jk/kelamin/gender); baris benar-benar kosong di-skip diam-diam, baris tanpa nama tapi berisi data tetap dilaporkan.
- Verifikasi file asli via endpoint (token admin perbas): 422/422 valid, NISN terisi semua (mis. 0055384886), 0 error, 12 kelas terdeteksi (X TAV … XII TB 3). Suite 79/79.

## Backlog Prioritas
- P0: Kunci Tripay asli dari user + uji webhook; tablet React Native (kiosk native, embedding cache on-device)
- P1: Absen siswa (v2), geofence penuh untuk absen via HP pribadi guru
- P2: Gateway tambahan (Duitku/Midtrans), audio pre-recorded pengganti TTS, shadcn Calendar pengganti native date picker (catatan testing), absensi berbasis jadwal shift

## Next Tasks
1. Minta kunci Tripay (merchant code, API key, private key) dari user → aktifkan mode real
2. Uji lapangan kiosk di HP dengan wajah asli (kalibrasi threshold)
3. Build tablet app React Native + TS (Fase 2 native)

## 2026-09-19 — Enroll Wajah Massal (ZIP)
- Endpoint baru `POST /api/admin/students/enroll-zip` (routes_admin.py): upload ZIP foto, nama file = NIS atau cocok via mapping Excel/CSV opsional (kolom NIS + nama file). Laporan per-file: sukses / NIS tidak ditemukan / wajah tidak terdeteksi / >1 wajah / duplikat wajah orang lain.
- Refactor `_face_dup_check` -> helper `_face_dup_name` (dipakai ulang oleh enroll ZIP tanpa mengubah perilaku endpoint enroll tunggal).
- UI: tombol "Enroll Massal (ZIP)" + modal di halaman Admin > Siswa (Students.jsx), laporan di layar + unduh CSV. i18n ID/EN ditambah.
- Fix kecil: overflow horizontal mobile di halaman Siswa (toolbar tombol kini flex-wrap).
- Terverifikasi: e2e curl (2 sukses, 1 NIS tak dikenal, duplikat ditolak, mapping CSV jalan), screenshot UI desktop+mobile, pytest 79 passed.

## 2026-09-19 — Fix Invoice Duplikat & Periode Aneh
- Akar masalah: tes invoice di backend_test.py memakai periode acak (tahun 3000-3899) dan menulis ke DB preview live tanpa cleanup -> 78 invoice sampah di halaman Tagihan sekolah demo.
- Fix: fixture test_period kini tetap ("2099-12") + teardown_class TestInvoices menghapus invoice tes via pymongo langsung.
- Backend: validasi format periode di POST /owner/invoices/generate (regex ^(19|20)\d{2}-(0[1-9]|1[0-2])$, 422 jika salah).
- PDF invoice kini menampilkan periode "September 2026" (nama bulan Indonesia) via periode_label() di pdfgen.py.
- Cleanup DB: 75 invoice sampah dihapus + PDF yatim dibersihkan (dibuat ulang on-demand). Tersisa: 2026-06 (lunas) + 2026-09 per sekolah.
- Terverifikasi: 422 untuk periode invalid, dedupe periode berjalan, pytest TestInvoices 6/6, halaman Tagihan bersih.

## 2026-09-19 — Tampilan Periode Bulan di UI Tagihan
- Helper `periodLabel(period, lang)` di i18n.js ("2026-09" -> "September 2026" / EN "September 2026").
- Diterapkan di halaman Tagihan admin (Billing.jsx) dan Invoice owner (OwnerInvoices.jsx).
- Terverifikasi screenshot: ID ("September 2026", "Juni 2026") & EN ("June 2026"), halaman owner ikut berubah.

## 2026-09-19 — Invoice Bulanan Otomatis (Cron)
- `.emergent/crons.yml`: cron `monthly-invoices` jalan tiap tanggal 1 jam 00:00 UTC (07:00 WIB) -> POST /api/cron/monthly-invoices.
- `routes_cron.py` (baru): auth Bearer WEBHOOK_CRON_SECRET (constant-time), idempotensi via run_id di koleksi `cron_runs`, ack 2xx langsung + kerja di background task, hasil (created/sent/status) dicatat di cron_runs.
- Refactor routes_owner: logika generate diekstrak ke `generate_for_period(period, send_email)` (dipakai endpoint owner + cron). Email invoice otomatis terkirim ke sekolah yang punya admin_email.
- WEBHOOK_CRON_SECRET ditambahkan di backend/.env (jangan commit).
- Insiden data: guru demo (Budi + user, Susiyanto) & siswa demo NIS 10001-10003 pernah terhapus (residu insiden lama, bukan tes aktif) -> sudah di-restore; suite hijau (78 passed, 1 skipped) dan data tetap utuh setelah suite jalan.
- Terverifikasi: 401 tanpa/salah token, 200 + duplicate run_id, background done (created:0 utk periode berjalan karena sudah ada), generate_for_period('2026-08') create 3 lalu dedupe 0 lalu dibersihkan, crons.yml valid.

## 2026-09-19 — Pengingat Invoice H+10 Otomatis (Cron ke-2)
- Cron `invoice-reminders` (crons.yml): harian 01:00 UTC (08:00 WIB) -> POST /api/cron/invoice-reminders.
- Logika: invoice unpaid berumur >=10 hari -> kirim pengingat email (+ WA via Wablas jika nomor sekolah ada); diulang tiap 7 hari, maks 3x. Dilacak via `last_reminder_at` + `reminder_count` di dokumen invoice.
- Hardening: kegagalan kirim 1 sekolah (mis. email undeliverable) kini dicatat (send_failed di cron_runs) dan TIDAK menghentikan sekolah lain — berlaku juga di generate_for_period (endpoint owner + cron bulanan).
- Terverifikasi: run1 reminded=1 send_failed=1 (email demo fake ditolak Resend, tapi tetap tercatat), run2 skip (anti-spam), pytest 78 passed / 1 skipped.

## 2026-09-19 — Fix: Pengaturan Jam Kerja Tertimpa Tes (regresi berulang)
- Akar masalah: test_kiosk_clock.py diakhiri `test_zzz_restore_settings` yang me-restore ke nilai DEBUG hardcoded (01:00/00:00/30/30), dan test_settings_partial_and_rejection.py memaksa EXPECTED_FINAL yang sama -> tiap suite jalan, jam kerja asli sekolah demo tertimpa.
- Fix: kedua file tes kini pakai fixture autouse `settings_guard` (snapshot pengaturan asli via API di awal modul, restore persis di akhir). Tes penutup hardcoded dihapus/diganti.
- Pengaturan demo dipulihkan ke 07:00/15:00, toleransi 10, early 60, WIB, require_checkin=true.
- Bukti regresi: snapshot settings SEBELUM == SESUDAH suite penuh (78 passed / 1 skipped).

## 2026-09-19 — Fix: Absen larut malam tercatat "ok" untuk shift siang
- Akar masalah: `_late_overtime` (routes_kiosk.py) memakai `_closest_on_clock` (wrap-around 24 jam) untuk SEMUA shift. Absen masuk 22:45 pada shift 07:00 dianggap "22:45 kemarin" -> late=0, status ok.
- Fix: wrap-around hanya untuk shift malam (jam pulang <= jam masuk). Shift siang memakai selisih mentah -> absen 22:45 kini tercatat LATE 935 menit. Skenario shift malam (01:00/21:00) tetap utuh.
- Tes regresi baru: test_scenario7_day_shift_night_checkin_marked_late di test_kiosk_clock.py.
- Rekaman absen SUSIYANTO 2026-09-19 22:45 yang salah dikoreksi (status late, 935 menit).
- Terverifikasi: pytest 79 passed / 1 skipped (semua skenario jam lama + baru hijau).

## 2026-09-19 — Fitur: Jam Buka-Tutup Kiosk (opsi C)
- Settings baru `kiosk_open` / `kiosk_close` (HH:MM, opsional; kosong/null = tidak dibatasi) di SettingsIn + UI Pengaturan (2 input time + hint, ID/EN).
- _record (routes_kiosk.py): absen di luar window -> 422. Belum buka: `kiosk_not_open:HH:MM:{sisa_menit}`; sudah tutup: `kiosk_closed:HH:MM:{jam_buka}:{sisa_sampai_buka}`. Berlaku untuk in/out, face & NIS, offline sync aman (pakai ts_device asli).
- Kiosk.jsx menampilkan pesan berbahasa + hitung mundur ("Absen mulai pukul 05:00 — 3 jam 15 menit lagi").
- Fix terkait: put_settings kini memakai exclude_unset dan mengizinkan None eksplisit untuk kiosk_open/close (sebelumnya None dibuang -> window tidak bisa dikosongkan). Body kosong tetap 400.
- settings_guard di kedua file tes diperluas mencakup kiosk_open/close (restore null jika memang tidak diset).
- Tes baru: test_scenario8_kiosk_open_close_window (04:30 ditolak + detail, 22:45 ditolak + detail, 07:05 ok).
- Terverifikasi: e2e curl (set/window reject/clear via null), pytest 80 passed / 1 skipped, UI Pengaturan desktop+mobile OK tanpa overflow.

## 2026-09-19 — Fix: Window kiosk lewat tengah malam (23:00-06:00) menolak semua absen
- Akar masalah: pengecekan window menganggap jam buka < jam tutup; window overnight membuat jam 23:10 dianggap "lewat tutup" dan jam 01:00 dianggap "belum buka".
- Fix: jika close <= open maka window dianggap aktif saat minutes >= open ATAU minutes <= close. Helper _hhmm_to_min ditambahkan. Pesan penolakan tetap membawa jam buka + hitung mundur.
- Tes baru: test_scenario9_overnight_kiosk_window (23:30 diterima, 12:00 ditolak not_open 660).
- Hardening tes: _set_settings & _ensure_baseline kini selalu me-null-kan kiosk_open/close agar skenario tidak bergantung konfigurasi live user; settings_guard mengembalikan window user apa adanya.
- Terverifikasi: pytest 81 passed / 1 skipped; window user 23:00-06:00 tetap utuh setelah suite jalan.

## 2026-09-19 — Revert: fitur Kiosk Dibuka/Ditutup dihapus atas permintaan user
- User memutuskan cukup pakai Jam Kerja (jam masuk/pulang/toleransi/early window); field kiosk_open/kiosk_close dihapus dari UI Pengaturan, SettingsIn, logika _record, handler Kiosk.jsx, i18n, dan tes (scenario8/9 dihapus, guard dikembalikan ke 6 field asli).
- Logika yang dipertahankan: shift siang tanpa wrap-around (absen larut = telat), shift malam pakai wrap, too_early pakai early_checkin_min, require_checkin toggle.
- DB: kiosk_open/kiosk_close di-unset dari dokumen settings.
- Terverifikasi: pytest 79 passed / 1 skipped, halaman Pengaturan bersih (desktop+mobile, tanpa overflow).

## 2026-09-19 — Aturan final absen masuk (permintaan user, tanpa pengaturan tambahan)
- Shift siang (jam pulang > jam masuk): absen masuk otomatis DITOLAK jika lewat jam pulang -> 422 `past_work_end:HH:MM` (kiosk: "Sudah lewat jam kerja (jam pulang pukul X). Absen masuk ditolak." ID/EN).
- Tetap berlaku: terlalu pagi -> too_early (early_checkin_min sebelum jam masuk); antara buka s/d jam pulang -> ok/telat sesuai toleransi; shift malam -> perilaku lama (wrap-around).
- Status sakit/izin dikecualikan dari aturan lewat-jam-pulang.
- Tes: scenario7 diubah jadi expect 422 past_work_end; test_student_kiosk_v2.py diberi fixture wide_hours (jam kerja dilebarkan sementara lalu dikembalikan) agar kebal waktu real-time.
- Rekaman uji malam SUSIYANTO dibersihkan dari DB.
- Terverifikasi: e2e 4 kasus (23:55 ditolak, 12:00 late 290, 05:30 too_early, izin 23:55 diterima), pytest 79 passed / 1 skipped, settings demo utuh.

## 2026-09-20 — Ubah sapaan voice kiosk
- kiosk_welcome (ID): "Selamat bekerja" -> "Selamat beraktivitas" (dipakai saat absen masuk berhasil di Kiosk.jsx).
- Tervalidasi user: aturan jam masuk 00:00 berfungsi (absen 00:05 diterima tepat waktu).

## 2026-09-20 — Sapaan voice kiosk final
- kiosk_success (ID): "Absen berhasil" -> "Presensi berhasil".
- kiosk_welcome (ID): -> "Selamat beraktivitas dan jangan lupa berdoa".
- Hasil suara absen masuk: "Presensi berhasil. [Nama]. Selamat beraktivitas dan jangan lupa berdoa." (pulang tetap "Hati-hati di jalan").

## 2026-09-20 — Sapaan voice absen pulang dipisah
- Key baru kiosk_success_out (ID: "Presensi pulang berhasil" / EN: "Check-out recorded").
- kiosk_goodbye (ID): -> "Sampai jumpa besok, hati-hati di jalan" (EN: "See you tomorrow, safe trip home").
- Kiosk.jsx: suara absen pulang kini "Presensi pulang berhasil. [Nama]. Sampai jumpa besok, hati-hati di jalan."

## 2026-09-20 — Sapaan voice kiosk kustom per sekolah
- Settings baru `greeting_in` / `greeting_out` (SettingsIn + 2 input di halaman Pengaturan dengan placeholder = sapaan bawaan, ID/EN).
- Kiosk.jsx: suara memakai sapaan kustom jika diisi, fallback ke bawaan jika kosong. Data mengalir via /kiosk/info (settings).
- Terverifikasi: API simpan->kiosk/info membaca->kosongkan kembali ke bawaan; pytest 79 passed / 1 skipped; UI desktop+mobile OK.

## 2026-09-20 — Laporan Kehadiran Siswa untuk Guru
- Field baru `classes` (kelas yang diampu, mis. "X-1, X-2") di TeacherIn/TeacherPatch + input di form tambah & modal edit guru (admin).
- Endpoint guru baru (routes_teacher.py): GET /teacher/my-classes, /teacher/report/attendance (harian), /teacher/report/recap (per siswa: hadir/telat/sakit/izin/alpha + hari efektif), /teacher/report/export (xlsx & pdf, reuse build_report_pdf). Semua dibatasi hanya kelas yang diampu; kelas di luar -> 403.
- Portal guru (TeacherHome.jsx): kartu "Laporan Kehadiran Siswa" — filter kelas + rentang tanggal, tab Harian/Rekap, tombol unduh Excel/PDF. i18n ID/EN.
- Kelas Budi (demo guru) dipasang "X-1, X-2" agar langsung bisa dicoba.
- Terverifikasi: my-classes OK, rows hanya kelas diampu, X-9 -> 403, export xlsx/pdf 200, pytest 79 passed / 1 skipped, UI desktop+mobile.

## 2026-09-20 — Perjelas tombol aksi guru + kolom kelas
- Tabel Guru: tombol Ubah/Hapus kini berteks (bukan ikon saja); kolom baru "Kelas" menampilkan kelas yang diampu tiap guru; modal Ubah Guru punya input Kelas yang Diampu.
- Menu guru dipisah jadi 3 tab: Presensi Saya (/guru), Izin Siswa (/guru/izin), Laporan Siswa (/guru/laporan).

## 2026-09-20 — Checkbox Mapel & Kelas di form Guru
- Endpoint GET /admin/meta/options (kelas dari data siswa, mapel dari guru yang ada) di routes_admin.py.
- Teachers.jsx: komponen CheckGroup (checkbox multi-select, auto-merge pilihan lama agar tidak hilang) menggantikan input teks Mata Pelajaran & Kelas yang Diampu di form tambah + modal edit. Mapel baru bisa diketik via input "Mapel lain". Nilai tetap disimpan sebagai string koma.
- Terverifikasi: checkbox muncul & tercentang sesuai data Budi (Matematika, X-1, X-2), pytest 79 passed / 1 skipped, mobile OK.
- Catatan data: ada kelas "X1" (tanpa strip) dari rekaman siswa SUSIYANTO lama — perlu dirapikan manual di data siswa jika mau.

## 2026-09-20 — Dropdown kelas di form Siswa + rapi data
- Students.jsx: input kelas (tambah & edit) diganti komponen ClassSelect = dropdown dari daftar kelas yang ada + opsi "+ Kelas baru" (muncul input teks). i18n ID/EN.
- Data: kelas "X1" -> "X-1" untuk 2 siswa + 4 rekaman absensi.

## 2026-09-20 — Data Master: Kelola Kelas & Mata Pelajaran di Pengaturan
- Settings baru `class_list` / `subject_list` (SettingsIn). Jika diset -> menjadi daftar master authoritative; jika null -> diturunkan dari data siswa/guru (mode derived, default).
- Endpoint baru: POST /admin/meta/rename (propagasi ganti nama ke students, attendance, teachers.classes/subject) dan POST /admin/meta/delete (ditolak 400 jika masih dipakai: class_in_use:N / subject_in_use). meta_options kini memakai _effective_list.
- SettingsPage: kartu "Data Master" dengan komponen MasterList (chip + rename inline + hapus + tambah) untuk Kelas & Mapel.
- Students.jsx: dropdown kelas kini membaca /admin/meta/options (fallback derived).
- Terverifikasi: rename kelas & mapel propagasi + bisa dikembalikan, hapus diblokir saat dipakai (X-1 dipakai 22 siswa), tambah/hapus OK, pytest 79 passed / 1 skipped, UI desktop+mobile OK.

## 2026-09-20 — Data Master per Tipe Sekolah (SD/SMP/SMA/SMK)
- Settings baru `school_type` + `major_list`. meta_options kini juga mengembalikan `majors`; meta rename/delete mendukung kind "major".
- Pengaturan > Data Master: dropdown Tipe Sekolah; tombol "Gunakan Template {tipe}" mengisi otomatis kelas/mapel/jurusan standar nasional (DIGABUNG dengan daftar yang ada, tidak menimpa); bagian Daftar Jurusan tampil khusus SMA/SMK.
- Template: SD (Kelas 1-6 + mapel umum SD), SMP (7-9), SMA (X-XII + IPA/IPS/Bahasa), SMK (X-XII + TKJ/RPL/TKR/TBSM/AKL/BDP + mapel umum & produktif).
- Sekolah demo diset SMK (data riil user: kelas X TKJ/TAV/TB, mapel produktif TAV/Boga).
- Terverifikasi: rename/hapus jurusan via API, template merge via UI, pytest 79 passed / 1 skipped, mobile OK.

## 2026-09-20 — Tipe Sekolah & Jurusan sejak pendaftaran
- schoolTemplates.js (baru): SCHOOL_TYPES + MAJOR_OPTIONS (SMA: IPA/IPS/Bahasa; SMK: TKJ/RPL/TAV/TITL/TKR/TBSM/TPM/AKL/BDP/Tata Boga/Tata Busana/Multimedia/DKV/Perhotelan/Farmasi/Keperawatan/MPLB).
- Backend: TrialIn & SchoolIn terima school_type + majors; settings sekolah baru langsung berisi school_type + major_list; lead trial mencatat tipe & jurusan.
- Frontend: halaman /daftar (trial), modal "Jadikan Sekolah" (OwnerLeads, prefill dari lead), dan form Buat Sekolah (OwnerDashboard) semua punya dropdown Tipe Sekolah + checklist Jurusan (muncul hanya untuk SMA/SMK) + input "Jurusan lain". Tenant baru otomatis hanya melihat jurusan yang dipilih saat pendaftaran.
- Terverifikasi: e2e register-trial (settings bertipe SMK + jurusan tersimpan, lead tercatat, cleanup bersih), UI /daftar & owner form (checklist muncul/hilang sesuai tipe), pytest 79 passed / 1 skipped, mobile OK.

## 2026-09-20 — Edit tipe & jurusan untuk sekolah yang sudah ada (Owner)
- SchoolPatch terima school_type + majors; PATCH /owner/schools/{id} menyimpan keduanya ke koleksi settings (upsert). GET /owner/schools kini membawa school_type + majors dari settings.
- OwnerDashboard: modal Ubah Sekolah punya dropdown Tipe Sekolah + checklist Jurusan (prefill dari data tersimpan, merge dengan daftar opsi agar jurusan lama tidak hilang) + input "Jurusan lain".
- Data: SMK Perwira Bangsa diset tipe SMK + jurusan [TAV, Tata Boga] (diturunkan dari kelas riilnya). Sekolah demo SMA Nusantara berisi daftar bidang keahlian yang diinput user via Data Master.
- Terverifikasi: PATCH owner -> settings tenant berubah, modal edit prefill benar, pytest 79 passed / 1 skipped.

## 2026-09-20 — Tabel Absensi Hari Ini: grup per orang
- AdminDashboard.jsx: tabel digrup per orang (kunci student_id/teacher_id/nama). Kolom: Nama, Masuk (jam + telat), Pulang (jam), Status ringkasan (Komplit / Masuk Saja / Pulang Saja / Sakit / Izin), chevron expand.
- Klik baris -> panel detail 2 kartu (Absen Masuk & Absen Pulang): jam, status, menit telat, GPS, catatan, tombol hapus per rekaman.
- Pagination kini per orang (bukan per rekaman). i18n: att_sum_complete/in_only/out_only (ID/EN).

## 2026-09-21 — Poster QR Kiosk (auto-pairing)
- `pdfgen.py`: `build_kiosk_poster_pdf(school, pair_url)` — poster A4: header teal + logo, nama sekolah, QR besar (lib `qrcode` 8.2, ditambah ke requirements.txt), kode kiosk, instruksi ID.
- Endpoint `GET /api/admin/kiosk-poster` (routes_admin.py) → FileResponse PDF `poster-kiosk-<token>.pdf`; pair_url = `{FRONTEND_URL}/kiosk?pair=<kiosk_token>`.
- Kiosk.jsx: auto-pair dari query `?pair=` (loadInfo → simpan token, URL dibersihkan via replaceState; kode invalid → pesan error).
- SettingsPage: tombol "Unduh Poster QR" di kartu kode kiosk (unduh blob). i18n `kiosk_poster` ID/EN.
- Terverifikasi: curl 200 application/pdf, analisis PDF (logo/nama/QR/kode/instruksi OK), screenshot auto-pair `/kiosk?pair=KIOSK-C55BFCE1` langsung masuk kiosk SMK Perwira Bangsa tanpa form pairing, mobile aman.

## 2026-09-21 — Tipe orang baru: Karyawan + sistem Lembur
- Koleksi `employees`: {id, school_id, user_id (role "employee"), name, nip, department, position, overtime_rate (null = ikut default), embedding, photo, active}. Koleksi `overtime_requests`: {id, school_id, employee_id, employee_name, date, minutes, reason, status pending/approved/rejected, decided_by/at}.
- routes_admin.py: CRUD `/admin/employees` + `/admin/employees/{id}/enroll` (anti-duplikat wajah lintas guru+siswa+karyawan); PATCH dengan $unset overtime_rate saat dikosongkan. Settings baru `overtime_rate` (default Rp/jam) & `department_list`; meta options/rename/delete mendukung kind "department" (propagasi ke employees.department, hapus diblokir `department_in_use:N`). Stats dasbor + employees_present/total_employees/pending_overtime.
- routes_employee.py (baru, role "employee"): GET /employee/me (tarif efektif), /employee/attendance, GET+POST /employee/overtime (validasi 15-720 menit).
- Persetujuan: GET /admin/overtime (?status), POST /admin/overtime/{id}/decision (hanya pending, pola DecisionIn seperti cuti).
- Laporan lembur: GET /admin/reports/overtime + /export (xlsx). Aturan upah: menit dibayar = min(lembur aktual dari absen pulang, menit disetujui) per tanggal; tanpa persetujuan = 0. Upah = menit/60 × tarif (override karyawan atau default sekolah).
- Kiosk: pencocokan wajah kini guru+siswa+karyawan (person_type=employee, dup field employee_id); input manual NIS menerima NIP karyawan (respons `name` + tetap `student_name` utk kompat); sync offline fallback NIP.
- Frontend: halaman admin Employees.jsx (CRUD + enroll + DeptSelect dropdown/baru + search/pagination), Overtime.jsx (tab Persetujuan + tab Laporan Lembur dgn total Rp + ekspor), portal EmployeeHome.jsx (/karyawan: profil+tarif, form ajukan lembur, riwayat pengajuan, riwayat presensi). Menu Layout + homeFor employee. Badge "Karyawan" di tabel dasbor. i18n ID/EN lengkap; label kiosk NIS → "NIS / NIP".
- Fix tes: backend_test.py::test_list_schools tidak lagi hardcode >=120 siswa (sekolah demo memakai student_count_manual=100 untuk billing) → assert count>0 + source valid.
- Terverifikasi: e2e curl (buat karyawan → login role employee → ajukan lembur → admin approve → absen NIP di kiosk 200 → duplikat 409 → recap → ekspor xlsx → rename departemen propagasi → hapus departemen dipakai diblokir → cleanup bersih), pytest full suite, screenshot UI (menu + kedua halaman, mobile OK).

## 2026-09-21 — Rekap Penggajian sederhana (gaji pokok + lembur)
- Field baru `base_salary` (Rp/bulan, opsional) di employees: EmployeeIn/Patch (PATCH null → $unset, pola sama dgn overtime_rate), form & modal edit Employees.jsx + kolom tabel Gaji Pokok.
- Endpoint: `GET /admin/reports/payroll?period=YYYY-MM` (validasi format 422) & `GET /admin/reports/payroll/export?period=` (xlsx `penggajian-<period>.xlsx`). `_payroll_rows`: reuse `_overtime_recap` per bulan + `present_days` (hari unik absen masuk) + total_pay = base_salary + overtime_pay.
- UI: tab ke-3 "Penggajian" di halaman Lembur (Overtime.jsx) — month picker, tabel per karyawan (hadir, lembur disetujui, upah lembur, gaji pokok, total), baris grand total, ekspor XLS. i18n: payroll, payroll_period, base_salary, total_pay, present_days, apply (ID/EN).
- Terverifikasi: e2e curl (karyawan gaji 3jt + lembur 90 mnt ×25rb → total Rp 3.037.500 benar; periode invalid 422; ekspor 200; unset base_salary → total hanya lembur; cleanup bersih), pytest 79 passed / 1 skipped, screenshot tab Penggajian desktop+mobile tanpa overflow.

## 2026-09-21 — Portal Orang Tua (login no. HP) + notif WA absen
- Siswa: field baru `parent_phone` (dinormalisasi via notif.normalize_phone) — form tambah/edit siswa, kolom tabel & preview impor, template CSV + kolom impor (header mengandung ortu/wali/parent/hp/telp), ekspor XLSX (kolom "HP Ortu"), ikut pencarian. Hapus siswa (tunggal/massal) ikut menghapus akun ortunya; PATCH parent_phone menyinkronkan no. HP akun ortu.
- Endpoint `POST /admin/students/create-parent-accounts` (bulk): 1 anak = 1 akun ortu (role "parent"), login via **no. HP** + password awal = NIS anak (fallback 6 digit HP); idempoten (skip sudah_ada / hp_dipakai). Tombol "Buat Akun Ortu" di halaman Siswa.
- Login (routes_auth): LoginIn.email kini string — mengandung "@" → email; selain itu → no. HP (role parent). Endpoint baru `POST /auth/change-password` (semua role, err wrong_current_password / password_too_short).
- routes_parent.py (baru): GET /parent/me (info anak + sekolah), GET /parent/attendance (read-only), POST /parent/leave (sakit/izin anak langsung tercatat via _record manual, recorded_by_name "Orang Tua", anti-duplikat 409).
- Notifikasi WA otomatis ke ortu saat siswa absen (kiosk wajah & NIS): `_notify_parent` fire-and-forget via send_whatsapp — aktif hanya jika Wablas terkonfigurasi (mode link = diam-diam lewati), kegagalan tidak mengganggu absen.
- Frontend: halaman `/ortu` (ParentHome.jsx): kartu anak, form izin/sakit, ganti password, tabel aktivitas per hari (masuk/pulang/status badge + catatan). Login.jsx menerima "Email / No. HP". Menu/portal parent + homeFor("/ortu"). i18n ID/EN (parent_portal, child_activity, dll + date/late_short).
- Terverifikasi: e2e 13 langkah (bulk create idempoten, login HP, salah password 401, me, absen NIS 200 + jalur notif WA aman, izin sakit tercatat + duplikat 409, ganti password → lama tolak/baru terima, ortu→admin 403, cleanup bersih), pytest 79 passed / 1 skipped, screenshot portal desktop+mobile tanpa overflow.

## 2026-09-22 — Ringkasan absensi mingguan ke orang tua (cron ke-3)
- Cron `weekly-parent-summary` (crons.yml): Jumat 10:00 UTC (17:00 WIB) → `POST /api/cron/weekly-parent-summary` (auth + idempotensi run_id seperti cron lain).
- `_run_weekly_parent_summary` (routes_cron.py): per sekolah, rentang Senin–hari ini (zona waktu sekolah), per siswa ber-parent_phone: Hadir (x hari, telat y kali), Sakit, Izin, Tanpa keterangan (hari kerja berjalan − hadir − sakit − izin). Terkirim hanya jika Wablas aktif; tanpa Wablas dihitung `not_sent`. Hasil (sent/not_sent/send_failed) dicatat di cron_runs.
- Terverifikasi: 401 tanpa token, 200 + duplicate run_id, run done dengan not_sent=1 (siswa uji ber-HP ortu + 1 absen minggu ini, Wablas belum aktif), cleanup bersih.

## 2026-09-22 — Modul SPP & Tagihan (merger aplikasi EduPay ID / repo Kumarahotspot/SPP)
- Koleksi: `bill_categories` (5 default di-seed per sekolah: SPP/Ujian/Kegiatan/Seragam/Lainnya; rename terpropagasi ke tagihan, hapus diblokir category_in_use:N), `bills` {student_id, title, category, amount, paid_amount, due_date; status diturunkan: unpaid/partial/paid}, `spp_payments` {bill_id, amount, method, channel manual/tripay_demo, reference MAN-/DEMO-, recorded_by}.
- routes_spp.py (baru): CRUD kategori; tagihan tunggal (anti-duplikat student+title+due_date → 409) & **generate massal** semua siswa/per kelas (skip duplikat, lapor created/skipped); pembayaran manual (parsial/cicilan, overpayment 422, hapus tagihan diblokir jika sudah ada pembayaran); stats dasbor SPP; ekspor Excel transaksi per bulan; detail tagihan + riwayat pembayaran. Kuitansi WA ke ortu tiap pembayaran (no-op tanpa Wablas).
- Portal ortu: GET /parent/spp (tagihan + riwayat anak), POST /parent/spp/pay (**MODE DEMO**: langsung tercatat; beralih ke Tripay asli saat kredensial diisi). UI ParentHome: kartu Tagihan SPP dengan progress bar + tombol Bayar + riwayat.
- Cron ke-4 `spp-reminders` (harian 09:00 WIB): pengingat WA H-3 & H-1 jatuh tempo (dedupe per bill via reminded_for).
- Frontend: halaman admin `/admin/spp` (Spp.jsx — 4 kartu statistik, tab Tagihan/Transaksi, filter periode+kelas+status+cari, modal Buat Tagihan/Generate Massal/Bayar Manual/Kelola Kategori, ekspor XLS). Menu "SPP & Tagihan". i18n lengkap ID/EN + errMsg overpayment.
- Fix dari testing agent (iteration_8): modal Kelola Kategori tidak bisa ditutup → komponen Modal kini punya tombol X + tutup via klik backdrop.
- **Testing**: e2e curl 16 langkah lolos; testing agent UI 9/9 flow lolos (buat tagihan, massal 123 siswa anti-duplikat, cicilan→lunas, blokir hapus kategori terpakai, login ortu via HP + bayar demo, regresi + mobile OK); pytest 79 passed / 1 skipped. Data uji (125 tagihan, 3 pembayaran, siswa+akun ortu uji) dibersihkan.
- Backlog SPP dari aplikasi lama yang BELUM dipindah: laporan grafik (chart per kategori/bulan), kuitansi PDF cetak, import/migrasi data tagihan lama, Midtrans.

## 2026-09-22 — Fix UX: akun ortu otomatis dibuat saat No. HP disimpan
- Masalah: user mengisi No. HP Ortu di form siswa lalu mencoba login → gagal, karena akun ortu sebelumnya hanya dibuat via tombol "Buat Akun Ortu".
- Fix: `_ensure_parent_account()` dipanggil otomatis saat tambah siswa (add_student) dan edit siswa (update_student, jika belum ada akun). Respons menyertakan parent_account (created/exists/phone_used) → toast info di Students.jsx. Edit No. HP tetap menyinkronkan akun yang ada. No. HP yang sudah dipakai akun ortu lain ditolak dengan toast jelas.
- Akun siswa Arto (6282112393993) langsung dibuatkan via bulk endpoint (idempoten).
- Terverifikasi: login 6282112393993/696969 OK (role parent); auto-create saat tambah siswa; ganti No. HP → login HP baru OK, HP lama ditolak; duplikat HP → phone_used; pytest 79 passed / 1 skipped.

## 2026-09-22 — Indikator "Akun Ortu" di tabel Data Siswa
- `list_students` menyertakan `has_parent_account` (lookup satu query ke users role=parent). Sel "No. HP Orang Tua" kini menampilkan badge: hijau "✓ Akun Aktif" / abu "Belum Ada Akun" (testid parent-account-<id>). i18n parent_account_active/none (ID/EN).

## 2026-09-22 — Tombol "Kirim Info Login WA" per siswa
- Endpoint `POST /admin/students/{id}/send-parent-login`: memastikan akun ortu ada (auto-create), menyusun pesan info login (portal FRONTEND_URL + No. HP + password NIS) lalu kirim via send_whatsapp. **Password hanya di-reset ke NIS jika WA benar-benar terkirim (Wablas aktif)** — jika gateway belum aktif, respons berisi wa_link (wa.me) untuk kirim manual dan password TIDAK diubah (ortu tidak terkunci).
- Frontend Students.jsx: tombol ikon WA hijau per baris (hanya jika ada No. HP), dialog konfirmasi menjelaskan reset password, fallback buka WhatsApp manual. i18n send_parent_login* (ID/EN).
- Terverifikasi: e2e (auto akun, ganti password → kirim info login mode link: sent=False, password_reset=False, wa_link valid, password lama tetap berlaku, NIS ditolak), tombol tampil di UI (screenshot), cleanup bersih, pytest 79 passed / 1 skipped.

## 2026-09-22 — Field siswa baru: Nama Ortu, Email Ortu, Alamat
- students: field `parent_name`, `parent_email`, `address` — form tambah/edit siswa, PATCH StudentPatch, ekspor XLSX (kolom Nama Ortu/Email Ortu/Alamat), tabel menampilkan nama ortu di atas No. HP. Nama akun ortu kini memakai parent_name jika diisi (bukan "Orang Tua <siswa>").
- Impor CSV/XLSX: mapping kolom diurutkan ulang agar header gaya aplikasi SPP lama (`nis,nama_siswa,kelas,nama_wali,email_wali,no_hp,alamat`) terbaca benar — email/alamat/hp dicek SEBELUM ortu/wali/parent (nama), dan ortu/wali/parent sebelum nama generik (mencegah `nama_wali` tertukar jadi nama siswa). Preview impor menampilkan kolom Nama Ortu. Template CSV diperbarui dengan 3 kolom baru.
- Terverifikasi: curl add student (3 field tersimpan + akun ortu bernama "Bambang Uji"), import-preview header aplikasi lama terpetakan sempurna, ekspor 10 kolom, form UI menampilkan 4 field ortu/alamat, pytest 79 passed / 1 skipped, cleanup bersih.

## 2026-09-22 — Notifikasi SPP via Email Ortu (selain WA)
- `_receipt_notify` (routes_spp.py, menggantikan _receipt_wa): kuitansi pembayaran terkirim via WA **dan** email HTML ke parent_email (kuitansi mencakup siswa, tagihan, nominal, referensi, status LUNAS/Cicilan). Dipakai pembayaran manual admin & pembayaran demo ortu.
- Cron `spp-reminders` kini mengirim email pengingat H-3/H-1 (HTML) selain WA; hasil run memisahkan wa_sent/wa_not_sent/email_sent/send_failed; dedupe reminded_for tetap.
- Temuan lingkungan: proxy email Emergent (Resend) memblokir alamat undeliverable (mis. example.com) dengan 422 `undeliverable_recipient` — kegagalan ditangani graceful (dicatat, dihitung send_failed). Untuk pengujian email gunakan `delivered@resend.dev`.
- Terverifikasi: kuitansi email terkirim tanpa error, cron pengingat email_sent=1 & send_failed=0 (alamat resend.dev), dedupe run kedua 0 kirim, cleanup bersih, pytest 79 passed / 1 skipped.

## 2026-09-22 — UX: field Alamat diperlebar jadi textarea + urutan form dirapikan
- Atas masukan user (field alamat terlalu sempit): Alamat di form tambah siswa kini textarea 2 baris selebar penuh form (w-full, ~1214px desktop); di modal Ubah Siswa textarea lebar penuh modal (sm:col-span-2, ~408px). Testid tetap student-address / edit-student-address.
- Atas masukan user: urutan field form tambah & modal edit siswa kini Nama → NIS → NISN → **Jenis Kelamin → Kelas** → No. HP Ortu → Nama Ortu → Email Ortu → Alamat → tombol simpan.
- **Validasi form siswa (atas permintaan user)**: Jenis Kelamin & Kelas WAJIB (required + cek JS toast `required_gender_class`) di form tambah & modal edit; format No. HP ortu divalidasi regex `^(\+?62|0)8\d{7,12}$` (toast `invalid_phone`); format email ortu divalidasi (toast `invalid_email`). ClassSelect kini menerima prop req. Backend sengaja tetap lentur agar impor massal tanpa JK/kelas tidak putus.

## 2026-09-22 — Kartu Kelengkapan Data Orang Tua di Dasbor admin
- `GET /admin/stats` kini menyertakan `parent_data`: {total, with_phone, with_complete, per_class[{class,total,phone,complete}]} — "lengkap" = No. HP + email + nama ortu + alamat semua terisi.
- AdminDashboard: kartu "Kelengkapan Data Orang Tua" (testid parent-data-card) dengan ringkasan keseluruhan + progress bar per kelas (testid pc-<kelas>), scroll jika kelas banyak. i18n parent_data_completeness/parent_data_complete/parent_phone_short (ID/EN).
- Terverifikasi: curl stats (total 122, with_phone 2, complete 1, per_class benar, stats lain utuh), screenshot kartu tampil rapi desktop+mobile tanpa overflow.
- **Klik navigasi (atas permintaan user)**: bar per kelas di kartu kelengkapan kini tombol → `navigate("/admin/students?q=<kelas>")`; Students.jsx membaca query param `q` saat mount untuk mengisi kolom pencarian otomatis. Tooltip `view_class_students` (ID/EN). Terverifikasi screenshot: klik "X TB 1" → URL `/admin/students?q=X%20TB%201`, pencarian terisi, tabel terfilter kelas tsb.

## 2026-09-22 — Kartu statistik Dasbor bisa diklik
- Kartu Hadir Hari Ini / Siswa Hadir / Telat Hari Ini / Karyawan Hadir = toggle filter tabel "Absensi Hari Ini" di halaman yang sama (state `flt`: teacher/student/late/employee; chip filter aktif dengan tombol X, tabel auto-scroll ke tabel, klik ulang = hapus filter; dukung query `?f=`). Kartu Pengajuan Menunggu → /admin/leaves, Total Guru → /admin/teachers, Total Siswa → /admin/students.
- Kartu kini <button> dengan hover lift + ring teal saat aktif. Terverifikasi screenshot: chip "Telat Hari Ini ×" muncul + ring aktif, toggle off menghilangkan chip, navigasi kartu ke halaman siswa/izin berfungsi.
- **Urutan dasbor (atas permintaan user)**: tabel "Absensi Hari Ini" kini TAMPIL DULUAN, kartu "Kelengkapan Data Orang Tua" di bawahnya. Terverifikasi screenshot: urutan DOM TABLE_FIRST, klik bar kelas tetap berfungsi, tanpa overflow mobile.

## 2026-09-22 — Pemilih tanggal di tabel absensi Dasbor
- `GET /admin/today` kini menerima query `date=YYYY-MM-DD` (default hari ini zona waktu sekolah; format invalid → 422).
- AdminDashboard: input date (testid att-date, max = hari ini) di header tabel "Absensi Hari Ini"; ganti tanggal → tabel reload + reset ke halaman 1. Kartu statistik tetap menampilkan data HARI INI. Terverifikasi screenshot: default hari ini, ganti ke kemarin memuat data 21/09 (6 baris "Komplit"/"Masuk Saja"), kembali ke hari ini normal, tanpa overflow mobile.
- Terverifikasi screenshot (urutan testid terukur benar di kedua form, tanpa overflow mobile).


## 2026-09-22 — Absensi per Mata Pelajaran (guru) — SELESAI
- Permintaan user: guru mapel bisa mengabsen siswa per sesi pelajaran (mis. jam pertama Bahasa Inggris, jam berikutnya mapel lain).
- Backend (routes_teacher.py): GET /teacher/subject-att/meta (mapel & kelas yang diampu), GET /teacher/subject-att (date+subject+class_name → students + records + saved), POST /teacher/subject-att (upsert ke koleksi `subject_attendance`, validasi mapel/kelas diampu → 403, status hadir/sakit/izin/alpha). Admin: GET /admin/subject-attendance (routes_admin.py:837) dengan filter date_from/date_to/class_name/subject.
- Frontend: halaman guru /guru/mapel (TeacherSubjectAtt.jsx) — picker tanggal+mapel+kelas, tabel siswa dgn 4 tombol status, counter badge, tombol Semua Hadir & Simpan, catatan edit bila sesi sudah tersimpan; menu ke-4 "Absen Mapel" di Layout. Admin Reports.jsx: tab "Per Mapel" (tab-subject) dengan filter tanggal/kelas/mapel.
- i18n: subject_att, mapel, att_hadir/sakit/izin/alpha, all_present, att_saved, att_edit_note, subject_att_tab, all_subjects (ID/EN).
- Fix saat verifikasi: (1) label dropdown filter mapel admin salah pakai all_status → all_subjects; (2) overflow horizontal 8px (scrollWidth 540) di tab Per Mapel mobile 390px karena select memakai lebar opsi mapel terpanjang → select dibatasi (w-full + max-w-full pada wrapper).
- Terverifikasi: curl e2e (meta OK, GET 22 siswa, POST saved=22, reload saved=true, 403 mapel/kelas di luar ampuan, admin rows=22); testing agent frontend 100% (/app/test_reports/iteration_9.json: persistence setelah reload, ganti kelas, filter admin, regresi menu guru, mobile OK); screenshot ulang pasca-fix overflow: 390=390 OK, desktop OK.
- Data demo sengaja disimpan: absen mapel Matematika X TB 1 tanggal 2026-09-22 (Galang=sakit, Kasmujo=izin, 20 hadir).

## Backlog Prioritas (per 2026-09-22)
- P0: Kunci Tripay asli dari user → aktifkan mode real + uji webhook (SPP & billing SaaS)
- P1: Token Wablas asli dari user → uji kirim WA nyata (notif ortu, ringkasan mingguan, pengingat SPP)

## 2026-09-22 — Laporan Kehadiran per Siswa (Admin) + export
- Permintaan user (dengan screenshot referensi aplikasi lama): laporan kehadiran per siswa di Admin → Laporan, filter Kelas + rentang tanggal, sub-tab Harian (n) / Rekap (n), export Excel & PDF. Keputusan: cakupan semua kelas; alpha dari hari efektif; PDF berkop sekolah; laporan guru tetap ada.
- Backend (routes_admin.py): helper `_student_report_rows` + `_student_recap` (hitungan per TANGGAL UNIK: hadir/telat/sakit/izin, alpha = hari efektif − (hadir∪sakit∪izin)); endpoint GET /admin/reports/students (harian), /admin/reports/students/recap, /admin/reports/students/export (format xlsx|pdf, kind daily|recap, filter class_name).
- pdfgen.py: `build_recap_pdf` (kop logo+nama sekolah, kolom Nama/Kelas/Hadir/Telat/Sakit/Izin/Alpha/Hari Efektif, multipage).
- Konsistensi: rekap guru (`teacher_report_recap`) ikut dikoreksi ke hitungan tanggal unik (sebelumnya absen masuk+pulang terhitung 2× hadir).
- Frontend Reports.jsx: tab baru "Per Siswa" (tab-students) — filter Dari/Sampai/Kelas + tombol Export Excel/PDF (mengikuti sub-tab aktif: rekap-kehadiran-siswa.* atau laporan-siswa.*), sub-tab Harian/Rekap dengan jumlah, tabel status ber-badge. Kolom Jam menampilkan "-" untuk sakit/izin. i18n: student_att_tab (ID/EN), sisanya reuse.
- Terverifikasi: curl e2e (23 baris harian, filter X TB 1 → 12, rekap 22 siswa dgn angka benar, 4 kombinasi export valid, PDF berkop, regresi guru OK); testing agent frontend 100% (/app/test_reports/iteration_10.json: semua flow + export filename + mobile 390 tanpa overflow + regresi tab lain & laporan guru & dasbor).

## 2026-09-22 — Laporan Guru & Karyawan di Admin (generalisasi laporan per orang)
- Permintaan user (screenshot dengan 2 slot tab kosong): tab "Per Guru" dan "Per Karyawan" di Admin → Laporan, pola sama dengan Per Siswa.
- Backend digeneralisasi: `PEOPLE_REPORT_CFG` (student/teacher/employee → koleksi, field id, ref NIS/NIP, grup Kelas/Mapel/Departemen, label, slug file). Endpoint lama `/admin/reports/students*` DIGANTI: GET /admin/reports/people, /admin/reports/people/recap, /admin/reports/people/export (param person, 422 bila invalid). Rekap per tanggal unik (hadir/telat/sakit/izin/alpha + hari efektif), guru/karyawan hanya yang active.
- `build_recap_pdf` kini berparameter person_label & grp_label (kop+logo tetap). Export xlsx harian kini menyertakan kolom Tipe & Lembur + NIS/NIP (join ke data orang); nama file rekap-kehadiran-{siswa|guru|karyawan}.* dan laporan-{siswa|guru|karyawan}.*.
- Frontend Reports.jsx ditulis ulang: komponen bersama `PersonReport` (prefix testid st/tc/emp) untuk 3 tab; tab bar kini 5 tab dengan flex-wrap (mobile aman). Tabel harian PersonReport punya kolom Tipe & Lembur (mnt). i18n baru: teacher_att_tab, employee_att_tab (ID/EN).
- Data demo: sekolah demo hanya punya 1 guru aktif (Budi) & 1 karyawan ('lembur') → angka rekap 0 adalah expected (belum ada absensi dalam rentang).
- Terverifikasi: curl e2e (3 person + invalid 422 + 4 export valid), testing agent frontend 100% (/app/test_reports/iteration_11.json: 7/7 flow, unduhan benar, regresi bersih, mobile 390 tanpa overflow).

## 2026-09-22 — Fix filter tab Harian Laporan: tipe orang (Semua/Siswa/Guru)
- Laporan user (screenshot): dropdown filter di tab Harian sebelumnya memfilter per nama guru ("Semua Guru" + daftar nama) — seharusnya filter tipe orang: **Semua / Siswa / Guru**.
- Backend: `report_attendance` & `report_export` menerima param `person` (student/teacher/employee → q person_type; teacher_id lama tetap didukung). Frontend Reports.jsx: dropdown guru diganti select `report-person` (label "Tipe", opsi Semua/Siswa/Guru); fetch /admin/teachers dihapus (tidak dipakai lagi); export mengikuti filter aktif. i18n baru: all_people (ID "Semua" / EN "All").
- Terverifikasi: curl (semua=25, siswa=23, guru=2, employee=0; export xlsx terfilter 23 baris) + screenshot UI (opsi benar, filter bekerja, mobile 390 tanpa overflow).

## 2026-09-22 — Form Tambah Siswa disembunyikan di balik tombol (seperti Guru & Karyawan)
- Keluhan user (screenshot): form tambah siswa selalu tampil di atas halaman Siswa, memakan banyak ruang. Diminta field hanya muncul saat klik "Tambah Siswa", mengikuti pola halaman Guru & Karyawan (state showForm).
- Students.jsx: state baru `showForm` (default false); tombol "+ Tambah Siswa" (testid add-student-btn, solid teal) di header men-toggle form; form dibungkus `{showForm && ...}`; form otomatis tertutup setelah submit sukses. Testid form & field tidak berubah (add-student-form, student-name, dst).
- Terverifikasi screenshot: default tersembunyi, klik → tampil (semua field utuh), klik lagi → tertutup, mobile 390 tanpa overflow.

## 2026-09-22 — CRUD Izin/Cuti di tabel admin + bersih-bersih data uji
- Permintaan user (screenshot tabel Izin/Cuti penuh data sampah "TEST leave"): tambahkan CRUD di tabel.
- Backend (routes_admin.py): POST /admin/leaves (admin buat atas nama guru, status langsung approved, 404 guru salah sekolah, 400 tipe invalid), PATCH /admin/leaves/{lid} (type/date_from/date_to/reason, 400 bila kosong/tipe invalid, 404), DELETE /admin/leaves/{lid} (404 bila tak ada). Semua scoped school_id.
- Frontend Leaves.jsx ditulis ulang: tombol "+ Tambah Izin/Cuti" (toggle form: pilih guru, tipe izin/sakit/cuti, dari–sampai, alasan), tombol Edit (modal) & Hapus di SETIAP baris (bukan hanya pending), approve/reject tetap untuk pending. i18n baru: add_leave, edit_leave (ID/EN).
- **Fix akar masalah data sampah (isu berulang dari fork sebelumnya)**: TestLeaves di backend_test.py membuat leave "TEST leave" tanpa cleanup — kini ada test_zz_cleanup yang menghapus via DELETE endpoint baru. 50 record sampah di DB preview dibersihkan (sisa 1 record asli: Susiyanto sakit).
- Terverifikasi: curl e2e (create→approved, patch, 400/404, delete, list konsisten), screenshot UI (form toggle, opsi guru, modal edit, tombol per baris, mobile 390 tanpa overflow).

## 2026-09-23 — Filter Periode SPP diganti dropdown Bulan & Tahun
- Keluhan user (screenshot): filter "Periode" di halaman SPP & Tagihan memakai `input type="month"` yang tampil kosong — diminta isi Bulan dan Tahun.
- Spp.jsx: komponen baru `MonthYearPicker` (dropdown Bulan berbahasa ID/EN + dropdown Tahun, rentang tahun-3 s/d tahun+1; opsi "Semua Bulan"/"Semua Tahun" = tanpa filter) menggantikan input type="month" di tab Tagihan (flt-month) DAN tab Transaksi (pay-flt-month). i18n.js: MONTHS_ID/MONTHS_EN kini diekspor; key baru all_months/all_years.
- Bug yang ditemukan saat verifikasi: memilih tahun lalu bulan me-reset picker (nilai parsial hilang karena onChange("") menimpa) → diperbaiki dengan state lokal `sel` di komponen.
- Backend tidak berubah (filter month=YYYY-MM via regex due_date/paid_at terverifikasi benar: Agu 2026 → 0 baris, Sep 2026 → 4 baris).
- Terverifikasi screenshot: pilih tahun tetap tersimpan, bulan+tahun memfilter benar, kosongkan bulan menonaktifkan filter, tab Transaksi default September 2026, mobile 390 tanpa overflow.

## 2026-09-23 — Kolom Tgl Bayar di tabel Tagihan SPP + MonthYearPicker jadi komponen bersama
- Permintaan user: "tambahkan juga tgl pembayarannya" (+ persetujuan menerapkan picker Bulan/Tahun ke halaman lain).
- Backend routes_spp.py: `list_bills` kini melampirkan `last_paid_at` (tanggal pembayaran terakhir per tagihan, join spp_payments).
- Frontend Spp.jsx: kolom baru "Tgl Bayar" (testid bill-paid-at-<id>, "—" bila belum ada pembayaran), colSpan 8→9. i18n baru: payment_date (ID "Tgl Bayar" / EN "Paid Date").
- `MonthYearPicker` diekstrak ke `/app/frontend/src/components/MonthYearPicker.jsx` (mandiri via useTranslation, prop allowEmpty — false = tanpa opsi "Semua"). Dipakai di: Spp.jsx (tab Tagihan & Transaksi), Overtime.jsx (periode payroll, allowEmpty=false), OwnerInvoices.jsx (periode invoice, allowEmpty=false) — menggantikan semua input type="month".
- Terverifikasi: curl (last_paid_at terisi benar untuk lunas/cicilan, kosong untuk belum lunas), screenshot 3 halaman (kolom Tgl Bayar tampil benar, picker payroll & invoice default September 2026 dan berfungsi).

## 2026-09-23 — Tabel Tagihan SPP dikelompokkan per siswa (accordion)
- Permintaan user (screenshot): "Tagihan dikelompokkan berdasarkan nama, di klik keluar semua tagihannya".
- Spp.jsx (murni frontend, data sudah lengkap dari API): tagihan dikelompokkan per student_id; baris grup menampilkan nama+kelas, jumlah tagihan, total jumlah, total sisa, jatuh tempo terdekat yang belum lunas, badge status agregat (paid/partial/unpaid), chevron berputar saat terbuka; klik baris → expand semua tagihan siswa itu (baris detail lengkap: judul, kategori, jumlah, sisa, jatuh tempo, tgl bayar, status, aksi Bayar Manual/hapus). Testid: bill-group-<student_id>, bill-group-status-<id>, bill-row-<id> tetap untuk detail.
- Terverifikasi screenshot: 3 grup (Siswa Demo 10, Arto 4 tagihan, Evandra 2), default tertutup, klik Arto → 4 tagihan tampil dengan tombol bayar, klik lagi → tertutup, mobile 390 expand berfungsi tanpa overflow.

## 2026-09-23 — Dokumen PDF SPP: kuitansi, invoice tagihan, rekap per siswa
- Permintaan user: cara print invoice/PDF SPP. Keputusan (ask_human): kuitansi pembayaran + invoice tagihan + rekap semua tagihan per siswa; format standar sekolah (kop logo+nama sekolah, data siswa, nominal, tanggal, status, kolom tanda tangan petugas); unduh PDF saja (tanpa WA dulu).
- pdfgen.py: helper `_spp_kop` (kop teal+logo), `_signature` (tanggal + kolom ttd), `terbilang` (angka→teks Rupiah); builder `build_spp_receipt_pdf` (kuitansi: no ref, diterima dari, rincian, nominal+terbilang, status LUNAS/CICILAN+sisa), `build_spp_invoice_pdf` (invoice: no SPP-, status, rincian+terbayar+sisa, catatan cara bayar), `build_spp_bills_pdf` (rekap semua tagihan 1 siswa + total, multipage).
- routes_spp.py endpoints: GET /admin/spp/payments/{pid}/receipt.pdf, GET /admin/spp/bills/{bid}/invoice.pdf, GET /admin/spp/students/{sid}/bills.pdf (opsional ?month=YYYY-MM mengikuti filter periode aktif). 404 untuk id ngawur. Nama file: kuitansi-<ref>.pdf, tagihan-<id8>.pdf, rekap-tagihan-<nis>.pdf.
- Frontend Spp.jsx: helper dlPdf; tombol PDF rekap di baris grup siswa (stopPropagation agar tidak ikut expand), tombol invoice PDF per tagihan di baris detail, kolom "Aksi" + tombol "Kuitansi PDF" per baris di tab Transaksi. i18n: download_receipt/download_invoice/download_student_bills (ID/EN).
- Terverifikasi: curl 3 endpoint → PDF valid (~275KB) + 404 benar; isi PDF diekstrak pypdf (terbilang benar "Seratus Lima Puluh Ribu Rupiah"); screenshot: 3 unduhan terpicu dengan nama file benar, mobile 390 tanpa overflow.

## 2026-09-23 — Tombol "Kuitansi PDF" langsung di modal pembayaran
- Persetujuan user atas saran: setelah pembayaran manual berhasil, modal menawarkan unduh kuitansi tanpa pindah ke tab Transaksi.
- Spp.jsx: state `paidReceipt` menampung respons POST /admin/spp/payments; setelah sukses, modal "Bayar Manual" berganti panel sukses (ikon, judul, nominal, no. referensi) dengan tombol "Kuitansi PDF" (testid pay-download-receipt → dlPdf receipt.pdf) dan "Tutup". Panel ter-reset saat modal dibuka untuk pembayaran baru. i18n baru: pay_success, close (ID/EN).
- Terverifikasi E2E via browser: bayar Rp 25.000 Tunai ke tagihan "SPP Agustus" Siswa Demo 10 → panel sukses tampil (Ref MAN-A23AE29B) → unduhan kuitansi-MAN-A23AE29B.pdf terpicu → tabel grup ter-update (Cicilan, sisa Rp 75.000, Tgl Bayar 2026-09-23) → modal tertutup normal.

## 2026-09-23 — Kuitansi PDF untuk Orang Tua di Portal Ortu
- Persetujuan user atas saran: ortu bisa mengunduh bukti bayar sendiri.
- Backend routes_parent.py: GET /parent/spp/payments/{pid}/receipt.pdf — validasi kepemilikan (payment.student_id harus anak dari ortu yang login; 404 bila bukan), memakai build_spp_receipt_pdf yang sama.
- Frontend ParentHome.jsx: helper dlReceipt + tombol "Kuitansi PDF" (testid parent-receipt-<payment_id>) di setiap baris Riwayat Pembayaran.
- Terverifikasi: curl login ortu (ortu+6282112393993@edugateid.local / NIS anak 696969) → kuitansi milik anaknya 200 PDF valid; id ngawur 404; kuitansi milik siswa lain 404 (validasi kepemilikan benar). Screenshot: 5 tombol kuitansi tampil, unduhan kuitansi-DEMO-*.pdf terpicu, mobile 390 tanpa overflow.

## 2026-09-23 — Panel sukses + kuitansi setelah ortu bayar online (Portal Ortu)
- Persetujuan user atas saran: samakan UX modal admin → setelah ortu bayar online, panel sukses dengan tombol "Kuitansi PDF".
- Backend routes_parent.py: respons `pay_bill` kini menyertakan `id` pembayaran (untuk unduh kuitansi). Catatan: sempat terjadi duplikasi baris return akibat insert_text yang menyertakan ulang baris anchor — diperbaiki di commit yang sama.
- Frontend ParentHome.jsx: state `paidReceipt`; modal bayar berganti panel sukses (ikon, nominal, Ref, tombol "Kuitansi PDF" testid parent-pay-receipt + "Tutup" testid parent-pay-close); panel ter-reset saat modal dibuka lagi.
- Terverifikasi E2E browser: ortu bayar SPP September Rp 25.000 → panel sukses (Ref DEMO-9D9110D2) → unduhan kuitansi-DEMO-9D9110D2.pdf terpicu → progress bar tagihan ter-update (Rp 525.000/Rp 1.500.000) → modal tertutup → mobile 390 OK.

## 2026-09-23 — REBRANDING: EduGateID → RadiusGate + logo baru
- Permintaan user: ganti nama aplikasi menjadi RadiusGate + buatkan logo.
- Logo baru digenerate (image_generation_tool): mark cincin radar "radius" + pin lokasi (mewakili GPS geofence), teal #0F766E, flat. File asli JPEG → dikonversi PIL (putih→transparan, crop ke konten) menjadi PNG 1024×1024, ditempatkan di /app/frontend/public/logo.png DAN /app/backend/assets/logo.png (dipakai kop PDF: laporan, kuitansi, invoice, poster kiosk).
- Rename global case-sensitive "EduGateID"→"RadiusGate" via sed di 18 file (i18n, Landing, Login, Kiosk, RegisterTrial, Pay, ResetPassword, Layout, index.html, emailer, notif, pdfgen, routes_admin/auth/cron/kiosk/notif/owner/public/spp). SENGAJA tidak menyentuh domain internal huruf kecil `@edugateid.local` (email akun ortu existing — menggantinya akan merusak login ortu yang sudah ada).
- Terverifikasi: grep EduGateID = 0 sisa; backend restart bersih; login API OK; kuitansi PDF 200; screenshot: halaman login (title tab "RadiusGate — Gerbang Absensi..."), header admin, landing page, mobile — semua menampilkan nama + logo baru, logo transparan rapi di background terang & gelap.

## 2026-09-23 — Logo final: varian 8 (pin orbit), transparan
- User meminta alternatif logo → digenerate 2 batch (8 konsep total); user memilih **logo 8: pin lokasi dengan cincin orbit, gradasi teal→emerald**, minta transparan.
- File JPEG hasil generate → PIL: piksel putih (r/g/b>232) → alpha 0, crop ke konten, PNG 1024×1024, ditimpa ke /app/frontend/public/logo.png + /app/backend/assets/logo.png (semua kop PDF otomatis ikut).
- Terverifikasi: kuitansi PDF 200 dengan logo baru; screenshot login + header admin + mobile menampilkan logo pin orbit transparan dengan rapi.
- File sumber semua varian logo tersimpan di /tmp (logo8.png dsb) — URL generate tercatat di percakapan bila perlu varian lain.

## 2026-09-23 — Logo diperbesar & dikuatkan
- Keluhan user: tampilan logo "kurang kuat". Dua akar masalah: (1) konversi transparan ambang global mengikis piksel gradasi terang; (2) ukuran tampilan kecil (28–44px).
- Fix konversi: flood-fill BFS dari 4 sudut (hanya latar luar >240 yang jadi transparan; interior utuh termasuk lubang pin putih) + ImageEnhance Color 1.15 & Contrast 1.08 → warna lebih pekat.
- Ukuran diperbesar: header Layout 32→44px, Login 44→64px (panel) & 40→48px (form), Landing header 36→48px (teks ikut lg→xl), Kiosk 64→80px, ResetPassword/RegisterTrial 40→48px, Pay 36→44px, mock kiosk landing 28→36px, kontak landing 36→44px.
- Terverifikasi: view file PNG (gradasi utuh pekat), screenshot login desktop+mobile, header admin, landing — logo tampak besar & kuat, mobile tanpa overflow.

## 2026-09-23 — Logo tanpa background (final)
- Keluhan user: logo masih punya background. Dua sumber: (1) pembungkus putih (bg-white rounded box) di halaman gelap — semua div pembungkus dihapus (Layout, Login×2, Kiosk, Landing×2, ResetPassword, RegisterTrial, Pay), logo kini <img> transparan langsung; (2) lubang tengah pin & latar JPEG yang bernoise.
- Konversi final: numpy alpha berbasis saturasi+kecerahan — latar JPEG (mn>205 & spread<28) → transparan, mark opaque, alpha di-GaussianBlur 1.2 untuk tepi halus, crop ketat. Pendekatan ambang global & flood-fill sebelumnya gagal karena noise JPEG (halo abu-abu tetap opaque / gradasi terkikis).
- Desain di-regenerate sekali lagi (konsep tetap pin orbit) untuk bentuk yang lebih bersih & lebih kuat terbaca di ukuran kecil → hasil akhir 801×628 PNG transparan penuh (53,8% transparan).
- Terverifikasi: kuitansi PDF 200 dengan logo baru; screenshot login (panel gelap tanpa kotak), header admin, landing, mobile.

## 2026-09-23 — Logo diganti ke desain upload user
- User mengupload logo resmi RadiusGate (file aset: "Logo RadiusGate modern.webp", 2000×2000, mark bundar "R" + wordmark).
- Proses: deteksi celah kolom kosong (proyeksi vertikal numpy) untuk memisahkan ikon dari wordmark (celah di x=631–694) → crop ikon → pad ke kanvas persegi 613×613 → transparansi saturasi+kecerahan (mn>205 & spread<28 → alpha 0, GaussianBlur 1.2) → ditempatkan di /app/frontend/public/logo.png + /app/backend/assets/logo.png.
- Catatan: crop ikon+wordmark versi horizontal juga tersedia di /tmp/rg_new.webp bila kelak dibutuhkan untuk kop dokumen landscape.
- Terverifikasi: view PNG (mark utuh, 59,7% transparan), screenshot login desktop+mobile (mengapung di panel gelap tanpa kotak), header admin, landing page (header + mock kiosk), kuitansi PDF 200 dengan logo baru.

## 2026-09-23 — Varian logo putih monokrom untuk background gelap
- Keluhan user (screenshot lingkaran merah di panel login): ikon gelap kurang jelas di panel teal gelap.
- Solusi: `logo-white.png` (mark diisi putih penuh memakai channel alpha dari ikon berwarna) di /app/frontend/public/. Dipakai HANYA di penempatan gelap: Login (panel kiri + sisi form), Kiosk pair, RegisterTrial, ResetPassword, Pay, Landing (mock kiosk bg-slate-900 + footer bg-slate-900). Penempatan terang (header Layout, header Landing, teks footer kecil) tetap logo berwarna. Kop PDF tetap berwarna (kertas putih).
- Terverifikasi screenshot: logo putih kontras jelas di panel gelap (desktop+mobile), header admin tetap berwarna, mock kiosk & footer landing memakai versi putih, mobile 390 tanpa overflow.

## 2026-09-23 — Landing page: konten Pembayaran Uang Sekolah (multi payment gateway)
- Permintaan user: landing page sebelumnya hanya membahas absensi → tambahkan pembayaran uang sekolah dengan multi payment gateway.
- Landing.jsx (hardcode ID, bukan i18n): (1) subtitle hero menyebut pembayaran SPP online (QRIS/VA/e-wallet); (2) 2 kartu fitur baru — "Pembayaran Uang Sekolah" (SPP Online, wide) & "QRIS, VA & E-Wallet" (badge Multi Payment Gateway); (3) nav baru "Pembayaran" (#pembayaran); (4) seksi baru #pembayaran: copy fitur (tagihan massal, cicilan, kuitansi PDF, pengingat WA/email, rekap tunggakan) + mock kuitansi LUNAS dengan panel "Scan untuk bayar" + badge channel (QRIS, BCA, BNI, BRI, Mandiri, OVO, DANA, GoPay, ShopeePay, Alfamart); (5) checklist harga ditambah "Pembayaran SPP online".
- Terverifikasi screenshot: seksi pembayaran tampil & anchor nav bekerja, kartu fitur baru render, mobile 390 tanpa overflow.

## 2026-09-23 — Fix lubang kosong di grid Fitur landing
- Keluhan user (screenshot): grid fitur punya sel kosong (3 kartu wide=col-span-2 → 13 sel terpakai dari 16 di lg 4-kolom).
- Fix: kartu "Kiosk Web di HP/Tablet" tidak lagi wide → total 12 sel = 3 baris penuh (lg: Face2+GPS+Offline / Kiosk+Billing+SPP2 / QRIS+Invoice+Dwibahasa+Umpan; md 2-kolom juga pas tanpa lubang).
- Fix lanjutan (ditemukan saat verifikasi): blob dekoratif `absolute -inset-6` di mockup hero & mockup seksi pembayaran menyebabkan overflow horizontal 8px di mobile 390px → diubah ke `-inset-4 sm:-inset-6`. Terverifikasi screenshot: grid 3 baris penuh tanpa lubang, mobile scrollWidth 390 = clientWidth 390.

## 2026-09-23 — Hero landing: mockup statis diganti slideshow foto
- Permintaan user (screenshot): area mockup hero diganti slideshow — "ada siswa lagi absen, Radius Kiosk dll".
- 3 gambar digenerate (siswa antre absen di kiosk gerbang SMA, tablet kiosk dengan UI face-recognition sukses, admin memantau dashboard di laptop) → disimpan lokal di /app/frontend/public/slides/ (siswa-absen.jpg, kiosk.jpg, dashboard.jpg).
- Landing.jsx: layar mockup kiosk diganti slideshow auto-rotate 4,5 dtk (crossfade opacity 700ms) + dot indikator (klik untuk pindah) + caption dinamis per slide (judul + sub) di bar bawah frame; frame gelap "RadiusGate · Kiosk" tetap dipertahankan. Testid: hero-slideshow, slide-dot-0..2, slide-caption.
- Terverifikasi screenshot: slideshow tampil, klik dot mengganti slide+caption, auto-rotate berjalan, mobile 390 tanpa overflow.

## 2026-09-23 — Screensaver slideshow di Mode Kiosk
- Persetujuan user atas saran: slideshow jadi screensaver kiosk. (User sempat khawatir hak cipta gambar AI — dijelaskan aman: karya orisinal hasil generate, boleh komersial.)
- Kiosk.jsx: state saver/saverSlide + lastActRef; pointerdown/keydown mereset timer & menutup screensaver; interval 5 dtk mengaktifkan saver bila phase idle & bukan offlinePick & idle >45 dtk; slide berganti tiap 4,5 dtk. Overlay fullscreen (z-40, di bawah offline picker z-50): 3 slide /slides/*.jpg crossfade 1 dtk + gradien gelap, header logo-white+nama sekolah+jam, hint berdenyut "Sentuh layar untuk absen", dot indikator. i18n baru: kiosk_tap_to_attend (ID/EN).
- Testid: kiosk-screensaver, kiosk-saver-clock, kiosk-saver-hint.

## 2026-09-23 — Screensaver kiosk jadi papan info sekolah (slide teks bisa diatur admin)
- Persetujuan user atas saran: screensaver ditingkatkan jadi papan informasi — admin bisa menambah slide pengumuman teks sendiri.
- Tanpa perubahan backend: `saver_notes` ikut tersimpan di dokumen settings via PUT /admin/settings dan ikut terkirim di payload GET /kiosk/info.
- SettingsPage.jsx: kartu baru "Papan Info Kiosk (Screensaver)" (testid saver-board-form) — daftar slide (judul + isi opsional), tambah/hapus/simpan (saver-note-add/del-N/save).
- Kiosk.jsx: saverSlides = 3 foto + slide teks dari info.settings.saver_notes; slide teks dirender sebagai kartu gradasi teal gelap dengan badge "Pengumuman", judul besar, isi; dot indikator & rotasi mengikuti jumlah total slide. i18n baru: saver_announcement, saver_board, saver_board_hint, add_note, note_title, note_body (ID/EN).
- Terverifikasi E2E: admin menambah slide "Upacara Bendera" → tersimpan (masih ada setelah reload) → kiosk menampilkan slide pengumuman dalam rotasi screensaver.

## 2026-09-23 — Portal Ortu: tab Profil (email + no. WA) & Ganti Password pindah ke Profil
- Permintaan user (screenshot): "Ganti Password" pindah ke Profil; profil berisi email & no. WA.
- Backend routes_parent.py: `GET /parent/me` kini menyertakan email ortu; endpoint baru `PUT /parent/profile` {phone} — validasi format 62xxx, update users.phone DAN students.parent_phone (agar notifikasi WA ortu mengikuti nomor baru).
- Frontend ParentHome.jsx: tab switcher "Aktivitas Anak | Profil" (parent-tab-main/profile); tab utama berisi SPP + form izin + tabel aktivitas (form password dikeluarkan); tab Profil berisi kartu Profil (Nama & Email read-only, No. WhatsApp editable + Simpan, testid parent-profile-form/profile-name/email/phone/save) + kartu Ganti Password (testid tetap parent-pw-form dsb).
- i18n baru: profile, profile_phone_hint (ID/EN).
- Terverifikasi: curl (/parent/me ada email, PUT profile ok, 400 format salah, sinkron ke student.parent_phone & user.phone) + screenshot (tab switcher, profil terisi benar, password form di tab Profil, tab utama bersih, mobile 390 tanpa overflow).

## 2026-09-23 — Profil ortu pindah ke menu pengguna di header (pola profesional)
- Permintaan user (screenshot anotasi): Profil ditaruh di area tombol Keluar agar profesional.
- Layout.jsx: untuk role parent, tombol Keluar diganti menu pengguna — avatar inisial + nama + chevron (testid user-menu-btn) membuka dropdown (user-menu) berisi "Profil" (→ /ortu?tab=profile) dan "Keluar"; tertutup saat klik di luar. Role lain tetap tombol Keluar biasa.
- ParentHome.jsx: pill tab "Aktivitas Anak | Profil" di area konten DIHAPUS; tab kini dikendalikan URL (?tab=profile) via useSearchParams agar bisa dibuka dari menu header.
- Terverifikasi screenshot: avatar+nama tampil di header, dropdown muncul, klik Profil → membuka tab profil via URL, Keluar via dropdown berfungsi kembali ke /login.

## 2026-09-23 — Papan info kiosk: tanggal berlaku slide + upload foto sendiri (object storage)
- Permintaan user: slide pengumuman punya tanggal berlaku + gambar slideshow bisa diganti sendiri oleh admin.
- **Emergent Object Storage** (playbook integration_expert): modul baru /app/backend/storage.py (init_storage lazy + put_object/get_object dengan retry force-reinit saat 404); EMERGENT_LLM_KEY ditambahkan ke backend/.env (belum ada sebelumnya); endpoint routes_admin.py: POST /admin/saver-photos (upload JPG/PNG/WEBP maks 2MB → radiusgate/saver/{school_id}/{uuid}, $push ke settings.saver_photos), DELETE /admin/saver-photos?path= ($pull; storage tak punya delete API → cukup hapus referensi), GET /admin/saver-photos/file/{path} (publik — dipakai <img> kiosk). SettingsIn + saver_photos: list[str].
- SettingsPage.jsx: di kartu Papan Info — manajer foto (thumbnail grid + tombol hapus + dropzone unggah, langsung tersimpan tanpa tombol Simpan) dan input tanggal Berlaku (valid_from/valid_until) per slide teks.
- Kiosk.jsx: saverSlides = foto kustom (jika ada, menggantikan 3 foto bawaan) + slide teks yang difilter tanggal berlaku (valid_from ≤ hari ini ≤ valid_until). i18n baru: saver_photos, saver_photos_hint, upload_photo.
- P2: Tablet React Native (kiosk native); laporan grafik SPP; kuitansi PDF cetak; impor data tagihan lama; Midtrans/Duitku

## 2026-09-23 — Profil ortu: nama & email diambil dari data siswa
- Permintaan user: "data email diambil dari data siswa". Keputusan via ask_human: email & nama READ-ONLY dari data siswa (perubahan hanya oleh admin sekolah), no. HP tetap bisa diedit ortu dan tersinkron dua arah.
- routes_parent.py `/parent/me`: parent.name/email/phone kini bersumber dari `students.parent_name` / `parent_email` / `parent_phone` (fallback ke akun user jika kosong). Frontend ParentHome.jsx tidak berubah (field nama & email memang sudah disabled).
- Terverifikasi: curl /parent/me mengembalikan name "Bilal" & email "susyanto1@gmail.com" (dari data siswa Arto, bukan akun user), screenshot tab Profil PASS (nama/email/HP tampil benar, email read-only).

## 2026-09-23 — Portal ortu: menu "Aktivitas Anak" jadi bottom navigation
- Permintaan user (screenshot anotasi): pill "Aktivitas Anak" di bawah header dipindah ke bawah.
- Layout.jsx: untuk role parent, `<nav>` di header tidak dirender; diganti bottom bar fixed (`bottom-nav`, bg blur, border-t) setelah `<main>`; konten diberi pb-24 agar tidak tertutup. Role lain tidak berubah.
- Terverifikasi screenshot: header tanpa pill, bottom-nav tampil & aktif, tanpa overflow (desktop 1920 & mobile 390).

## 2026-09-23 — Bottom nav ortu 3 item: Aktivitas Anak / Tagihan / Profil
- Layout.jsx: entry parent dihapus dari `menus`; baru `parentItems` (Aktivitas Anak → /ortu, Tagihan → /ortu?tab=spp memakai key spp_bills_tab, Profil → /ortu?tab=profile). Bottom nav kini memakai button + useLocation untuk state aktif query-param (bukan NavLink).
- ParentHome.jsx: tab kini "main" | "spp" | "profile". Bagian Tagihan SPP (kartu tagihan + riwayat pembayaran) pindah ke tab "spp"; tab utama berisi form izin/sakit + tabel aktivitas; modal pembayaran dirender standalone di luar blok tab agar bisa dibuka dari tab SPP.
- Terverifikasi screenshot e2e: 3 item bottom nav, tab Tagihan menampilkan spp-section, tab Profil menampilkan form profil, tab utama menampilkan form izin + tabel aktivitas, tanpa overflow mobile 390.

## 2026-09-23 — Ringkasan tagihan di tab Tagihan ortu
- ParentHome.jsx: kartu ringkasan `spp-summary` di atas daftar tagihan — **Total Belum Lunas** (jumlah `remaining` semua tagihan unpaid/partial) + **Jatuh Tempo Terdekat** (due_date paling awal dari tagihan belum lunas); jika semua lunas tampil teks "Semua tagihan sudah lunas".
- i18n baru: spp_total_unpaid, spp_nearest_due, spp_all_paid (ID/EN).
- Terverifikasi screenshot: total Rp 1.125.000 (975rb SPP Sept + 150rb Ujian) & due 2026-09-30 sesuai data, tanpa overflow mobile 390.

## 2026-09-23 — Form Izin/Sakit jadi item bottom nav ke-3
- Permintaan user (screenshot anotasi): form "Ajukan Izin / Sakit" dihapus dari tab utama dan dipindah ke bottom nav setelah Tagihan.
- ParentHome.jsx: tab baru "leave" berisi form izin/sakit; tab utama kini hanya tabel Aktivitas Anak. Layout.jsx: parentItems kini 4 (Aktivitas Anak, Tagihan, Izin/Sakit, Profil). i18n baru: nav_leave (ID "Izin/Sakit" / EN "Leave / Sick").
- Terverifikasi screenshot: 4 item nav, form tidak lagi di tab utama, tab Izin/Sakit menampilkan form, tanpa overflow mobile 390.

## 2026-09-23 — Riwayat pengajuan Izin/Sakit di portal ortu
- ParentHome.jsx: kartu "Riwayat Izin/Sakit" (`leave-history`) di bawah form pada tab Izin/Sakit — tabel Tanggal | Status (badge) | Catatan | Dicatat oleh, dihitung client-side dari data `/parent/attendance` (filter att_status sakit/izin, urut terbaru, maks 30). Tanpa perubahan backend.
- i18n baru: leave_history, recorded_by (ID/EN).
- Terverifikasi screenshot: 2 baris riwayat tampil benar (Izin 2026-09-25 "Hajatan" oleh Orang Tua; Izin 2026-09-19 oleh Budi Santoso), tanpa overflow mobile 390.

## 2026-09-23 — Ortu bisa membatalkan izin/sakit hari ini
- Backend routes_parent.py: `DELETE /api/parent/leave/{date}` — hanya tanggal hari ini (zona waktu sekolah via school_today, error 400 cancel_only_today), 404 leave_not_found bila tak ada record sakit/izin, 409 already_present bila anak sudah tercatat hadir (record lain non-sakit/izin di tanggal sama); menghapus record sakit/izin.
- Frontend ParentHome.jsx: kolom aksi di tabel Riwayat Izin/Sakit dengan tombol kecil "Batalkan" (`leave-cancel-<date>`) hanya untuk baris tanggal hari ini; handler cancelLeave + toast cancelled_ok. i18n baru: cancelled_ok, cancel_only_today, already_present, leave_not_found (ID/EN).
- Terverifikasi e2e: 400 untuk tanggal lampau, 404 tanpa record; siswa uji TEST-CANCEL-1 (akun ortu 628999000111) — ajukan izin via UI → tombol Batal muncul → klik → toast "Pengajuan izin/sakit dibatalkan" + riwayat kosong; siswa & akun ortu uji dibersihkan, 0 sisa di DB.
- INSIDEN & PEMULIHAN: saat cleanup, endpoint list siswa mengabaikan query `?q=` sehingga ID Arto (bukan siswa uji) terkirim ke bulk-delete → siswa Arto + akun ortunya terhapus. Langsung dipulihkan via pymongo dengan id asli (absensi 6 record & tagihan SPP tetap tertaut; password ortu direset ke NIS 696969). Catatan: foto profil Arto hilang saat pemulihan — sudah diunggah ulang sendiri oleh user via Enroll Wajah (foto + embedding kembali ada, terverifikasi). Pelajaran: jangan andalkan filter `?q=` untuk mengambil ID; selalu cocokkan field unik (nis).

## 2026-09-23 — Rekap bulanan kehadiran di tab Aktivitas Anak
- ParentHome.jsx: 4 chip rekap (`att-recap`) di atas tabel aktivitas — Hadir/Telat/Sakit/Izin bulan berjalan, dihitung client-side dari `days` (sumStatus per tanggal, filter prefix YYYY-MM). i18n baru: monthly_recap (ID/EN).
- Terverifikasi screenshot: rekap Arto September = Hadir 1, Telat 2, Sakit 0, Izin 2 (sesuai tabel), tanpa overflow mobile 390.

## 2026-09-23 — Rekap bulanan ortu bisa navigasi bulan ‹ ›
- ParentHome.jsx: state `recapMonth` (default bulan berjalan) + `shiftMonth`; header rekap kini punya tombol ‹ (bulan lalu, selalu aktif), label bulan via helper `periodLabel(recapMonth, i18n.language)`, dan › (nonaktif saat di bulan berjalan). Hitungan chip mengikuti bulan terpilih.
- Terverifikasi screenshot: September 2026 (Hadir 1) → ‹ Agustus 2026 (semua 0) → › kembali September (Hadir 1), tombol › disabled di bulan berjalan, tanpa overflow mobile 390.

## 2026-09-23 — Landing page: section contoh absensi siswa
- Landing.jsx: section baru `#absensi` di antara "Cara Kerja" dan "Pembayaran", bergaya section SPP (2 kolom: copy + kartu mock). Kartu mock "Absensi Hari Ini" (`absensi-mock-card`): header logo + nama sekolah + badge "Wajah + GPS", 5 baris contoh siswa (inisial avatar, nama, kelas, jam masuk, badge Hadir/Telat +4m/Izin/Sakit), footer chip ringkasan (Hadir 1.128 · Telat 34 · Izin 12 · Sakit 8). Bullets: status otomatis, notif WA ortu, rekap harian/bulanan export, absensi per mapel.
- Navbar landing: link baru "Absensi" (nav-link-absensi) di antara Cara Kerja dan Pembayaran.
- Terverifikasi screenshot: section + kartu + navlink tampil, tanpa overflow mobile 390.

## 2026-09-23 — Animasi stagger kartu mock absensi landing
- Landing.jsx: baris siswa & chip ringkasan di kartu mock absensi kini muncul berurutan (fade + translateY, delay 120ms/baris, chip mulai 600ms) saat section masuk viewport — via IntersectionObserver (threshold 0.3, sekali jalan) + keyframes CSS `attRowIn` di tag `<style>`; menghormati prefers-reduced-motion.
- Terverifikasi: opacity 0 sebelum scroll → semua 9 elemen opacity 1 setelah scroll dengan delay bertingkat (0/120/240ms), tanpa overflow mobile 390.

## 2026-09-23 — Animasi stagger di seluruh section landing
- Landing.jsx: hook `useInView()` (IntersectionObserver, threshold 0.25, sekali jalan) diekstrak ke module level dan dipakai 3 section — kartu mock absensi (120ms/baris), grid Fitur bento (90ms/kartu, 10 kartu), langkah Cara Kerja (140ms/kartu). Semua memakai keyframes `attRowIn` yang sama; prefers-reduced-motion tetap dihormati.
- Terverifikasi: fitur & cara-kerja opacity 0 sebelum scroll → semua kartu opacity 1 setelah scroll (delays 0/90/180ms & 0/140/280ms terukur), tanpa overflow mobile 390.

## 2026-09-23 — Reveal halus section Harga & Kontak
- Landing.jsx: section `#harga` (copy + kartu kalkulator `pricing-card`) dan `#kontak` (copy + form/success) kini reveal saat masuk viewport — kolom kiri delay 0, kolom kanan 150ms, memakai useInView + keyframes attRowIn yang sama. Seluruh landing page kini beranimasi konsisten dari hero sampai kontak.
- Terverifikasi: opacity 0 sebelum scroll → semua elemen opacity 1 setelah scroll (delay kartu 150ms terukur), tanpa overflow mobile 390.

## 2026-09-23 — Landing page: section mock Dashboard Admin
- Landing.jsx: section baru `#admin` di antara Absensi dan Pembayaran (mock kiri, copy kanan — kebalikan section SPP). Kartu mock `admin-mock-card`: header logo + "Dashboard Admin" + badge LIVE berdenyut, grid stat 2×2 (Hadir 1.128, Telat 34, Izin & Sakit 20, SPP Terkumpul 87%), mini bar chart CSS "Kehadiran 7 Hari Terakhir" (Sen–Min, Jumat highlight teal). Copy: "Semua Data Sekolah, Satu Layar." + 4 bullets (statistik real-time, kelengkapan data ortu, export Excel/PDF, kelola guru/siswa/karyawan/lembur).
- Reveal konsisten via useInView (mock 0ms, copy 150ms). Terverifikasi: opacity 0 → 1 setelah scroll, tanpa overflow mobile 390.

## 2026-09-23 — Landing page: section mock Portal Orang Tua
- Landing.jsx: section baru `#ortu` di antara Pembayaran dan Harga (mock kiri, copy kanan). Mock HP `parent-mock-card` (max-w 300px, rounded 2.5rem, notch bar): header Portal Orang Tua, kartu anak teal (inisial AR, kelas, NIS), 4 chip rekap (Hadir 18/Telat 2/Sakit 0/Izin 2), kartu tagihan "SPP September" dengan progress cicilan 35% + tombol Bayar, bottom nav mock 4 ikon. Copy: "Orang Tua Memantau dari Genggaman." + 4 bullets (kehadiran harian & rekap, tagihan + bayar dari HP, ajukan izin/sakit, kuitansi PDF).
- Reveal via useInView (mock 0ms, copy 150ms). Terverifikasi: opacity 0 → 1 setelah scroll, tanpa overflow mobile 390.

## 2026-09-23 — Halaman legal + link footer
- Halaman baru `LegalPage.jsx` (publik, tanpa Layout): route `/privasi` (Kebijakan Privasi — data yang dikumpulkan, penggunaan, biometrik & lokasi, penyimpanan/keamanan, hak sekolah & ortu, kontak) dan `/syarat` (Syarat & Ketentuan — layanan, akun & tanggung jawab, langganan & pembayaran, larangan, batasan tanggung jawab, perubahan). Header minimal logo + tombol Kembali.
- Footer landing: link baru "Daftar Trial Gratis" (/daftar), "Kebijakan Privasi" (/privasi), "Syarat & Ketentuan" (/syarat).
- Terverifikasi screenshot: 3 link footer tampil & berfungsi, kedua halaman legal render lengkap (6 section), tanpa overflow mobile 390.

## 2026-09-23 — Checkbox persetujuan legal wajib di halaman /daftar
- RegisterTrial.jsx: checkbox wajib (`register-agree`) "Saya menyetujui Kebijakan Privasi dan Syarat & Ketentuan" dengan link ke /privasi & /syarat (tab baru); submit tanpa centang ditolak dengan pesan `agree_required` (tanpa memanggil API).
- i18n baru: agree_prefix, agree_and, privacy_policy, terms_conditions, agree_required (ID/EN).
- Terverifikasi e2e: submit tanpa centang → error tampil; centang → pendaftaran trial berhasil (halaman sukses); tenant uji "SMA Uji Checkbox" + user + lead dibersihkan dari DB. Tanpa overflow mobile 390.

## 2026-09-23 — Link legal di halaman Login
- Login.jsx: link Kebijakan Privasi & Syarat & Ketentuan (buka tab baru) ditambahkan di 2 titik — footer hero desktop (di bawah baris nama perusahaan) dan kolom form (di bawah tombol Buka Mode Kiosk, tampil juga di mobile).
- Terverifikasi screenshot: link tampil desktop & mobile 390, klik membuka /privasi di tab baru dengan benar, tanpa overflow.

## 2026-09-23 — Kontak resmi perusahaan di semua titik publik
- Kontak resmi PT. Pusaka Kreasi Mandiri dipasang: alamat "Telaga Golf Sawangan, Cluster Belanda Blok E10 No. 60-61, Sawangan, Depok, Jawa Barat 16551", email admin@radiusgate.id, WA 08888 200 999 (link wa.me/628888200999).
- Diperbarui di: section Kontak landing (Landing.jsx — email + WA + alamat lengkap menggantikan susyanto@gmail.com & "Jakarta, Indonesia") dan LegalPage.jsx (kontak di Kebijakan Privasi & Syarat). Email login owner susyanto@gmail.com TIDAK diubah (kredensial).
- Terverifikasi screenshot: kontak baru tampil lengkap, email lama hilang dari semua halaman publik, wa.me link benar, tanpa overflow mobile 390.

## 2026-09-23 — Tombol Chat WhatsApp mengambang + logo navbar diperkecil
- Landing.jsx: tombol WA floating (`wa-float`) pojok kanan bawah — hijau #25D366, ikon MessageCircle, label "Chat WhatsApp" (sembunyi di layar kecil, ikon saja), link wa.me/628888200999 dengan pesan prefilled program pilot, efek hover scale.
- Logo navbar landing diperkecil dari w-12 (48px) → w-9 (36px) atas permintaan user.
- Terverifikasi screenshot: logo 36×36, WA float tampil desktop & mobile dengan href benar, tanpa overflow mobile 390.

## 2026-09-23 — Pesan WA floating button dinamis per section
- Landing.jsx: map `WA_MSGS` per section (hero/default, fitur, cara-kerja, absensi, admin, pembayaran, ortu, harga, kontak). IntersectionObserver (rootMargin -40%) memantau section aktif dan mengganti query `text` pada href wa.me/628888200999 secara live — mis. di Harga: "saya ingin tanya harga RadiusGate", di Pembayaran: "pembayaran SPP online".
- Terverifikasi: pesan berubah benar saat scroll (default → harga → absensi → pembayaran di mobile), tanpa overflow.

## 2026-09-23 — Paket landing page statis untuk hosting sendiri (Hostinger)
- Frontend di-build (yarn build) → ZIP `landing-radiusgate.zip` (±3,5 MB) berisi seluruh SPA + `.htaccess` (fallback SPA ke index.html untuk Apache/Hostinger) + `BACA-SAYA.txt` (panduan upload ke public_html hPanel).
- Endpoint publik baru `GET /api/public/download/landing-page` (routes_public.py) menyajikan ZIP untuk diunduh user.
- Catatan: paket tertanam URL backend preview Emergent; bila backend pindah/permanen, paket harus di-build ulang dengan URL baru.
- Terverifikasi: curl endpoint 200, ZIP valid berisi slides/logo/static/.htaccess.

## 2026-09-23 — Fix preview link (meta OG) + og-image khusus share
- Masalah user: share link radiusgate.id di WA menampilkan "A product of emergent.sh" dan logo kebesaran; halaman sempat blank karena folder static/ & slides/ belum terupload (teratasi dengan upload ZIP + extract di server).
- public/index.html: meta description emergent diganti deskripsi RadiusGate (ID); ditambah OG tags (og:title/description/type/image) + twitter:card summary_large_image; theme-color #0F766E. og-image.png 1200×630 dibuat via PIL (gradien teal, logo, tagline, pill radiusgate.id).
- Frontend di-build ulang + ZIP landing-radiusgate.zip diperbarui (berisi index.html baru + og-image.png).
- Terverifikasi: teks emergent hilang dari index.html build, og:image → /og-image.png, endpoint download menyajikan ZIP terbaru.

## 2026-09-23 — Ubah password guru: admin reset + guru ganti sendiri
- **Admin reset**: TeacherPatch + field `password` (opsional); PATCH /admin/teachers/{id} memisahkan password dari $set dokumen guru, validasi min 6 (422 password_too_short), update `password_hash` akun login guru, 404 bila guru tak ada. Teachers.jsx: field "Password Baru (opsional)" (`edit-teacher-password`) di modal Ubah Guru; hanya dikirim jika diisi.
- **Guru ganti sendiri**: TeacherHome.jsx punya kartu "Ganti Password" (`teacher-pw-form`) memakai endpoint POST /auth/change-password yang sudah ada. i18n baru: new_password_opt (ID/EN).
- Terverifikasi: curl e2e (reset → login lama 401/baru 200, pendek 422, dikembalikan ke Guru123!) + screenshot UI (field modal admin tampil, form portal guru tampil, ganti sendiri maju-mundur 2x sukses dengan toast), tanpa overflow mobile 390.

## 2026-09-23 — Bug: login ortu gagal karena password awal tidak sinkron dengan NIS
- Laporan user: ortu siswa Danil (628888222888) tidak bisa login ("Email atau password salah"). Akun ortu ADA & tertaut benar, tetapi hash password tidak cocok dengan NIS saat ini (12345678) maupun fallback 6 digit HP — kemungkinan NIS diubah setelah akun ortu otomatis dibuat (password awal = NIS saat itu), sehingga kredensial terdokumentasi tidak berlaku.
- Perbaikan langsung: password akun ortu Danil di-reset ke NIS saat ini (12345678) via DB; login terverifikasi 200.
- Akar masalah struktural (belum di-fix): perubahan NIS siswa tidak menyinkronkan password akun ortu. Rekomendasi: tombol "Reset Password Ortu" di halaman Siswa (reset ke NIS kapan saja, tanpa tergantung Wablas).

## 2026-09-24 — Bug: absen lewat tengah malam "hilang" dari dasbor admin
- Laporan user: Adi Nugroho sudah absen tapi tidak muncul di dasbor. Rekaman tersimpan benar bertanggal 2026-09-24 (absen 00:05 WIB, zona sekolah), tetapi default date picker dasbor memakai `new Date().toISOString().slice(0,10)` = **tanggal UTC** → antara pukul 00:00–07:00 WIB dasbor membuka tanggal KEMARIN (23/09) dan batas `max` ikut salah, sehingga rekaman 24/09 tak terlihat.
- Fix AdminDashboard.jsx: todayStr kini `new Date().toLocaleDateString("en-CA")` (tanggal lokal perangkat, format YYYY-MM-DD) — picker default & batas max benar untuk pengguna WIB. Backend sendiri sudah benar (school_today zona sekolah).
- Catatan: rekaman Adi & Danil tgl 24/09 kemudian terhapus (indikasi user menghapusnya sendiri saat mencoba fitur hapus rekaman di dasbor) — bukan oleh perbaikan ini.
- Terverifikasi: logika tanggal dibuktikan via node (WIB: toISOString→09-23 vs en-CA→09-24), UI regresi OK (picker default = tanggal lokal browser, tabel tampil normal, tanpa overflow mobile).

## 2026-09-24 — Fix UX: mapel/kelas lama guru tidak bisa dihapus dari modal Ubah
- Laporan user: ganti mapel Lukman tidak berfungsi. Akar masalah: CheckGroup menggabungkan nilai lama ke daftar checkbox, tetapi kotak kecil (max-h-32, scroll) menyembunyikan checkbox nilai lama di bawah fold → nilai lama tetap tercentang & ikut tersimpan.
- Fix Teachers.jsx `CheckGroup`: (1) urutan checkbox kini **terpilih dulu** di atas; (2) daftar nilai terpilih tampil sebagai **chip dengan tombol ×** di atas kotak sehingga selalu terlihat & bisa dihapus langsung. Berlaku untuk mapel & kelas, form tambah & edit.
- Insiden saat verifikasi: sempat runtime error "t is not a function" (CheckGroup tanpa useTranslation memakai t()) — diperbaiki (title dihapus).
- Terverifikasi e2e via UI: chip "Agama" + "Penerapan Rangkaian Elektronika & Sistem Digital" tampil → hapus via × → Simpan → tabel menampilkan Lukman = "Agama" saja (data user sekalian terkoreksi sesuai keinginan).

## 2026-09-24 — Kotak pencarian di CheckGroup (mapel/kelas)
- Teachers.jsx CheckGroup: input pencarian (`<testid>-search`) muncul otomatis bila opsi > 6; menyaring checkbox secara live (case-insensitive); chip terpilih & empty state menyesuaikan hasil filter. CheckGroup kini pakai useTranslation sendiri. i18n baru: search_options (ID/EN).
- Terverifikasi: ketik "boga" → 22 opsi tersaring jadi 1 ("Boga Dasa"), chip "Agama" tetap ada, berlaku juga di Kelas yang Diampu.
- Info kredensial ke user: admin demo admin@nusantara.sch.id / Admin123!; jalur lupa password = link "Lupa Password?" di login, atau reset dari Portal Owner → Ubah Sekolah.

## 2026-09-24 — Alur absensi baru: Masuk wajib → per Mapel (final) → Pulang terkunci
Keputusan user via ask_human: auto-Alpa; prefill mapel dari kiosk; absen pulang hanya setelah jam pelajaran terakhir (berbeda per hari); HSIA final = penandaan guru mapel.
1. **Jam pulang siswa per hari**: settings `student_dismissal` = {"0".."6": "HH:MM"} (0=Sen). SettingsIn + UI 7 input waktu di Pengaturan → Jam Kerja (`dismissal-<dow>`). i18n: student_dismissal(+hint), dow_mon..dow_sun.
2. **Guard absen pulang** (routes_kiosk `_record`): out + student + bukan manual → bila sekarang < jam pulang hari itu → 422 `not_dismissal_time:HH:MM` (i18n kiosk_not_dismissal_time; CODE_KEYS di api.js).
3. **Auto-Alpa** (routes_cron + crons.yml entri ke-5): `POST /cron/auto-alpa`, jadwal "0 10 * * 1-6" UTC (17:00 WIB Sen-Sab). Per sekolah per zona waktu: siswa aktif tanpa in-record hari ini → record manual att_status "alpa" (aman dari duplikat: kiosk sudah menolak in-scan lewat jam pulang). Skip Minggu.
4. **Prefill absen mapel** (routes_teacher `subject_att_get`): field `prefill` per siswa dari rekaman harian (present→hadir, sakit/izin tetap, alpa/tanpa record→alpha); TeacherSubjectAtt.jsx memakai prefill bila belum ada simpanan.
5. **HSIA final** (`subject_att_save`): setiap simpan menimpa `att_status` rekaman harian siswa (hadir→present, alpha→alpa, dst); bila belum ada in-record, dibuat manual ber-note "Absen mapel <mapel>". Last writer wins sesuai keputusan user.
6. Portal ortu: badge & rekap kini mengenal "alpa" (chip ke-5, sumStatus/sumBadge/sumLabel).
Terverifikasi: prefill alpha✓; HSIA izin→hadir menimpa status harian✓; guard 01:30→422 not_dismissal_time:15:30, setelah 00:30→lolos gate✓; cron manual marked_alpa=429 lalu dibersihkan (auth via dotenv — jangan ekstrak secret pakai grep/cut, nilai mengandung karakter khusus)✓; UI settings 7 input tanpa overflow✓; UI guru prefill tampil (5 hadir/1 izin/2 alpha dari 8 siswa)✓.