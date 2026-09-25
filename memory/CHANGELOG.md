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
- Penyesuaian pitch pria (uji user di domain): 0.8 → 0.75 (diminta lebih berat sedikit). Wanita tetap 1.1. ZIP di-build ulang.

## 2026-09-24 — Verifikasi e2e ganti password guru via modal Ubah (admin)
- Pertanyaan user: "cek password apa kalau diganti sudah sesuai?" — diverifikasi penuh via UI: admin → Guru → Ubah Lukman → isi "Password Baru" → login lukman@kh.net dengan password baru BERHASIL → dikembalikan ke Guru123! → login lama berhasil lagi → password uji ditolak ("Email atau password salah"). Tidak ada perubahan kode; fitur bekerja sesuai harapan. Data demo stabil (lukman@kh.net / Guru123!).
- Password guru demo lukman@kh.net & siti@radiusgate.id direset ke Guru123! (tercatat di test_credentials.md).
- **Hardening mode Panggil (laporan user "klik tidak berpindah, selalu di Hadir")**: bug tidak tereproduksi di build terkini (repro persis di 3/8 Arto: maju normal, POST 200, tersimpan), NAMun ditemukan kelemahan nyata — bila autoSave gagal (error server), modal tetap maju dan status diam-diam rollback ke Hadir, sehingga terlihat "tidak berpindah & selalu Hadir". Fix: `autoSave` kini mengembalikan true/false; di mode Panggil, simpan GAGAL → modal TIDAK maju (tetap di siswa tsb) + toast error, guru bisa mengulangi. Gagal jaringan/offline tetap maju normal (masuk antrean offline). Terverifikasi e2e: jalur normal maju + POST 200; simulasi 500 → tetap di siswa + toast error + status rollback; restore data bersih.
- ZIP di-build ulang berisi fix ini.

## 2026-09-24 — Tombol show/hide kata sandi di halaman login
- Permintaan user: sering salah ketik sandi → tambahkan toggle mata (Eye/EyeOff) di kolom Kata Sandi halaman login (`login-toggle-pw`); tipe input berubah password↔text. i18n baru: show_password/hide_password (ID/EN).
- Terverifikasi e2e: toggle mengubah tipe input, nilai sandi terlihat saat show, login tetap sukses setelah toggle. ZIP di-build ulang.
- Lanjutan (persetujuan user): komponen reusable `components/PasswordInput.jsx` (input + toggle mata internal, testid `<id>` + `<id>-toggle`) dipasang di **modal Ganti Password** (Layout.jsx: pw-current, pw-new) dan **halaman Reset Password** (ResetPassword.jsx: reset-new-password, reset-confirm-password). Terverifikasi e2e: keempat toggle berfungsi (type↔text), modal batal normal. ZIP di-build ulang.

## 2026-09-24 — Voice panggil via ElevenLabs (suara pria/wanita asli, konsisten semua perangkat)
- Masalah user: suara pria di perangkat tanpa voice pria id-ID terdengar "setengah wanita setengah pria" (plafon trik pitch), dan berbeda-beda antar PC/HP/Samsung Tab. User memilih ElevenLabs dan memberi API key sendiri (Free plan, disimpan sebagai `ELEVENLABS_API_KEY` di backend/.env — JANGAN dihapus).
- Backend routes_teacher.py: endpoint dormant `/teacher/tts` diaktifkan ulang dengan ElevenLabs HTTP API (`POST /v1/text-to-speech/{voice_id}`, model `eleven_multilingual_v2`, stability 0.5, similarity_boost 0.75) via requests+asyncio.to_thread. Voice: pria = **Adam** (`pNInz6obpgDQGcFmaJgB`), wanita = **Sarah** (`EXAVITQu4vr4xnSDxMaL`) — divalidasi 200 via API langsung (Aria 402 tidak tersedia di Free). Cache key diubah (memuat `eleven_multilingual_v2|el`) agar tidak tabrakan dengan cache OpenAI lama. Serve endpoint `/teacher/tts-file/<hash>.mp3` tidak berubah.
- Frontend TeacherSubjectAtt.jsx: jalur **cloud-first dikembalikan** (speak → POST /teacher/tts → Audio), fallback `deviceSpeak()` (speechSynthesis, pria 0.75/wanita 1.1) saat offline/error. Kini suara IDENTIK di PC/HP/Tab dan beraksen Indonesia natural.
- Terverifikasi: curl e2e (generate mp3 valid → serve audio/mpeg → cache hit URL sama → voice pria≠wanita); UI spy: roll call memakai URL cloud tts-file, nol pemanggilan device TTS. ZIP di-build ulang.
- Catatan biaya: free tier ±10rb kredit/bln; audio di-cache per nama+gender sehingga panggilan berulang gratis.
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

## 2026-09-24 — Mode Kios full page + tombol fullscreen
- Permintaan user: tampilan Mode Kios dibuat full page. Kiosk.jsx: kamera, tombol absen, dan panel NIS melebar responsif (`max-w-md` → `md:max-w-xl lg:max-w-2xl`), teks fase & tombol membesar di layar md+; tombol **fullscreen** baru di header (`kiosk-fullscreen-btn`, Maximize2/Minimize2) memakai Fullscreen API agar UI browser tersembunyi saat kiosk dipajang di tablet. i18n baru: kiosk_fullscreen / kiosk_exit_fullscreen (ID/EN).
- Terverifikasi screenshot: desktop 1920 — kamera & tombol melebar (672px), tombol fullscreen tampil & klik tanpa error; mobile 390 — layout tetap pas, tanpa overflow. ZIP di-build ulang.

## 2026-09-24 — Kiosk auto-fullscreen saat dibuka
- Persetujuan user atas saran: halaman /kiosk (setelah pairing) otomatis masuk mode layar penuh pada interaksi pertama (pointerdown listener; browser mewajibkan gestur user). Retry setiap tap sampai berhasil; berhenti setelah fullscreen aktif. Tombol ⛶ manual tetap ada.

## 2026-09-24 — Kartu konfirmasi absen layar penuh (foto + nama besar)
- Persetujuan user atas saran: saat absen berhasil, kiosk menampilkan kartu konfirmasi layar penuh selama ±3 detik — hijau sukses dengan FOTO frame wajah yang baru ditangkap (bulat besar, tanpa perubahan backend karena frame sudah ada di frontend) + nama besar 4xl/6xl + pesan. Gagal → kartu merah. Absen NIS manual (tanpa foto) menampilkan avatar inisial. Jalur offline juga membawa foto.
- Terverifikasi e2e: kartu sukses hijau (jalur offline, avatar inisial + nama + pesan) & kartu gagal merah (NIS tidak dikenal) tampil fullscreen lalu hilang otomatis; antrean offline palsu dibersihkan; mobile 390 tanpa overflow. ZIP di-build ulang.

## 2026-09-24 — Bunyi "ding" merdu sebelum suara nama di kiosk
- Persetujuan user atas saran: kartu sukses kini diawali chime Web Audio (2 nada sine E5→A5 untuk absen MASUK, turun A5→E5 untuk PULANG), diputar sebelum TTS nama; di semua jalur sukses (wajah, NIS manual, antrean offline). Hormati tombol mute; tanpa file audio eksternal (AudioContext oscillator, audioCtxRef di-reuse).
- Terverifikasi e2e (spy AudioContext): ≥2 oscillator tercipta saat kartu sukses muncul. ZIP di-build ulang.

## 2026-09-24 — Header kiosk: nama sekolah + tanggal/jam di tengah atas kamera
- Permintaan user: nama sekolah dan date-time dipindah ke tengah. Header kiosk kini `relative`: blok nama+tanggal+jam terpusat (`text-center`, padding aman dari tombol kanan), tombol-tombol (bahasa/fullscreen/mute/unpair + badge offline/antrean) absolute di kanan. Jam kini LIVE berdetak tiap detik (state `now` + interval 1s, format id-ID/en-US). Testid baru: kiosk-clock.
- Terverifikasi screenshot: desktop 1920 — nama terpusat (selisih <30px dari tengah), jam berdetak (nilai berubah per detik); mobile 390 — terpusat & tanpa overflow. ZIP di-build ulang.
- Fix mobile: teks tanggal/jam bertabrakan dengan tombol kanan di 390px → header kini flex-col di mobile (nama+jam terpusat penuh di baris 1, tombol di baris 2), layout absolute-kanan hanya untuk sm ke atas.

## 2026-09-24 — Nama sekolah persis di atas kamera + tombol jadi overlay kamera
- Permintaan user: nama sekolah ditaruh "atas persis camera". Header kiosk kini hanya berisi nama sekolah + tanggal/jam live yang terpusat dan rapat tepat di atas kotak kamera. Tombol bahasa/fullscreen/mute/unpair dipindah menjadi **overlay melayang di pojok kanan-atas kamera** (bg-black/40 backdrop-blur), badge offline/antrean di pojok kiri-atas kamera. Lebih hemat ruang vertikal dan rapi saat fullscreen.
- Terverifikasi screenshot: mobile 390 & desktop 1920 — jarak jam→kamera rapat, tombol berada di dalam area kamera, nama terpusat, tanpa overflow. ZIP di-build ulang.

## 2026-09-24 — Tombol overlay kiosk auto-hilang saat idle
- Persetujuan user atas saran: tombol overlay kamera (bahasa/fullscreen/mute/unpair) otomatis memudar setelah 5 detik tanpa sentuhan (state `uiHidden`, interval 1s memakai `lastActRef` milik screensaver; `bump()` menampilkan lagi + reset). Badge offline/antrean (kiri) TIDAK ikut hilang agar status selalu terlihat. Transisi opacity 500ms + pointer-events-none saat tersembunyi.

## 2026-09-24 — Fix: input absen manual NIS tertutup keyboard HP
- Laporan user: di Mode Kios (HP), saat mengetik NIS manual, keyboard virtual menutupi kolom input sehingga angka tidak terlihat.
- Solusi di `Kiosk.jsx`: state `nisFocused` — saat input NIS fokus, kamera, toggle Masuk/Pulang, tombol absen utama, dan info geofence disembunyikan (class `hidden`, TANPA unmount agar fokus tidak hilang/looping), panel manual naik ke bagian atas layar; font input diperbesar (text-2xl). Saat blur, tampilan kamera kembali normal.
- Terverifikasi screenshot (mobile 390): kamera tersembunyi saat fokus, input berada di top 145px (di atas keyboard), nilai ketikan terlihat, kamera pulih setelah blur. ZIP di-build ulang.

## 2026-09-24 — Fix: tombol "Absen Manual" tidak merespons klik (layout shift saat blur)
- Laporan user: "abses gagal coba cek tombol absennya apakah sudah benar".
- Akar masalah (direproduksi): mengetuk tombol "Absen Manual" memicu `onBlur` input NIS → layout kiosk kembali normal → tombol melompat dari top 223px ke 922px → klik tidak pernah mendarat di tombol. Fix: `onPointerDown={e => e.preventDefault()}` pada tombol submit agar input tetap fokus dan layout tidak bergeser saat tap.
- Perbaikan tambahan: pesan error backend `too_early` dan `past_work_end` kini dipetakan ke pesan jelas ("Belum waktunya absen (mulai HH:MM)" / "Sudah lewat jam pulang (HH:MM)") di i18n ID+EN, menggantikan "Absen gagal" generik.
- Terverifikasi e2e (mobile 390): tombol tidak lagi berpindah saat tap, request sampai ke backend, kartu hasil tampil benar (NIS tidak ditemukan / luar geofence / belum waktunya absen). ZIP di-build ulang.

## 2026-09-24 — Keypad angka kustom di layar untuk absen manual NIS
- Persetujuan user atas saran: input NIS kini readOnly (keyboard HP tidak pernah muncul); mengetuk kolom NIS masuk "mode manual" — kamera tersembunyi, keypad angka besar (1-9, 0, C=clear, ⌫=backspace, maks 12 digit) muncul di atas layar. Tombol "Absen Manual" jadi teal solid; tombol "Batal" menutup mode manual dan mengembalikan kamera. Mode manual tetap terbuka setelah sukses untuk absen beruntun yang cepat.
- Testid baru: kiosk-keypad-0..9, kiosk-keypad-clear, kiosk-keypad-back, kiosk-manual-close.
- Terverifikasi e2e (mobile 390): keypad muncul, ketik 10006, backspace berfungsi, submit → kartu sukses "Presensi berhasil Galang Remaja", tutup mode → kamera kembali. Data uji dibersihkan dari DB. ZIP di-build ulang.

## 2026-09-24 — Absen manual sukses otomatis kembali ke layar utama kiosk
- Permintaan user: setelah absen manual berhasil, kiosk otomatis keluar dari mode manual dan kembali ke tampilan kamera utama (setelah kartu sukses hilang, ±3 dtk). Jika GAGAL (NIS salah/dll), mode manual tetap terbuka agar bisa langsung coba lagi. Berlaku untuk jalur online maupun antrean offline (flag `manualOk`).
- Terverifikasi e2e (mobile 390, API di-mock sukses): kartu sukses tampil, lalu otomatis kembali — kamera terlihat, keypad tertutup. ZIP di-build ulang.

## 2026-09-24 — Mode Antrean Otomatis (auto queue) di Kiosk
- Persetujuan user atas saran: kiosk kini siap untuk orang berikutnya TANPA sentuhan. Saat mode Auto aktif (default ON, toggle ikon Users di overlay kamera, persist di localStorage "kiosk_autoq"), watcher tiap 1.8 dtk membandingkan 2 frame kamera (motionCheck thr 0.04); ada gerakan → otomatis menjalankan absen wajah (liveness→GPS→kirim). Cooldown 2.5 dtk setelah kartu hasil tertutup agar orang bisa minggir. Watcher berhenti saat: screensaver, mode manual NIS, picker offline, atau fase sibuk.
- Anti-spam: ruangan kosong = tidak ada gerakan = tidak ada request ke backend. Error "already_recorded" untuk nama yang SAMA berturut-turut tidak diucapkan lagi (silent) agar tidak bising saat orang berlama-lama di depan kamera. Badge "Auto" selalu terlihat di pojok kiri-atas kamera.
- Testid baru: kiosk-autoq-btn, kiosk-autoq-badge.
- Terverifikasi e2e (mobile 390, stream noise rAF sebagai gerakan, API di-mock): trigger otomatis tanpa sentuhan → kartu sukses → loop trigger ke-2 otomatis (antrean berjalan) → toggle OFF menghentikan watcher (badge hilang, localStorage "0", tidak ada trigger lagi). ZIP di-build ulang.

## 2026-09-24 — Kartu sukses lebih singkat (2 dtk) saat mode Auto antrean aktif
- Persetujuan user atas saran: saat mode Auto ON, kartu SUKSES (absen wajah, absen NIS manual online/offline, antrean offline guru) tampil 2000ms (dari 3000–3500ms) untuk throughput antrean lebih tinggi. Kartu GAGAL tetap durasi penuh agar sempat dibaca. Mode Auto OFF → durasi normal.
- Terverifikasi e2e (mobile 390, noise stream, API mock): durasi kartu sukses terukur 1.8 dtk saat Auto ON dan 3.4 dtk saat OFF. ZIP di-build ulang.

## 2026-09-25 — Fix: absen PULANG via NIS manual selalu gagal (already_recorded)
- Laporan user: "abses pulang selalu gagal susiyanto 2609001". Akar masalah: panel NIS manual tidak mengirim tipe absen — frontend tidak menyertakan `type` dan backend `attend-student` + sync siswa hardcode `"in"`. Akibatnya pilih "Absen Pulang" pun tetap mencatat "masuk" → duplikat → 409 already_recorded ("Sudah absen").
- Fix: frontend mengirim `type: attType` di payload manual; backend `AttendStudentIn.type` (in|out, default in) dipakai di cabang siswa & karyawan, serta sync offline siswa menghormati `type`. Pesan error manual kini juga memetakan `no_checkin` dan `not_dismissal_time` (i18n sudah ada).
- Terverifikasi: curl type=out untuk SUSIYANTO 2609001 → sukses (record uji dibersihkan); e2e mobile 390 — toggle Pulang + keypad NIS → kartu hasil benar (bukan "Sudah absen"). ZIP di-build ulang.

## 2026-09-25 — Mode Auto antrean dimatikan secara default
- Permintaan user: "auto absesnnya di matikan saja, karena apapun yg tertangkap kamera di record". Default `kiosk_autoq` kini OFF (hanya aktif jika toggle ditekan, persist localStorage "1"). Kiosk kembali absen hanya saat tombol ditekan; toggle Auto tetap tersedia opsional.
- Terverifikasi e2e: default OFF → badge hilang & gerakan kamera tidak memicu absen; toggle ON → badge muncul & auto trigger berfungsi lagi. ZIP di-build ulang.

## 2026-09-25 — Full page otomatis tanpa sentuhan via PWA (Add to Home Screen)
- Laporan user: "auto full page kok tidak jalan, layar disentuh baru jalan". Penjelasan: requestFullscreen() diblokir semua browser tanpa gesture pengguna — tidak bisa diakali dari JS biasa. Solusi: halaman /kiosk kini PWA-ready (manifest-kiosk.json display=fullscreen start_url=/kiosk + sw-kiosk.js + ikon 192/512 + meta apple-mobile-web-app-capable, disuntik otomatis saat halaman kiosk dibuka). Sentuhan-pertama fallback tetap ada untuk pemakaian via browser biasa.
- Cara pakai (juga ditambahkan ke BACA-SAYA.txt di ZIP): buka /kiosk di Chrome HP kiosk → menu ⋮ → "Add to Home screen" → buka dari ikon → langsung full page otomatis.
- Terverifikasi: manifest terpasang, SW terdaftar, ikon 192/512 & sw-kiosk.js termuat dalam ZIP build. ZIP di-build ulang.

## 2026-09-25 — Fix: absen manual dengan NIP guru selalu gagal
- Laporan user: "utk guru absen manual gagal dengan memasukan NIP". Akar masalah: endpoint `attend-student` hanya mencari di koleksi `students` (NIS) lalu `employees` (NIP) — koleksi `teachers` tidak pernah dicari, jadi NIP guru selalu "NIS tidak ditemukan".
- Fix: `attend-student` kini mencari siswa → karyawan → **guru** (nip, active) dan mencatat dengan person_type teacher (dedup konsisten dengan absen wajah). Sync offline cabang siswa juga ditambah pencarian guru + karyawan kini menghormati `type` (in/out). Pesan error diperjelas: "NIS/NIP tidak ditemukan" (ID/EN).
- Terverifikasi: NIP guru 223344 (Lukman) → absen sukses (record uji dibersihkan); NIP ngawur tetap ditolak student_not_found. ZIP di-build ulang.

## 2026-09-25 — Foto profil di kartu hasil absen manual
- Persetujuan user atas saran: endpoint `attend-student` kini mengembalikan `photo` (base64 yang sudah tersimpan) untuk siswa, guru, dan karyawan; frontend menampilkannya sebagai foto bulat besar di kartu sukses absen manual (fallback avatar inisial jika tidak ada foto).
- Terverifikasi e2e (mobile 390): absen manual NIS 10006 → kartu sukses menampilkan foto profil siswa. Record uji dibersihkan. ZIP di-build ulang.

## 2026-09-25 — Bunyi klik + efek menyala pada keypad manual kiosk
- Permintaan user: "tambahkan suara klik2 sewaktu input manual di keyboard atau touchnya menyala". Setiap tekan tombol keypad kini memainkan bunyi klik singkat (Web Audio triangle 1400Hz, 70ms, reuse audioCtxRef, hormati tombol mute) DAN tombol menyala saat disentuh (active:bg teal untuk angka, amber untuk C, red untuk ⌫; active:scale tetap).
- Terverifikasi e2e (spy AudioContext): 4 tekan tombol → 4 oscillator tercipta; class glow terpasang. ZIP di-build ulang.

## 2026-09-25 — Bunyi klik juga di tombol utama kiosk
- Persetujuan user atas saran: bunyi klik (clickSound) kini juga berbunyi saat menekan tombol utama "Absen Masuk/Pulang" dan tombol "Absen Manual" (submit NIS). Semua interaksi kiosk kini bersuara konsisten.
- Terverifikasi e2e (spy AudioContext): klik tombol utama → oscillator tercipta; klik submit manual → oscillator tercipta. ZIP di-build ulang.

## 2026-09-25 — Absen manual GAGAL juga kembali ke layar utama
- Permintaan user: "utk absen manual yg gagal harus kembali ke menu awal". Sebelumnya hanya sukses yang keluar dari mode manual (gagal tetap terbuka untuk coba lagi). Kini sukses maupun gagal sama-sama menutup mode manual dan kembali ke tampilan kamera setelah kartu hasil hilang.
- Terverifikasi e2e (mobile 390, NIS ngawur): kartu gagal tampil → otomatis kembali ke kamera, keypad tertutup. ZIP di-build ulang.

## 2026-09-25 — Kolom NIS/NIP dikosongkan setelah absen manual gagal
- Laporan user: setelah gagal dan kembali ke menu awal, kolom masih terisi NIS/NIP lama. Kini kolom selalu dikosongkan saat kartu hasil tertutup — di semua jalur: sukses, gagal server, dan gagal GPS. Mode manual juga tertutup di jalur gagal GPS.
- Terverifikasi e2e (mobile 390, NIS ngawur): kartu gagal → kembali ke kamera, kolom NIS kosong. ZIP di-build ulang.

## 2026-09-25 — Absen via QR Code (auto-generate)
- Permintaan user: "siapkan juga utk bisa absen via QR code, QR code auto generate".
- Backend: `GET /api/admin/qrcodes/{ptype}/{pid}` (admin) — auto-generate `qr_token` unik per siswa/guru/karyawan (persist di DB, sekali saja). QR berisi `RG1.<ptype>.<id>.<token>` (aman: tidak bisa dipalsukan hanya dengan NIS/NIP). Endpoint kiosk baru `POST /api/kiosk/attend-qr` — validasi token+sekolah, catat absen (in/out), kembalikan nama+foto, notifikasi ortu untuk siswa.
- Frontend: tombol QR per baris di halaman Siswa & Guru → modal `QrModal.jsx` (render QR via lib qrcode, nama+NIS/NIP, tombol Unduh PNG). Kiosk: tombol "Scan QR" di grup Masuk/Pulang — saat aktif, loop jsQR memindai kamera tiap 350ms; QR terdeteksi → bunyi klik → absen otomatis → kartu hasil dengan foto profil. Border kamera jadi hijau berdenyut + hint "Arahkan kode QR ke kamera". i18n ID/EN. Lib baru: jsqr, qrcode.
- Terverifikasi e2e: backend (token persist, foto ikut); modal admin (QR ter-render + tombol unduh); scan kiosk dengan QR sungguhan di stream kamera → "Presensi berhasil Galang Remaja" + foto profil tampil. Record uji dibersihkan. ZIP di-build ulang.

## 2026-09-25 — QR auto-deteksi selalu aktif (tombol Scan QR dihapus)
- Permintaan user: "absensi auto autodetek qrcode dan wajah, biar tidak ada banyak tombol". Pemindai QR kini berjalan otomatis di latar belakang setiap fase idle — tanpa tombol mode. Aman dari salah rekam (beda dengan deteksi gerakan): absen hanya tercatat jika QR valid (token RG1 terverifikasi server). Tombol "Scan QR" dihapus; hint kecil "Arahkan kode QR ke kamera" selalu tampil di bawah kamera. Absen wajah tetap via tombol utama.
- Terverifikasi e2e (mobile 390): tombol toggle hilang, hint tampil, QR di depan kamera → otomatis "Presensi berhasil Galang Remaja" tanpa sentuhan apa pun. ZIP di-build ulang.

## 2026-09-25 — Dedup QR: kartu yang sama di depan kamera tidak berulang
- Polish: QR yang sama yang terus diarahkan ke kamera diabaikan selama 15 detik (lastQrRef) — mencegah kartu "Sudah absen" berulang setiap ~5 dtk saat kartu dipegang terlalu lama.
- Terverifikasi e2e: QR ditahan 20 dtk di depan kamera → hanya 1 kartu hasil muncul. ZIP di-build ulang.

## 2026-09-25 — Absen via kartu RFID (reader USB/OTG terpisah)
- Permintaan user: "kl sy tambahkan RFID gimana" → pilihan: hardware terpisah (reader USB/OTG keyboard emulation).
- Backend: field `card_uid` di students/teachers/employees (create + patch). Endpoint baru `POST /api/kiosk/attend-card` — cari UID di ketiga koleksi, catat absen (in/out), kembalikan nama+foto, notif ortu untuk siswa. Error `card_unknown` untuk kartu tak terdaftar.
- Frontend kiosk: listener keyboard global — reader RFID mengetik UID cepat (<200ms antar tombol) lalu Enter → auto absen tanpa menyentuh layar (bunyi klik → kartu hasil + foto). Aman dari konflik: diabaikan saat mengetik di input biasa (pairing), tetap jalan saat panel NIS manual (readOnly) terbuka.
- Admin: kolom "Kartu RFID (UID)" ditambahkan di form tambah/edit Siswa, Guru, dan Karyawan (daftarkan UID dengan tap kartu saat kolom fokus, atau ketik manual).
- Catatan: mode offline belum mengantrekan absen kartu (butuh koneksi) — TODO bila diminta.
- Terverifikasi backend: PATCH card_uid OK, attend-card UID terdaftar → sukses (foto ikut), UID ngawur → card_unknown. E2E kiosk menyusul. ZIP di-build ulang.

## 2026-09-25 — RFID: verifikasi e2e selesai
- Tes e2e kiosk (mobile 390): simulasi tap kartu (keyboard.type UID cepat + Enter) pada mode Pulang → kartu hijau "Presensi berhasil · Galang Remaja" + foto profil tampil, tanpa menyentuh layar. Data uji (record absen + card_uid) dibersihkan.
- STATUS RFID: SELESAI & TERUJI (backend + admin form siswa/guru/karyawan + listener kiosk). Belum: antrean offline untuk kartu (butuh koneksi saat tap).

## 2026-09-25 — Verifikasi kolom Kartu RFID di admin
- User: "di admin blom ada kolom baru". Verifikasi screenshot preview: kolom "Kartu RFID (UID)" TERBUKTI ada di form Tambah Siswa, Tambah Guru, dan Tambah Karyawan (bukan kolom tabel — ada di dalam form/modal tambah & edit). Kemungkinan user melihat domain Hostinger yang masih build lama → wajib upload ulang ZIP terbaru.

## 2026-09-25 — Indikator ikon kartu RFID di kolom aksi tabel admin
- Persetujuan user atas saran: ikon Nfc di kolom aksi tabel Siswa, Guru, dan Karyawan — menyala teal jika kartu terdaftar (tooltip menampilkan UID), abu-abu jika belum. Testid: card-student-*, card-teacher-*, card-employee-*. i18n: card_registered / card_not_registered (ID+EN).
- Terverifikasi e2e: ikon tampil di ketiga tabel admin. ZIP di-build ulang.

## 2026-09-25 — Tombol QR juga di tabel Karyawan
- Laporan user: "di karyawan di tabel blom ada QR nya". Ditambahkan tombol QR per baris karyawan (modal QrModal, ptype "employee") — backend qrcodes endpoint memang sudah mendukung employees. Ikon indikator kartu NFC juga sudah ada sebelumnya.
- Terverifikasi e2e: tombol QR tampil di tabel Karyawan, modal terbuka dengan QR ter-render + nama. ZIP di-build ulang.

## 2026-09-25 — Mode "Registrasi Kartu" di kiosk
- Permintaan user: mode registrasi kartu massal di kiosk. Implementasi: tombol ikon NFC di overlay kamera → modal login admin sekolah (email+password, diverifikasi via /auth/me role school_admin) → layar registrasi: cari nama (siswa+guru+karyawan gabungan), pilih nama → panel "Tempelkan kartu untuk: <nama>" → tap kartu RFID → UID tersimpan via PATCH admin (banner hijau "Kartu tersimpan: Nama · UID") → otomatis kembali ke daftar untuk nama berikutnya. Baris yang sudah punya kartu menampilkan ikon NFC teal; jika dipilih lagi ada peringatan ganti kartu. Tombol "Selesai" keluar & membersihkan sesi admin (token hanya di memori). Listener RFID diarahkan ke regSave saat mode aktif (bukan absen).
- Testid: kiosk-reg-btn, reg-login-modal, reg-email, reg-password, reg-login-submit, reg-screen, reg-search, reg-pick-*, reg-tap-panel, reg-msg, reg-done. i18n ID/EN: reg_* + login_failed + student/teacher/employee.
- Terverifikasi e2e (mobile 390): login admin → cari "Galang" → pilih → tap kartu 7778889990 → tersimpan → kembali ke daftar → keluar OK. Data uji dibersihkan. ZIP di-build ulang.

## 2026-09-25 — Cetak kartu QR massal dalam 1 PDF
- Persetujuan user atas saran: endpoint baru `GET /api/admin/qrcodes-pdf?class_name=` (admin) — menghasilkan PDF A4 berisi 6 kartu QR per halaman (2x3, QR 62mm agar mudah discan), tiap kartu: nama sekolah, QR (auto-generate qr_token bila belum ada), nama siswa, NIS + kelas. Urut per kelas lalu nama. Tanpa param = semua siswa aktif.
- Frontend: tombol "Kartu QR (PDF)" (testid qr-pdf-btn) di toolbar halaman Siswa, unduh blob sebagai kartu-qr-siswa.pdf. i18n qr_cards_pdf (ID/EN).
- Terverifikasi: PDF valid (%PDF, multi-halaman sesuai jumlah siswa). ZIP di-build ulang.

## 2026-09-25 — Landing page: fitur RFID/QR/NIS + bebas pilih metode
- Permintaan user: "update landing page fitur RFID barcode, sehingga sekolah bisa menentukan pilihannya sendiri, semua module tersedia". Section Fitur di Landing.jsx kini menampilkan 13 kartu termasuk: "Absen Tap Kartu RFID/NFC" (wide), "Kartu QR Code Otomatis" (wide, auto-generate + cetak massal PDF), "NIS/NIP Manual + Keypad Layar", dan kartu khusus "Sekolah Menentukan Metodenya Sendiri" (wide) yang menegaskan semua modul bisa dipakai bersamaan. Subjudul section diperbarui menyebut semua metode + kebebasan memilih.
- Terverifikasi e2e (desktop + mobile 390): semua kartu fitur tampil, tidak ada overflow horizontal. ZIP di-build ulang.

## 2026-09-25 — Rapi: grid fitur landing page tanpa lubang
- Laporan user (screenshot): ada lubang kosong di grid fitur karena 5 kartu wide (col-span-2) + 8 normal = 18 kolom tidak habis dibagi 4. Fix: hanya 3 kartu wide (Face, RFID, QR) di awal + 10 kartu normal = 16 kolom = 4 baris penuh sempurna di desktop (juga genap di md 2-kolom). Urutan disusun agar tiap baris terisi penuh.
- Terverifikasi e2e: setiap baris grid terisi ~100%, tidak ada overflow mobile. ZIP di-build ulang.

## 2026-09-25 — ZIP final dibangun ulang dari nol (jaminan tidak ada yang tertinggal)
- Permintaan user: "zip file terbaru jangan sampe ada yg ketunggak sy mau upload". Build dibersihkan total (rm build + zip lama) lalu di-build ulang penuh. Terverifikasi dalam ZIP: PWA (manifest-kiosk.json, sw-kiosk.js, icon-192/512), .htaccess, BACA-SAYA.txt, dan bundle berisi semua fitur terbaru: mode Registrasi Kartu (reg-tap-panel), absen RFID (attend-card), tombol Kartu QR PDF (qr-pdf-btn), landing grid baru ("Sekolah Menentukan Metodenya Sendiri"). Endpoint download 200. Ukuran 3.2MB.

## 2026-09-25 — Presentasi produk RadiusGate (PPTX) untuk penawaran ke sekolah
- Permintaan user: "buatkan presentasi produk ini, buat saya tawarkan ke sekolah2". File `presentasi-radiusgate.pptx` (7 slide, 16:9, tema teal/dark brand): cover, masalah absensi manual, solusi kiosk web + 4 peran, 4 metode absensi (wajah/RFID/QR/NIS) dengan penegasan sekolah bebas memilih, semua modul (SPP, portal ortu, WA, lembur/penggajian, dll), cara kerja 3 langkah, dan penawaran program pilot + CTA demo gratis.
- Endpoint download publik: GET /api/public/download/presentasi. Skrip generator disimpan di /app/memory/make_presentasi.py.

## 2026-09-25 — Panduan Pengguna (User Guide) PDF
- Permintaan user: "User Guide / cara pengoperasiannya tolong dibuatkan juga". File `panduan-radiusgate.pdf` (A4, ±8 halaman, Bahasa Indonesia): cover, daftar isi, pengenalan, Bagian A Kiosk (setup + PWA fullscreen, absen wajah/QR/RFID/NIS manual, mode Registrasi Kartu, screensaver/offline), Bagian B Portal Admin (CRUD + enroll + QR PDF + RFID, laporan, pengaturan geofence/jam, SPP, lembur, billing), Bagian C Guru (absen mapel + offline), Bagian D Karyawan, Bagian E Orang Tua, Bagian F FAQ/troubleshooting (7 skenario umum). Generator: /app/memory/make_panduan.py (reportlab).
- Endpoint download publik: GET /api/public/download/panduan. Terverifikasi PDF valid + endpoint 200.

## 2026-09-25 — Siap Deploy ke VPS Sendiri (Docker + Native Systemd + Panduan Lengkap)
- Permintaan user: memindahkan aplikasi ke VPS Linux sendiri.
- File konfigurasi produksi dibuat:
  1. `/app/docker-compose.yml` — orkestrasi MongoDB 6.0 + FastAPI backend + React frontend Nginx.
  2. `/app/backend/Dockerfile` — Python 3.11-slim + dependensi sistem untuk OpenCV/InsightFace/ArcFace + Pillow/ReportLab.
  3. `/app/frontend/Dockerfile` & `nginx-spa.conf` — build multi-stage Node 18 + Nginx SPA router.
  4. `/app/PANDUAN-VPS.md` — panduan step-by-step: spesifikasi server (Ubuntu 22.04/24.04), cara ekspor kode (Save to GitHub / VS Code), Metode Docker Compose, Metode Manual (Systemd + Nginx + Certbot SSL Let's Encrypt), migrasi DB, dan checklist post-deploy.
- Endpoint unduh panduan: GET `/api/public/download/panduan-vps`.

## 2026-09-25 — Fix restore-db.sh: auto-sudo docker + auto-install mongorestore
- User menjalankan restore di VPS sebagai user biasa → "permission denied docker.sock" lalu jatuh ke native "mongorestore: command not found". Fix: script otomatis mendeteksi dan memakai `sudo docker` bila perlu, mencari container mongo dengan grep fleksibel, dan bila native → auto-install mongodb-database-tools (apt, fallback unduh .deb resmi MongoDB). Cukup jalankan ulang 1 perintah yang sama.

## 2026-09-25 — Dukungan Arsitektur Dua Domain (radiusgate.id -> absensi.radiusgate.id)
- Permintaan user: landing page di `radiusgate.id` hanya untuk marketing, tombol-tombolnya (Masuk Portal, Mode Kiosk, Coba Demo, Daftar) otomatis redirect ke subdomain aplikasi `https://absensi.radiusgate.id`.
- Implementasi: komponen `PortalLink` di `Landing.jsx` membaca environment `REACT_APP_PORTAL_URL`. Jika diisi, tombol diarahkan ke URL eksternal (mis. `https://absensi.radiusgate.id/login` dan `/kiosk`).
- File panduan dibuat: `/app/PANDUAN-DUA-DOMAIN.md` (GET `/api/public/download/panduan-dua-domain`).
- Paket `landing-radiusgate.zip` sudah di-build ulang dengan konfigurasi redirect ke `https://absensi.radiusgate.id`.

## 2026-09-25 — Fix: tombol Kiosk hilang di tampilan mobile header
- Laporan user (screenshot): menu "Kiosk" tampil di desktop tapi hilang di mobile. Penyebab: class `hidden sm:flex` di Layout.jsx. Fix: tombol selalu tampil; ikon MonitorSmartphone selalu terlihat, teks "Kiosk" hanya muncul mulai breakpoint sm agar header tidak penuh.
- Terverifikasi e2e (mobile 390, login guru): tombol Kiosk terlihat & tidak ada overflow. ZIP di-build ulang.

## 2026-09-25 — Shortcut "Buka Kiosk + Auto-Pair" untuk admin
- Persetujuan user atas saran: tombol Kiosk di header untuk role school_admin kini otomatis membuka tab baru `/kiosk?pair=<kode>` (kode diambil dari /admin/settings) — kiosk langsung ter-pair tanpa ketik kode. Role lain tetap membuka /kiosk biasa. Ditambah item "Salin Link Kiosk (Auto-Pair)" di menu avatar admin (copy link ke clipboard + toast) untuk dikirim/dibuka di tablet kiosk. i18n ID/EN: kiosk_copy_link, kiosk_link_copied.
- Terverifikasi e2e: URL /kiosk?pair=KIOSK-DEMO-1 langsung masuk layar kiosk tanpa form pairing; item menu avatar admin tampil. ZIP di-build ulang.

## 2026-09-25 — Ekspor Excel absensi per mapel (halaman guru)
- Permintaan user (screenshot halaman Absen Mapel): "tambahkan export". Endpoint baru `GET /api/teacher/subject-att/export?date&subject&class_name` (teacher) — menghasilkan XLSX (openpyxl) berisi header (guru, mapel, kelas, tanggal) + tabel No/Nama/NIS/Status dari sesi tersimpan; 404 bila sesi belum tersimpan; validasi mapel & kelas yang diampu.
- Frontend: tombol "Ekspor Excel" (testid sa-export, ikon Download) di toolbar Absen Mapel, aktif setelah sesi tersimpan, unduh blob `absen-mapel-<mapel>-<kelas>-<tanggal>.xlsx`. i18n sa_export (ID/EN).
- Terverifikasi backend: login Lukman → export Agama/Kelas X TAV/2026-09-25 → XLSX valid berisi baris siswa. ZIP di-build ulang.

## 2026-09-25 — Ekspor rekap absensi mapel bulanan
- Persetujuan user atas saran: endpoint baru `GET /api/teacher/subject-att/recap-export?month=YYYY-MM&subject&class_name` (teacher) — XLSX rekap bulanan: baris per siswa, kolom tanggal 1..31 (H/S/I/A), plus kolom total H/S/I/A per siswa. Validasi mapel/kelas yang diampu; 404 bila belum ada data bulan itu.
- Frontend: input bulan (type=month, testid sa-recap-month) + tombol "Rekap Bulanan" (sa-recap-export) di toolbar Absen Mapel, unduh `rekap-mapel-<mapel>-<kelas>-<bulan>.xlsx`. i18n sa_recap_export (ID/EN).
- Terverifikasi backend: login Lukman → rekap Agama/Kelas X TAV/2026-09 → XLSX valid (kolom tanggal + total). ZIP di-build ulang.

## 2026-09-25 — Rekap mapel bulanan untuk admin (semua mapel & kelas)
- Persetujuan user atas saran: endpoint baru `GET /api/admin/subject-att/recap-export?month=YYYY-MM` (admin) — XLSX multi-sheet: tiap kombinasi Mapel–Kelas jadi 1 sheet (nama sheet disanitasi & anti-duplikat), kolom tanggal 1..31 + total H/S/I/A per siswa.
- Frontend: di halaman Laporan → tab "Absen Mapel" muncul panel pemilih bulan + tombol "Rekap Bulanan" (testid recap-month / recap-export-btn), unduh `rekap-mapel-bulanan-<bulan>.xlsx`. i18n sa_recap_month (ID/EN).
- Terverifikasi backend: login admin → rekap 2026-09 → XLSX valid 5 sheet (Agama/B.Indonesia/Matematika X TAV, Matematika X TB 1, PRE X TAV). Panel terverifikasi tampil di tab subject. ZIP di-build ulang.

## 2026-09-25 — Fix: mapel "Agama" tidak muncul di dropdown filter Laporan → Per Mapel
- Laporan user (screenshot): dropdown "Mata Pelajaran" tidak memuat "Agama" padahal tabel menampilkan baris Agama. Akar masalah: endpoint `GET /admin/meta/options` memakai master list `settings.subject_list` (berisi "Pendidikan Agama dan Budi Pekerti" dll) — mapel kustom "Agama" yang dipakai guru Lukman tidak ada di sana. Fix: `meta_options` kini meng-union-kan daftar mapel dengan distinct `subject` dari `subject_attendance` sekolah, sehingga mapel yang punya data absensi selalu muncul di filter.
- Backend-only change (frontend tidak berubah → ZIP tidak perlu di-build ulang). VPS: cukup `git pull && sudo docker compose up -d --build`.
- Verifikasi wajib: testing_agent (lihat laporan iterasi terbaru).

## 2026-09-25 — Fix susulan: dropdown Kelas juga di-union dengan data absensi
- Persetujuan user atas saran testing agent: `meta_options` kini juga meng-union-kan daftar kelas dengan distinct `class_name` dari `subject_attendance` dan `class` dari `attendance`, sehingga kelas kustom yang punya data absensi selalu muncul di filter Laporan (pola bug yang sama seperti mapel "Agama").

## 2026-09-25 — Filter dropdown nama pada tab Per Guru & Per Karyawan di Laporan
- Laporan user: "Per Guru blom ada filternya". Komponen PersonReport (tab Per Guru/Per Karyawan) kini punya dropdown filter nama (testid tc-name-filter / emp-name-filter) — opsi dari daftar nama yang punya data pada rentang tanggal, memfilter tabel Harian & Rekap + counter tab secara client-side. Tab siswa tidak diberi dropdown nama (sudah ada filter kelas + pencarian).


## 2026-09-25 (lanjutan) — Auto-pair Kiosk untuk user login
- Endpoint baru `GET /api/auth/kiosk-code` (routes_auth.py): mengembalikan `kiosk_token` sekolah untuk role `school_admin`, `teacher`, `employee`; parent ditolak (403), tanpa login 401.
- `Layout.jsx`: tombol Kiosk di header kini auto-pair untuk SEMUA role non-parent (dulu hanya school_admin via `/admin/settings`), membuka `/kiosk?pair=CODE` di tab baru.
- `Kiosk.jsx`: jika kiosk belum dipairing tapi ada sesi login di browser (localStorage `token`), kiosk otomatis fetch kode dan langsung aktif tanpa input kode.
- Teruji: curl (teacher/admin → kode OK, parent → 403, anon → 401) + screenshot e2e (login guru → buka /kiosk tanpa kiosk_token → langsung tampil kiosk "SMA Nusantara (Demo)" tanpa form kode).
- Deployment user: Save to GitHub → `git pull && sudo docker compose up -d --build` di VPS (panduan SSH: `ssh-keygen -R <ip>` saat fingerprint berubah setelah reinstall VPS).
- Pagination "Tampilkan entri" di semua tabel halaman Laporan admin (`Reports.jsx`): hook `usePager` + komponen `PagerBar` (opsi 20/50/100/200/500/1000, tombol prev/next, info "x–y dari z"). Diterapkan ke tabel Harian utama, Per Mapel, Per Siswa/Guru/Karyawan (harian & rekap). Teruji: pilih 50 → render tepat 50 baris, tanpa overflow mobile.
- Revisi atas permintaan user: `PagerBar` dipindah dari bawah ke ATAS tabel (border-t → border-b) di semua tab laporan. Terverifikasi via screenshot per-tab (Harian/Per Mapel/Per Siswa/Per Guru): pager berada di atas tabel, dropdown interaktif, mobile aman.
- Picker Rekap Bulanan diganti dari `input type="month"` mentah menjadi komponen `MonthYearPicker` (dropdown Bulan nama lengkap + Tahun) di halaman Absen Mapel guru (`TeacherSubjectAtt.jsx`) dan Laporan admin tab Per Mapel (`Reports.jsx`). Teruji: dropdown bulan/tahun muncul, ganti bulan interaktif, mobile tanpa overflow.
- Shortcut rentang tanggal (komponen `RangeShortcuts` di `Reports.jsx` + key i18n `range_today/week/month/semester` ID+EN): tombol Hari Ini, Minggu Ini (mulai Senin), Bulan Ini, Semester Ini (Jul–Des / Jan–Jun) di semua kartu filter Dari–Sampai halaman Laporan (Harian, Per Mapel, Per Siswa/Guru/Karyawan). Teruji: Bulan Ini → 2026-09-01, Hari Ini → hari ini, Semester → 2026-07-01; mobile aman.
