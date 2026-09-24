from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

DARK = HexColor("#0B1320")
TEAL = HexColor("#0F766E")
SLATE = HexColor("#475569")
LIGHT = HexColor("#E2E8F0")
RED = HexColor("#DC2626")

OUT = "/app/frontend/panduan-radiusgate.pdf"
W, H = A4
M = 20 * mm
c = canvas.Canvas(OUT, pagesize=A4)
page_no = 0
y = 0


def footer():
    c.setFont("Helvetica", 8)
    c.setFillColor(SLATE)
    c.drawCentredString(W / 2, 10 * mm, f"RadiusGate — Panduan Pengguna · Hal. {page_no}")


def new_page():
    global page_no, y
    if page_no:
        footer()
        c.showPage()
    page_no += 1
    y = H - M


def need(h):
    if y - h < M + 8 * mm:
        new_page()


def wrap(text, font, size, maxw):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if c.stringWidth(t, font, size) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def para(text, size=10.5, color=SLATE, bold=False, indent=0, gap=3, maxw=None):
    global y
    font = "Helvetica-Bold" if bold else "Helvetica"
    maxw = maxw or (W - 2 * M - indent)
    for line in wrap(text, font, size, maxw):
        need(size * 1.5)
        c.setFont(font, size)
        c.setFillColor(color)
        c.drawString(M + indent, y, line)
        y -= size * 1.45
    y -= gap


def h1(text):
    global y
    need(22 * mm)
    y -= 4 * mm
    c.setFillColor(TEAL)
    c.rect(M, y - 1.5 * mm, 3 * mm, 8 * mm, stroke=0, fill=1)
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(DARK)
    c.drawString(M + 6 * mm, y, text)
    y -= 9 * mm


def h2(text):
    global y
    need(14 * mm)
    y -= 2 * mm
    c.setFont("Helvetica-Bold", 12.5)
    c.setFillColor(TEAL)
    c.drawString(M, y, text)
    y -= 6 * mm


def bullets(items, indent=6 * mm):
    for it in items:
        para("•  " + it, indent=indent, gap=1.5)


# ================= COVER =================
new_page()
c.setFillColor(DARK)
c.rect(0, 0, W, H, stroke=0, fill=1)
try:
    c.drawImage("/app/frontend/public/logo-white.png", W / 2 - 22 * mm, H - 70 * mm, 44 * mm, 44 * mm, mask="auto")
except Exception:
    pass
c.setFillColor(HexColor("#FFFFFF"))
c.setFont("Helvetica-Bold", 30)
c.drawCentredString(W / 2, H - 95 * mm, "RadiusGate")
c.setFont("Helvetica", 14)
c.setFillColor(HexColor("#14B8A6"))
c.drawCentredString(W / 2, H - 105 * mm, "Panduan Pengguna (User Guide)")
c.setFont("Helvetica", 10.5)
c.setFillColor(HexColor("#94A3B8"))
c.drawCentredString(W / 2, H - 115 * mm, "Sistem Absensi Sekolah: Wajah · QR Code · Kartu RFID · NIS Manual")
c.drawCentredString(W / 2, H - 122 * mm, "Kiosk Web + Portal Admin / Guru / Karyawan / Orang Tua")
c.setFont("Helvetica", 9)
c.drawCentredString(W / 2, 25 * mm, "Versi 1.0 — 2026")

# ================= DAFTAR ISI =================
new_page()
h1("Daftar Isi")
for i, it in enumerate([
    "Pengenalan Produk",
    "Bagian A — Mengoperasikan Kiosk (Gerbang/Tablet)",
    "Bagian B — Portal Admin Sekolah",
    "Bagian C — Portal Guru",
    "Bagian D — Portal Karyawan",
    "Bagian E — Portal Orang Tua",
    "Bagian F — Pertanyaan Umum & Pemecahan Masalah",
], 1):
    para(f"{i}.  {it}", 12, DARK, gap=4)

# ================= 1. PENGENALAN =================
new_page()
h1("1. Pengenalan Produk")
para("RadiusGate adalah sistem absensi sekolah berbasis web. Sebuah tablet atau HP biasa yang diletakkan di gerbang "
     "berfungsi sebagai mesin absensi (kiosk). Siswa, guru, dan karyawan dapat absen dengan empat metode yang bisa "
     "dipakai bersamaan — sekolah bebas memilih:", bold=False)
bullets([
    "Wajah (AI): verifikasi wajah ArcFace + liveness, anti titip absen dengan foto/video.",
    "Kartu QR Code: QR unik per orang dibuat otomatis, cukup diarahkan ke kamera kiosk.",
    "Kartu RFID/NFC: tempel kartu ke reader USB/OTG — tercatat tanpa menyentuh layar.",
    "NIS/NIP manual: ketik nomor induk lewat keypad besar di layar kiosk.",
])
para("Setiap absen tercatat real-time di dashboard admin, memicu notifikasi WhatsApp ke orang tua (bila diaktifkan), "
     "dan otomatis masuk rekap harian/bulanan. Sistem juga mencakup absensi per mata pelajaran, portal orang tua, "
     "tagihan SPP, serta lembur & penggajian karyawan.")

# ================= BAGIAN A: KIOSK =================
new_page()
h1("2. Bagian A — Mengoperasikan Kiosk")
h2("A.1 Menyiapkan kiosk (sekali saja)")
bullets([
    "Buka alamat kiosk di browser tablet/HP: https://domain-anda/kiosk",
    "Masukkan Kode Kiosk yang diberikan admin, lalu tekan Hubungkan. Kode tersimpan otomatis — berikutnya kiosk langsung terbuka.",
    "Agar full page otomatis tanpa menyentuh layar: menu browser (titik tiga) → 'Add to Home screen' / 'Tambahkan ke layar utama', lalu buka kiosk dari ikon di layar utama (PWA).",
    "Aktifkan izin kamera & lokasi saat diminta browser (wajib untuk wajah + geofence).",
])
h2("A.2 Absen dengan wajah")
bullets([
    "Pilih Absen Masuk atau Absen Pulang (tombol pill di bawah kamera).",
    "Tekan tombol besar Absen, lalu berdiri menghadap kamera dan bergerak sedikit (liveness).",
    "Jika cocok: kartu hijau + nama + bunyi sapaan. Jika gagal: kartu merah berisi alasannya.",
])
h2("A.3 Absen dengan kartu QR Code")
bullets([
    "Kamera kiosk selalu memindai otomatis — tidak perlu menekan tombol apa pun.",
    "Arahkan kartu QR ke kamera hingga terdengar bunyi klik, lalu kartu hasil tampil.",
    "Kartu yang sama tidak akan tercatat dobel bila diarahkan terus-menerus (jeda 15 detik).",
])
h2("A.4 Absen dengan kartu RFID/NFC")
bullets([
    "Pastikan reader RFID USB/OTG tercolok ke perangkat kiosk.",
    "Tempelkan kartu — absen langsung tercatat otomatis tanpa menyentuh layar.",
    "Kartu yang belum terdaftar akan ditolak dengan pesan 'Kartu tidak terdaftar'.",
])
h2("A.5 Absen manual (NIS/NIP)")
bullets([
    "Sentuh kolom 'Masukkan NIS / NIP' — keypad angka besar muncul dan kamera mengecil.",
    "Ketik nomor dengan keypad (ada bunyi klik), lalu tekan Absen Manual.",
    "Berhasil maupun gagal, kiosk otomatis kembali ke layar utama dan kolom terhapus.",
])
h2("A.6 Mode Registrasi Kartu (khusus admin)")
bullets([
    "Sentuh ikon kartu (NFC) di pojok kanan atas kamera → masuk dengan email & kata sandi admin sekolah.",
    "Cari nama (siswa/guru/karyawan), pilih nama → minta yang bersangkutan menempelkan kartu.",
    "UID kartu langsung tersimpan, banner hijau konfirmasi, lalu lanjut ke nama berikutnya.",
    "Selesai? Tekan tombol Selesai di kanan atas. Sesi admin otomatis tertutup.",
])
h2("A.7 Lainnya")
bullets([
    "Ikon speaker: mengaktifkan/membisukan suara. Ikon layar: fullscreen manual.",
    "Koneksi internet putus? Absen wajah/NIS masuk antrean offline dan tersinkron saat online kembali.",
    "Saat tidak dipakai, kiosk menampilkan screensaver berisi informasi sekolah (diatur admin).",
])

# ================= BAGIAN B: ADMIN =================
new_page()
h1("3. Bagian B — Portal Admin Sekolah")
para("Masuk melalui https://domain-anda/login dengan akun admin sekolah.")
h2("B.1 Data siswa, guru & karyawan")
bullets([
    "Menu Siswa/Guru/Karyawan → Tambah: isi data, bisa juga impor massal via CSV/Excel (template tersedia).",
    "Enroll wajah: ikon wajah di kolom aksi → ambil foto wajah (wajib untuk absen wajah). Bisa juga massal via ZIP foto.",
    "Kode QR: ikon QR di kolom aksi → tampil & unduh QR per orang. Tombol 'Kartu QR (PDF)' mencetak QR semua siswa (6 kartu per halaman, urut per kelas).",
    "Kartu RFID: isi kolom 'Kartu RFID (UID)' di form tambah/edit — atau pakai mode Registrasi Kartu di kiosk. Ikon kartu di tabel menyala teal bila kartu sudah terdaftar.",
])
h2("B.2 Memantau kehadiran")
bullets([
    "Dasbor: statistik hari ini (hadir/telat/izin/sakit/alpa) dan aktivitas terbaru.",
    "Laporan: rekap harian & bulanan per siswa/kelas, ekspor Excel & PDF.",
])
h2("B.3 Pengaturan sekolah")
bullets([
    "Menu Pengaturan: jam masuk/pulang, toleransi keterlambatan, jam pulang siswa per hari.",
    "Geofence: tambah lokasi (nama, titik GPS, radius meter) — absen hanya sah di dalam radius.",
    "Kode kiosk, master kelas/mapel, catatan screensaver, dan logo sekolah diatur di sini.",
])
h2("B.4 SPP & keuangan")
bullets([
    "Menu SPP & Tagihan: buat tagihan per kelas/siswa, pantau pembayaran & cicilan, unduh kuitansi PDF.",
    "Menu Lembur: setujui/tolak pengajuan lembur karyawan; gaji dihitung otomatis dari kehadiran + lembur.",
    "Menu Billing: tagihan layanan RadiusGate sekolah Anda (dihitung per siswa aktif).",
])

# ================= BAGIAN C: GURU =================
new_page()
h1("4. Bagian C — Portal Guru")
bullets([
    "Login dengan akun guru → menu Absensi Mapel: pilih kelas & mata pelajaran, daftar siswa tampil.",
    "Tandai Hadir/Izin/Sakit/Alpa per siswa — tersimpan otomatis (auto-save) setiap perubahan.",
    "Mode offline: bila internet putus, daftar nama tetap tampil dari cache dan absen tersimpan lokal, lalu tersinkron otomatis saat online kembali (ditandai badge).",
    "Guru juga absen kehadiran harian di kiosk seperti siswa (wajah/QR/RFID/NIP).",
    "Ganti kata sandi lewat menu avatar di kanan atas.",
])

# ================= BAGIAN D: KARYAWAN =================
h1("5. Bagian D — Portal Karyawan")
bullets([
    "Login dengan akun karyawan: lihat riwayat kehadiran dan status (masuk/pulang/telat).",
    "Ajukan lembur dari portal; setelah disetujui admin, masuk perhitungan gaji.",
    "Slip/rincian gaji bulanan tampil otomatis dari data kehadiran + lembur.",
])

# ================= BAGIAN E: ORANG TUA =================
new_page()
h1("6. Bagian E — Portal Orang Tua")
bullets([
    "Login memakai nomor WhatsApp terdaftar (kata sandi awal = NIS anak; segera ganti).",
    "Pantau kehadiran anak real-time: jam masuk/pulang, telat (menit), izin/sakit.",
    "Ajukan izin/sakit langsung dari portal — guru & admin menerima notifikasi.",
    "Lihat & bayar tagihan SPP, unduh kuitansi PDF.",
    "Bila notifikasi WhatsApp aktif, orang tua menerima pesan otomatis setiap anak absen.",
])

# ================= BAGIAN F: FAQ =================
h1("7. Bagian F — Pertanyaan Umum & Pemecahan Masalah")
faq = [
    ("Kamera tidak menyala di kiosk", "Pastikan izin kamera diberikan di browser, dan tidak ada aplikasi lain yang memakai kamera. Muat ulang halaman."),
    ("Absen wajah gagal terus untuk satu orang", "Enroll ulang wajahnya dengan pencahayaan baik; atau gunakan QR/RFID/NIS sebagai alternatif."),
    ("'Anda di luar area geofence'", "Perangkat kiosk harus berada di dalam radius lokasi sekolah. Periksa Pengaturan → Geofence dan izin lokasi browser."),
    ("Kartu RFID tidak terbaca", "Pastikan reader terdeteksi (coba tap saat kursor di kolom teks — UID harus muncul). Daftarkan UID lewat mode Registrasi Kartu di kiosk."),
    ("QR tidak terdeteksi", "Dekatkan kartu 15–30 cm dari kamera, pastikan pencahayaan cukup dan QR tidak buram/terpotong."),
    ("'Sudah absen untuk sesi ini hari ini'", "Orang tersebut sudah tercatat untuk sesi (Masuk/Pulang) yang sama hari ini — perlindungan anti dobel."),
    ("Internet mati saat jam sibuk", "Tetap absen seperti biasa — data masuk antrean offline dan terkirim otomatis saat internet kembali."),
]
for q, a in faq:
    para("T:  " + q, 11, DARK, True, gap=1)
    para("J:  " + a, 10.5, SLATE, gap=4)

new_page()
c.setFillColor(DARK)
c.rect(0, 0, W, H, stroke=0, fill=1)
c.setFillColor(HexColor("#FFFFFF"))
c.setFont("Helvetica-Bold", 22)
c.drawCentredString(W / 2, H / 2 + 12 * mm, "Butuh bantuan penerapan?")
c.setFont("Helvetica", 12)
c.setFillColor(HexColor("#14B8A6"))
c.drawCentredString(W / 2, H / 2, "Tim RadiusGate siap membantu setup & pelatihan di sekolah Anda.")
c.setFillColor(HexColor("#94A3B8"))
c.setFont("Helvetica", 10)
c.drawCentredString(W / 2, H / 2 - 10 * mm, "RadiusGate — radiusgate.id")

footer()
c.save()
print("SAVED", OUT, "pages:", page_no)
