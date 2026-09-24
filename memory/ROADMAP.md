# ROADMAP — RadiusGate

## P0 (menunggu user)
1. **Aktivasi Tripay asli** — minta Merchant Code + API Key + Private Key → isi backend/.env, TRIPAY_MODE=real, uji webhook `/api/webhooks/tripay` (HMAC sudah siap). Berlaku untuk SPP & billing SaaS.
2. **Token Wablas asli** — Owner → Notifikasi → isi token → uji kirim WA nyata (notif ortu, ringkasan mingguan, pengingat SPP, kuitansi).

## P1
3. **Tombol "Reset Password Ortu"** di halaman Siswa (reset ke NIS kapan saja, tanpa tergantung Wablas) — akar masalah: perubahan NIS tidak menyinkronkan password akun ortu (kasus Danil 2026-09-23).
4. Uji lapangan kiosk di HP dengan wajah asli (kalibrasi threshold 0.45).
5. Cron: semua 5 slot platform terpakai — fitur terjadwal baru harus digabung ke cron yang ada.

## P2
6. Tablet React Native (kiosk native, embedding cache on-device).
7. Laporan grafik SPP (chart per kategori/bulan); impor/migrasi data tagihan lama.
8. Gateway tambahan (Midtrans/Duitku); audio pre-recorded pengganti TTS; shadcn Calendar pengganti date picker native.

## Catatan operasional
- Setiap perubahan frontend → rebuild ZIP Hostinger: `cd /app/frontend && yarn build && cd build && zip -rq ../landing-radiusgate.zip .`
- Kredensial uji: `/app/memory/test_credentials.md`.
- Riwayat perubahan: `/app/memory/CHANGELOG.md`.
