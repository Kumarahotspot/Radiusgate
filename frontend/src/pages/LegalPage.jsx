import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CONTENT = {
  privasi: {
    title: "Kebijakan Privasi",
    updated: "Terakhir diperbarui: 26 September 2026",
    sections: [
      ["Data yang Kami Kumpulkan",
        "RadiusGate mengumpulkan data yang diperlukan untuk menjalankan layanan absensi dan administrasi organisasi Anda, meliputi: data identitas (nama, NIS/NIP, kelas/departemen, jabatan, shift kerja), foto wajah untuk keperluan verifikasi biometrik, lokasi GPS saat absensi di kiosk, data kehadiran & keterlambatan, data lembur dan penggajian (khusus perusahaan), serta data kontak (nomor WhatsApp dan email) untuk notifikasi dan pembayaran."],
      ["Penggunaan Data",
        "Data digunakan semata-mata untuk: verifikasi kehadiran berbasis wajah dan lokasi, penyusunan laporan kehadiran, perhitungan lembur dan penggajian, penerbitan surat peringatan (SP) berdasarkan data keterlambatan, pengelolaan tagihan dan pembayaran (SPP untuk sekolah), serta pengiriman notifikasi kepada orang tua/wali atau pihak HRD. Kami tidak menjual atau membagikan data kepada pihak ketiga di luar kebutuhan operasional layanan (misalnya penyedia gateway pembayaran dan layanan pengiriman pesan)."],
      ["Data Biometrik & Lokasi",
        "Foto wajah diubah menjadi representasi digital (embedding) untuk pencocokan dan disimpan secara aman. Data lokasi GPS hanya dibaca pada saat proses absensi untuk memastikan perangkat berada di dalam area organisasi Anda, dan tidak dilacak di luar proses tersebut."],
      ["Penyimpanan & Keamanan",
        "Data disimpan pada infrastruktur cloud dengan akses terbatas dan terenkripsi dalam transmisi. Setiap sekolah maupun perusahaan hanya dapat mengakses data miliknya sendiri (isolasi multi-tenant). Data disimpan selama organisasi menjadi pelanggan aktif dan dapat dihapus atas permintaan resmi."],
      ["Hak Sekolah, Perusahaan & Individu",
        "Sekolah, perusahaan, orang tua/wali, maupun karyawan berhak meminta akses, koreksi, atau penghapusan data pribadi dengan menghubungi admin organisasi atau kami melalui kontak di bawah. Permintaan penghapusan data wajah dapat dilakukan kapan saja melalui portal admin."],
      ["Kontak",
        "Pertanyaan terkait privasi dapat disampaikan ke PT. Pusaka Kreasi Mandiri — Telaga Golf Sawangan, Cluster Belanda Blok E10 No. 60-61, Sawangan, Depok, Jawa Barat 16551 — melalui email admin@radiusgate.id atau WhatsApp 08888 200 999."],
    ],
  },
  syarat: {
    title: "Syarat & Ketentuan",
    updated: "Terakhir diperbarui: 26 September 2026",
    sections: [
      ["Layanan",
        "RadiusGate adalah platform SaaS absensi digital (face recognition, kartu RFID, QR code, geofence GPS, laporan) untuk sekolah dan perusahaan — mencakup portal orang tua, pembayaran SPP online, manajemen shift kerja, perhitungan lembur, penggajian, dan penerbitan surat peringatan — yang disediakan oleh PT. Pusaka Kreasi Mandiri. Layanan diberikan apa adanya dan dapat berkembang dari waktu ke waktu."],
      ["Akun & Tanggung Jawab Pelanggan",
        "Sekolah atau perusahaan bertanggung jawab atas kebenaran data yang dimasukkan (data siswa, guru, karyawan, dan orang tua), menjaga kerahasiaan kredensial akun dan kode kiosk, serta memastikan persetujuan yang diperlukan dari orang tua/wali atau karyawan untuk pemrosesan data pribadi sesuai peraturan yang berlaku, termasuk UU Perlindungan Data Pribadi."],
      ["Langganan & Pembayaran",
        "Layanan ditagihkan per siswa aktif per bulan (paket sekolah) atau per karyawan aktif per bulan (paket perusahaan Basic/Pro) sesuai tarif yang tertera pada invoice atau halaman harga. Program trial gratis berlaku 14 hari; setelah berakhir, akses ke portal akan dinonaktifkan hingga langganan diaktifkan. Keterlambatan pembayaran dapat mengakibatkan penangguhan layanan setelah pemberitahuan."],
      ["Penggunaan yang Dilarang",
        "Pengguna dilarang menyalahgunakan layanan, termasuk mengunggah data palsu, mencoba mengakses data organisasi lain, merekayasa data kehadiran, atau mengganggu infrastruktur layanan. Pelanggaran dapat berakibat penghentian akun."],
      ["Batasan Tanggung Jawab",
        "Kami berupaya menjaga ketersediaan dan keakuratan layanan, namun tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan atau ketidaktersediaan layanan, termasuk kegagalan perangkat keras kiosk, reader RFID, atau jaringan internet di lokasi pelanggan. Data kehadiran dan penggajian yang dihasilkan sistem sebaiknya diverifikasi oleh admin/HRD sebelum digunakan sebagai dasar keputusan kepegawaian."],
      ["Perubahan & Kontak",
        "Syarat ini dapat diperbarui dan versi terbaru akan dipublikasikan di halaman ini. Pertanyaan dapat disampaikan ke PT. Pusaka Kreasi Mandiri melalui email admin@radiusgate.id atau WhatsApp 08888 200 999."],
    ],
  },
};

export default function LegalPage({ kind }) {
  const c = CONTENT[kind] || CONTENT.privasi;
  return (
    <div data-testid={`legal-${kind}`} className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="RadiusGate" className="w-9 h-9 object-contain" />
            <span className="font-bold text-sm text-slate-800">RadiusGate</span>
          </Link>
          <Link data-testid="legal-back" to="/" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
        <p className="mt-2 text-xs text-slate-400">{c.updated}</p>
        <div className="mt-8 space-y-7">
          {c.sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="font-bold text-slate-800">{h}</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 pt-6 border-t border-slate-200 text-[11px] text-slate-400">© 2026 PT. Pusaka Kreasi Mandiri · RadiusGate</p>
      </main>
    </div>
  );
}
