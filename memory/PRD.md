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
