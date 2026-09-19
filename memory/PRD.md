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
