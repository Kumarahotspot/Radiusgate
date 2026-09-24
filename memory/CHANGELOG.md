# CHANGELOG — RadiusGate

## 2026-09-18 (iterasi 1–7) — Fondasi
- Fase 1–7: multi-tenant + auth 3 role, CRUD guru + enroll wajah (kamera), data siswa manual + impor CSV/XLS, kiosk web (pairing, liveness, geofence, offline-sync, TTS ID/EN), cuti/izin, laporan + export Excel/PDF, billing invoice bulanan + PDF + email Resend + Tripay mock + webhook HMAC, i18n penuh. 36/36 pytest.
- Fix: logika jam 24 jam untuk shift malam; timezone per sekolah (WIB/WITA/WIT); settings anti-clobber (PATCH parsial); aturan absen terlalu awal (`early_checkin_min`); dasbor kosong tengah malam (`school_today`).
- CRUD sekolah lengkap di portal Owner + `student_count_manual` + email admin + reset password admin + tombol salin link login.
- Modul notifikasi Owner: SMTP kustom + Wablas (`notif.py`); invoice otomatis WA bila Wablas aktif.

## 2026-09-19 (iterasi 12–40) — Siswa, wajah, kenaikan kelas
- v2 absensi siswa di kiosk (NIS + HSIA) → lalu kiosk terpadu wajah guru+siswa, NIS manual hanya Hadir; S/I siswa oleh wali kelas.
- CRUD siswa lengkap; search + pagination + page-size di Siswa/Guru/Dasbor; bulk delete; ekspor daftar siswa; template CSV impor.
- Absen pulang wajib ada absen masuk (toggle `require_checkin`); aturan final: lewat jam pulang → absen masuk ditolak (`past_work_end`), shift malam wrap-around.
- **Matcher wajah asli**: InsightFace buffalo_s (faceutil.py), anti-duplikat wajah lintas peran, error no_face/multiple_faces.
- Field siswa: nisn, gender; mengalir ke laporan/ekspor XLSX+PDF.
- Kenaikan kelas & kelulusan massal + wizard tahun ajaran baru (urutan atomic XII→X).
- Fix impor file asli SMK Perwira Bangsa (header longgar, leading zero NISN, baris kosong).
- Enroll wajah massal ZIP (mapping Excel opsional, laporan per file).
- Fix invoice duplikat (periode tes acak) + label periode "September 2026" + invoice bulanan cron + pengingat H+10 cron.
- Fix regresi tes: settings_guard (jam kerja tak lagi tertimpa suite tes); absen larut di shift siang = telat.

## 2026-09-20 — Voice, guru, data master
- Sapaan voice kiosk final + kustom per sekolah (`greeting_in/out`).
- Laporan kehadiran siswa untuk guru (kelas yang diampu, harian/rekap, export).
- Checkbox mapel/kelas guru (CheckGroup), dropdown kelas siswa, Data Master kelas/mapel/jurusan + tipe sekolah (SD-SMK) + template nasional, tipe & jurusan sejak pendaftaran trial / edit owner.
- Tabel Absensi Hari Ini digrup per orang dengan panel detail.

## 2026-09-21 — QR kiosk, karyawan, penggajian, ortu, SPP
- Poster QR kiosk auto-pairing (pdfgen + qrcode).
- Tipe Karyawan + sistem Lembur (tarif, persetujuan, laporan, upah) + Penggajian (gaji pokok + lembur, ekspor).
- Portal Orang Tua (login No. HP, password awal = NIS), auto-create akun ortu saat HP disimpan, notif WA absen, kirim info login via WA.
- Modul SPP & Tagihan (kategori, generate massal, cicilan, ekspor, notif kuitansi WA+email, pengingat H-3/H-1 cron). Pembayaran ortu MODE DEMO.
- Ringkasan mingguan ortu (cron Jumat); kelengkapan data ortu di dasbor; kartu statistik bisa diklik; date picker absensi.

## 2026-09-22 — Absensi per Mapel + laporan per orang
- Absensi per mata pelajaran (guru): sesi per guru+mapel+kelas+tanggal, admin bisa lihat.
- Laporan per Siswa/Guru/Karyawan digeneralisasi (`/admin/reports/people*`, rekap per tanggal unik); filter tipe orang di tab Harian.
- Form tambah siswa di balik tombol; CRUD Izin/Cuti admin + bersih-bersih 50 data uji.
- MonthYearPicker (bulan+tahun) menggantikan input type=month di SPP/Payroll/Invoice; kolom Tgl Bayar; tagihan SPP dikelompokkan per siswa (accordion).
- Dokumen PDF SPP: kuitansi, invoice, rekap per siswa (+ terbilang Rupiah, kop sekolah, kolom ttd); kuitansi di portal ortu.

## 2026-09-23 — Rebranding RadiusGate + landing page + penyempurnaan ortu
- EduGateID → **RadiusGate** global (18 file); logo resmi upload user + varian putih monokrom untuk background gelap.
- Landing page: konten pembayaran SPP multi gateway, section mock Absensi/Dashboard Admin/Portal Ortu, animasi stagger (useInView), halaman legal /privasi & /syarat + checkbox persetujuan di /daftar, kontak resmi PT. Pusaka Kreasi Mandiri, tombol WA floating dengan pesan dinamis per section, slideshow hero.
- Screensaver kiosk = papan info sekolah (slide teks admin + tanggal berlaku + upload foto via Emergent Object Storage).
- Portal ortu: bottom nav 4 item (Aktivitas/Tagihan/Izin-Sakit/Profil), ringkasan tagihan, riwayat + pembatalan izin hari ini, rekap bulanan dengan navigasi ‹ ›, profil nama/email read-only dari data siswa.
- Paket ZIP Hostinger (`landing-radiusgate.zip` + endpoint download) + fix meta OG/og-image untuk share link.
- Ubah password guru (admin reset + guru ganti sendiri). Fix login ortu Danil (reset ke NIS); rekomendasi tombol Reset Password Ortu (lihat ROADMAP).

## 2026-09-24 — Alur absensi final + auto-save
- Alur final: Masuk wajib → per Mapel (prefill kiosk, HSIA menimpa status harian) → Pulang terkunci sampai jam pulang per hari (`student_dismissal`); Auto-Alpa + auto-lock sesi (cron 19:00 WIB, digabung — batas 5 cron).
- Kunci lunak sesi mapel (guru kunci/buka + admin kunci/buka + auto-lock; tab "Sesi Mapel" di Laporan).
- Mode Panggil Cepat (roll call) di Absen Mapel.
- Pola kartu mobile di semua halaman guru; toolbar Absen Mapel dirapikan; tombol "Semua Hadir" dihapus.
- **Auto-save per siswa di Absen Mapel** (tombol Simpan dihapus; optimistic update + rollback).
- Fix: tanggal default UTC→lokal di Dasbor/Reports/Absen Mapel; CheckGroup guru (chip terpilih + pencarian).
- ZIP Hostinger di-build ulang 4× mengikuti perubahan.

## 2026-09-24 — Auto-save koreksi HSIA di Dasbor Admin (SELESAI)
- AdminDashboard.jsx: komponen `HsiaButtons` + `markStudent` — koreksi status siswa langsung tersimpan (tanpa tombol Simpan) dari panel expand baris "Absensi Hari Ini" (PATCH `/admin/attendance/{aid}/status`) dan dari kartu "Belum Absen Hari Ini" (GET `/admin/today/absent` + POST `/admin/attendance/mark`, create/update idempoten, record ber-note "Ditandai admin" + `corrected_by`).
- Backend: 3 endpoint di routes_admin.py (status inline, mark, daftar absent); validasi status 422, siswa 404, koreksi sakit/izin/alpa menolakkan telat/lembur.
- Password admin demo sempat berubah dari standar → direset ke Admin123! (sesuai test_credentials.md).
- Terverifikasi: curl e2e 9/9 PASS (create/update/patch/422/404/absent list/cleanup); testing agent iterasi 17 frontend 100% (inline HSIA + toast, kartu Belum Absen via tanggal lampau, regresi filter/search/pagination/date picker, mobile 390); residu uji lama (TEST_WINDOW) ikut dibersihkan.
- ZIP Hostinger di-build ulang berisi fitur ini; `.htaccess` + `BACA-SAYA.txt` yang hilang dari paket dipulihkan (kini disimpan di `frontend/public/` agar otomatis ikut setiap build).

## 2026-09-24 — Menu hamburger di mobile (portal non-ortu)
- Keluhan user (screenshot HP): nav pill atas portal guru terpotong ("Presensi Saya | Absen Mapel | Izin Siswa | L...") — terkesan tidak responsif. User memilih opsi hamburger (bukan bottom nav).
- Layout.jsx: nav atas kini `hidden md:flex` (hanya desktop); di mobile muncul tombol ☰/✕ (`nav-hamburger`) di kanan atas membuka dropdown vertikal (`mobile-nav`, item `mnav-<key>`) berisi semua menu role tsb; tertutup otomatis saat klik item / klik di luar (ref di header). Berlaku untuk role owner, school_admin, teacher, employee (parent tetap bottom nav). i18n baru: nav_menu (ID/EN).
- Terverifikasi screenshot: mobile 390 — hamburger tampil, nav desktop display:none, dropdown 4 item, klik Absen Mapel → navigasi + dropdown tertutup, scrollWidth 390 = clientWidth 390; desktop 1920 — hamburger tersembunyi, nav lengkap tampil.
- ZIP Hostinger di-build ulang berisi perubahan ini.
- Lanjutan (permintaan user, contoh RadiusLink): tombol ☰ dipindah ke **paling kiri sebelum logo** (bukan di kanan). Terverifikasi: posisi ham_x=8 < logo_x=52 di mobile 390, dropdown tetap berfungsi, desktop tanpa hamburger, ZIP di-build ulang.

## 2026-09-24 — Badge pengajuan izin pending di menu hamburger (admin)
- Persetujuan user atas saran: ikon ☰ di HP admin menampilkan badge merah berisi jumlah pengajuan izin/cuti yang menunggu persetujuan, agar admin tahu ada antrian tanpa membuka halaman Izin/Cuti.
- Layout.jsx: fetch `GET /admin/stats` sekali saat mount (hanya role school_admin); badge `nav-leaves-badge` (absolute, bg-red-500) di pojok ikon ☰ bila pending_leaves > 0; chip `mnav-leaves-badge` di kanan item "Izin / Cuti" pada dropdown mobile. Desktop tidak berubah (sudah ada kartu "Pengajuan Menunggu" di dasbor).
- Terverifikasi: leave uji dibuat via API guru (pending_leaves=1) → screenshot mobile 390: badge "1" tampil di ☰ (posisi kiri) & chip "1" di item Izin/Cuti, klik item → navigasi /admin/leaves + dropdown tertutup, tanpa overflow; desktop bersih. Leave uji dihapus (pending_leaves kembali 0).
- ZIP Hostinger di-build ulang berisi fitur ini.

## 2026-09-24 — Rapikan toolbar halaman Siswa di mobile
- Keluhan user (screenshot HP): 6 tombol aksi halaman Siswa (Tambah Siswa, Kenaikan Kelas, Ekspor XLS, Enroll Massal ZIP, Buat Akun Ortu, Impor CSV/XLS) tampil berantakan dengan lebar tidak seragam.
- Students.jsx: kontainer tombol kini `grid grid-cols-2` di mobile (kembali `sm:flex` di desktop); semua tombol `w-full justify-center sm:w-auto` sehingga lebar seragam 2 kolom; tombol Hapus Terpilih `col-span-2` (lebar penuh saat muncul). Mengikuti pola toolbar Absen Mapel yang sudah disetujui user.
- Terverifikasi screenshot: 6 tombol lebar identik 175px dalam 2 kolom (x=16/199), tanpa overflow (scrollWidth 390 = clientWidth), tautan "Unduh template CSV" tak lagi terpotong, desktop 1920 tetap sebaris.
- ZIP Hostinger di-build ulang berisi perbaikan ini.

## 2026-09-24 — Logo header portal diperkecil
- Permintaan user: "logo radiusgate kecilkan sedikit" → logo di header portal (Layout.jsx) dari w-11/h-11 (44px) menjadi w-9/h-9 (36px), menyamai ukuran logo navbar landing yang sebelumnya disetujui. Berlaku semua role, desktop & mobile.
- ZIP Hostinger di-build ulang berisi perubahan ini.

## 2026-09-24 — Pintasan Ganti Password di dropdown avatar
- Persetujuan user atas saran: dropdown avatar kini punya item "Ganti Password" (`user-menu-password`) untuk semua role non-ortu, membuka modal (`pw-modal`) berisi password saat ini + baru → POST /auth/change-password (endpoint sudah ada). Ortu tetap via tab Profil.
- Reuse key i18n yang ada: change_password, current_password, new_password, password_changed, wrong_current_password, cancel, save, loading.
- Terverifikasi e2e browser: password salah ditolak (toast), ganti Guru123!→Guru456! sukses + login ulang dengan password baru berhasil, dikembalikan ke Guru123! (kredensial demo stabil), modal tertutup, tanpa overflow mobile 390.
- ZIP Hostinger di-build ulang berisi fitur ini.
- Lanjutan (persetujuan user): kartu "Ganti Password" lama di halaman Presensi Saya (TeacherHome.jsx) **dihapus** — form, state `pw`/`busyPw`, handler `submitPw`, dan import KeyRound ikut dibersihkan. Guru kini ganti password hanya via menu avatar. Testid lama `teacher-pw-form` tidak lagi ada.
- Lanjutan 2 (permintaan user): **ortu juga memakai modal avatar** — item "Ganti Password" di dropdown kini tampil untuk SEMUA role (kondisi non-parent dihapus); form "Ganti Password" di tab Profil ortu (ParentHome.jsx) dihapus beserta state `pw` & handler `submitPw` (testid `parent-pw-form` hilang). Item "Profil" ortu tetap ada. Terverifikasi e2e: tab Profil bersih (form profil utuh), dropdown ortu punya Profil + Ganti Password, modal ganti 696969→Ortu123!→696969 sukses (kredensial demo stabil), tanpa overflow mobile 390. ZIP di-build ulang.

## 2026-09-24 — Voice nama siswa di mode Panggil Cepat (TTS)
- Permintaan user: saat guru mapel memanggil siswa satu per satu (mode Panggil), nama siswa diucapkan dengan suara agar seisi ruangan mendengar.
- TeacherSubjectAtt.jsx: helper `speak()` (SpeechSynthesis, lang id-ID, rate 0.95, cancel sebelum speak — pola sama dengan Kiosk); useEffect mengucapkan nama siswa setiap kartu panggil tampil (buka modal, lanjut, sebelumnya, lewati). Tombol mute/unmute (`sa-call-mute`, ikon Volume2/VolumeX) di header modal; preferensi tersimpan di localStorage `sa_voice_muted`. Menutup modal (X / siswa terakhir / lewati terakhir) membatalkan suara via `closeCall()`. Reuse key i18n kiosk_mute/kiosk_unmute.
- Terverifikasi e2e (spy speechSynthesis): nama ke-1 terucap saat modal dibuka, nama berikutnya terucap saat lanjut/lewati, mute menghentikan suara, unmute mengembalikan, modal tertutup normal, tanpa overflow mobile 390.
- ZIP Hostinger di-build ulang berisi fitur ini.

## 2026-09-24 — Voice pria/wanita otomatis sesuai jenis kelamin guru
- Permintaan user: voice pemanggil nama siswa dibedakan per gender guru; field jenis kelamin guru ditambahkan agar voice bisa otomatis.
- Backend: field `gender` (L/P, dinormalisasi `_norm_gender`) di TeacherIn/TeacherPatch (routes_admin.py) — tersimpan saat tambah & edit guru; `GET /teacher/subject-att/meta` kini menyertakan `gender` guru yang login.
- Frontend Teachers.jsx: dropdown Jenis Kelamin di form tambah (`teacher-gender`) & modal edit (`edit-teacher-gender`). TeacherSubjectAtt.jsx: `speak()` memilih voice id-ID sesuai gender — P: voice perempuan (hint female/wanita/damayanti/Google Bahasa Indonesia) + pitch 1.1; L: voice pria (hint male/ardi/bayu) + pitch 0.8 (fallback pitch rendah bila perangkat tak punya voice pria id-ID). Gender kosong → voice bawaan.
- Data demo: Budi/Kumara/Lukman = L, Siti Nuriyah = P.
- Terverifikasi: curl PATCH gender (normalisasi "perempuan"→P), meta mengembalikan gender, UI form tampil, spy TTS pitch sesuai gender. ZIP di-build ulang.
- CATATAN: mode offline Absen Mapel (disetujui user) masih antre dikerjakan.
- Penyesuaian (uji user): pitch suara pria dinaikkan 0.8 → 0.9 → 1.0 (natural seperti orang memanggil absen; semula terlalu berat); suara wanita tetap 1.1. ZIP di-build ulang.
- Masalah lanjutan (laporan user): di HP user hanya ada voice wanita bawaan sehingga pitch 1.0 terdengar wanita lagi → **solusi final: TTS cloud OpenAI** (playbook integration_expert).

## 2026-09-24 — Voice panggil via TTS cloud OpenAI (pria/wanita asli)
- Backend routes_teacher.py: `POST /teacher/tts` {text} (auth guru) — generate audio via OpenAITextToSpeech (model `tts-1` cepat, voice `onyx` pria / `nova` wanita sesuai gender guru), cache disk `/app/backend/assets/tts/<sha256(text|voice|...)>.mp3` (idempoten, request sama tidak generate ulang); `GET /teacher/tts-file/<hash>.mp3` publik (hash 64-hex, regex-validated, Cache-Control 1 tahun).
- Frontend TeacherSubjectAtt.jsx: `speak()` kini **cloud-first** saat guru bergender L/P & online — POST /teacher/tts → putar URL audio via `Audio` (cache URL per nama+gender di memori); fallback ke `deviceSpeak()` (speechSynthesis perangkat, pria pitch 0.9) bila offline/error/gagal play. `closeCall()` & mute ikut menghentikan audio cloud (audioRef).
- Terverifikasi: curl e2e (generate → file audio/mpeg tersaji → cache hit URL sama → bogus 404 → tanpa auth 401/403); UI spy: roll call guru pria memakai URL cloud tts-file (bukan device TTS), siswa berikutnya memanggil cloud lagi, modal tertutup bersih, tanpa overflow mobile 390. ZIP di-build ulang.
- Catatan: suara OpenAI dioptimalkan untuk bahasa Inggris — nama Indonesia terbaca jelas tapi bisa sedikit beraksen; jika user ingin aksen lokal penuh, upgrade ke ElevenLabs (perlu API key sendiri). Fallback perangkat tetap tersedia.

## 2026-09-24 — Mode Offline Absen Mapel (cache + antrean + auto-sync)
- Persetujuan user (opsi a): halaman Absen Mapel tetap berfungsi penuh saat internet guru mati.
- TeacherSubjectAtt.jsx (murni frontend, backend tidak berubah): cache localStorage per sesi (`sa_cache|tgl|mapel|kelas`: students+records+prefill+marks+flag dirty) dan cache meta (`sa_meta`) agar dropdown mapel/kelas tetap terisi offline. Gagal fetch → fallback cache + lencana "Mode Offline"; tanggal tanpa cache → pesan `sa_offline_no_cache`. autoSave offline/error jaringan (err tanpa response) → mark tersimpan lokal + dirty=true + lencana "belum tersinkron". Event `online` & reload sesi online → `syncSession` kirim bulk records ke POST /teacher/subject-att yang sudah ada → toast "tersinkron" + lencana hilang. Dirty cache di-merge saat load online agar edit offline tak hilang. Voice panggil otomatis fallback ke TTS perangkat saat offline (sudah ada di speak()).
- i18n baru: sa_offline, sa_pending, sa_synced, sa_offline_no_cache (ID/EN).
- Terverifikasi e2e (Playwright offline): cache tertulis saat online → offline: tanggal tanpa cache memunculkan pesan, tanggal tercache memuat siswa + lencana → tandai sakit offline → dirty=true + "belum tersinkron" → online kembali → auto-sync + toast + lencana hilang + dirty=false → status dikembalikan (Hadir 8) → tanpa overflow mobile 390.
- ZIP Hostinger di-build ulang berisi fitur ini.
- Revisi voice (keputusan user, opsi b): voice panggil **kembali ke suara perangkat sepenuhnya** — jalur cloud TTS di frontend dihapus (aksen Inggris OpenAI tidak disukai user). Suara perangkat id-ID: wanita pitch 1.1, pria pitch **0.8** (keputusan final user setelah mencoba 0.85/0.9/1.0). Endpoint backend `/teacher/tts` dibiarkan dormant (teruji, siap dipakai lagi bila nanti beralih ke ElevenLabs). Terverifikasi spy: speechSynthesis lang id-ID, nol panggilan cloud. ZIP di-build ulang.
- Diagnosa "suara masih wanita" (laporan user): akar masalah GANDA — (1) bundle radiusgate.id **kedaluwarsa** (main.8e7a1329.js = build ~08:14, belum memuat fitur gender+voice; dibuktikan grep bundle live: teacher-gender/pitch= = 0), (2) guru Muhamad Aziz (SMK Perwira Bangsa) belum punya gender → diset 'L' via DB. Solusi ke user: upload ZIP terbaru + hard-refresh HP.
- **Fix bug nyata (laporan user "di Emergent pun masih wanita")**: payload PATCH modal Ubah Guru di Teachers.jsx TIDAK menyertakan field `gender` — pilihan jenis kelamin di modal edit tidak pernah tersimpan ke server (form tambah sudah benar via `...form`). Ditambahkan `...(editFor.gender ? { gender: editFor.gender } : {})`. Inilah penyebab user memilih "pria" tapi voice tetap wanita.
- **Fix bug voice pertama wanita (laporan user)**: siswa PERTAMA diucapkan voice wanita, siswa berikutnya baru pria — akar masalah: `speechSynthesis.getVoices()` di browser (khususnya Android Chrome) mengembalikan array KOSONG pada panggilan pertama (voice dimuat asinkron via event `voiceschanged`), sehingga pemilihan voice pria gagal di utterance pertama. Fix: voices di-"warm up" saat halaman dimuat (listener `onvoiceschanged` mengisi `voicesRef`) dan `speak()` memakai cache ref tsb. Kini siswa pertama pun langsung voice pria.
- Password guru demo lukman@kh.net & siti@radiusgate.id direset ke Guru123! (tercatat di test_credentials.md).
- **Tabel Guru diperjelas (permintaan user)**: Kolom **L/P (Jenis Kelamin)** ditambahkan di tabel Guru halaman Admin agar status gender setiap guru terlihat jelas langsung (Laki-laki = badge biru, Perempuan = badge pink). Semua guru (Budi=L, Lukman=L, Kumara=L, Siti Nuriyah=P) sudah terdata dengan benar. ZIP di-build ulang.

## 2026-09-24 — Nama pengguna pindah ke menu avatar kanan atas (semua role)
- Permintaan user (contoh RadiusLink): "admin Nusantara dipindah spt contoh" — teks "Portal X · Nama" di bawah logo membungkus 3 baris di HP; nama dipindah ke kanan atas sebagai menu avatar.
- Layout.jsx: label kiri kini hanya nama portal (1 baris). Menu avatar (inisial + nama + chevron) kini berlaku untuk SEMUA role (sebelumnya hanya ortu); dropdown berisi identitas (nama + portal, `user-menu-name`), item Profil khusus ortu, dan Keluar. Tombol "Keluar" lama (`logout-btn`) dihapus — testid logout baru: `user-menu-logout`.
- Terverifikasi screenshot: mobile 390 — label kiri 1 baris, avatar tampil, dropdown menampilkan "Admin Nusantara / Portal Admin Sekolah" + Keluar (tanpa Profil utk admin), logout kembali ke /login; desktop 1920 — nama tampil di tombol avatar, nav utuh.
- ZIP Hostinger di-build ulang berisi perubahan ini.

## 2026-09-24 — Badge diperluas: lembur pending (admin) + siswa izin hari ini (guru)
- Persetujuan user atas saran lanjutan + permintaan tambahan: badge juga untuk lembur pending dan menu guru saat ada siswa izin/sakit.
- Layout.jsx: state `pendingOvertime` (dari GET /admin/stats yang sama) & `studentLeaveToday` (GET /teacher/student-status, difilter tanggal hari ini di sisi klien — endpoint sudah ada, backend tidak berubah). `pendingMap` per key menu: leaves / overtime / student_status_menu. Badge ☰ (`nav-pending-badge`, menggantikan nav-leaves-badge) menampilkan TOTAL per role: admin = izin pending + lembur pending; guru = siswa sakit/izin hari ini. Chip per item menu kini generik `mnav-<key>-badge` (Izin/Cuti, Lembur, Izin Siswa).
- Terverifikasi screenshot mobile 390: admin ☰=1 + chip Lembur=1 (chip Izin/Cuti tersembunyi saat 0) → navigasi /admin/overtime OK; guru ☰=2 + chip Izin Siswa=2 (data asli: Arto & SUSIYANTO sakit hari ini) → navigasi /guru/izin OK; tanpa overflow; desktop bersih. Data uji lembur dibersihkan dari DB.
- Catatan: akun karyawan demo `lembur@kh.net` direset passwordnya ke Lembur123! untuk pengujian (tercatat di test_credentials.md).
- ZIP Hostinger di-build ulang berisi fitur ini.
