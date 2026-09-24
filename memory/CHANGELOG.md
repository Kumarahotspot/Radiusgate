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
