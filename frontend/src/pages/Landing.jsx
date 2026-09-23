import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { errMsg } from "@/api";
import {
  ScanFace, MapPin, WifiOff, Tablet, Receipt, Send, Languages, Volume2,
  UserPlus, Camera, FileCheck, MonitorSmartphone, ArrowRight, Check,
  Wallet, QrCode, BellRing, FileText,
} from "lucide-react";

const FEATURES = [
  { icon: ScanFace, badge: "Keamanan AI", title: "Face Recognition ArcFace + Liveness", desc: "AI mengenali wajah siswa & guru dalam hitungan detik, dan menolak kecurangan memakai foto/video HP.", wide: true },
  { icon: MapPin, badge: "Akurasi Lokasi", title: "GPS Geofence", desc: "Absensi hanya sah di dalam radius area sekolah yang ditentukan admin." },
  { icon: WifiOff, badge: "Anti Gangguan", title: "Offline-First Sync", desc: "Internet sekolah down? Absensi tetap jalan dan tersinkron otomatis saat online kembali." },
  { icon: Tablet, badge: "Hemat Biaya", title: "Kiosk Web di HP/Tablet", desc: "Ubah tablet atau HP bekas menjadi mesin absensi canggih — tanpa beli hardware mahal." },
  { icon: Receipt, badge: "Per-Siswa", title: "Billing Otomatis", desc: "Tagihan dihitung transparan dari jumlah siswa aktif setiap bulan." },
  { icon: Wallet, badge: "SPP Online", title: "Pembayaran Uang Sekolah", desc: "Tagihan SPP & cicilan dengan portal orang tua, kuitansi PDF otomatis, dan pengingat WhatsApp.", wide: true },
  { icon: QrCode, badge: "Multi Payment Gateway", title: "QRIS, VA & E-Wallet", desc: "Terima pembayaran dari semua channel: QRIS, Virtual Account bank, e-wallet, sampai gerai retail — satu integrasi." },
  { icon: Send, badge: "Otomasi", title: "Invoice PDF via Email & WA", desc: "Invoice dan rekap kehadiran terkirim otomatis ke email & WhatsApp." },
  { icon: Languages, badge: "Bilingual", title: "Dwibahasa ID / EN", desc: "Seluruh portal dan kiosk mendukung Bahasa Indonesia & Inggris." },
  { icon: Volume2, badge: "Audio", title: "Umpan Balik Suara", desc: "Sapaan suara real-time memberi konfirmasi langsung saat absen berhasil." },
];

const STEPS = [
  { n: "01", icon: UserPlus, title: "Enroll Wajah", desc: "Admin mendaftarkan siswa & guru, lalu mengambil sampel wajah lewat portal — bisa juga lewat unggah foto." },
  { n: "02", icon: Camera, title: "Absen di Kiosk", desc: "Siswa berdiri di depan tablet kiosk. AI memverifikasi wajah, liveness, dan lokasi GPS seketika." },
  { n: "03", icon: FileCheck, title: "Laporan Otomatis", desc: "Rekap harian, keterlambatan, izin/sakit, dan tagihan bulanan tersaji otomatis di dashboard." },
];

const SLIDES = [
  { src: "/slides/siswa-absen.jpg", title: "Siswa absen wajah di gerbang sekolah", sub: "Kiosk RadiusGate · verifikasi < 3 detik" },
  { src: "/slides/kiosk.jpg", title: "Kiosk tablet anti titip absen", sub: "Face recognition + liveness + GPS geofence" },
  { src: "/slides/dashboard.jpg", title: "Admin memantau laporan real-time", sub: "Rekap harian, keterlambatan & SPP satu dasbor" },
];

const rupiah = (n) => "Rp " + n.toLocaleString("id-ID");

export default function Landing() {
  const [students, setStudents] = useState(300);
  const [form, setForm] = useState({ school_name: "", contact_person: "", email: "", phone: "", student_count: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/public/leads", { ...form, student_count: form.student_count ? Number(form.student_count) : null });
      setSent(true);
      toast.success("Pengajuan terkirim. Terima kasih!");
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const F = ({ k, label, type = "text", ph, testid, area }) => (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      {area ? (
        <textarea data-testid={testid} rows={3} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
      ) : (
        <input data-testid={testid} type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
      )}
    </div>
  );

  return (
    <div data-testid="landing-page" className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-teal-100/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <a href="#" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="RadiusGate" className="w-12 h-12 object-contain" />
            <span className="font-extrabold text-xl tracking-tight">RadiusGate</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a data-testid="nav-link-fitur" href="#fitur" className="hover:text-teal-700 transition-colors">Fitur</a>
            <a data-testid="nav-link-cara-kerja" href="#cara-kerja" className="hover:text-teal-700 transition-colors">Cara Kerja</a>
            <a data-testid="nav-link-pembayaran" href="#pembayaran" className="hover:text-teal-700 transition-colors">Pembayaran</a>
            <a data-testid="nav-link-harga" href="#harga" className="hover:text-teal-700 transition-colors">Harga</a>
            <a data-testid="nav-link-kontak" href="#kontak" className="hover:text-teal-700 transition-colors">Kontak</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link data-testid="nav-kiosk-button" to="/kiosk"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border border-teal-700 text-teal-700 hover:bg-teal-50 transition-colors">
              <MonitorSmartphone className="w-4 h-4" /> Mode Kiosk
            </Link>
            <Link data-testid="nav-login-button" to="/login"
              className="text-xs font-bold px-4 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 transition-colors">
              Masuk Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5">
            Solusi Absensi AI Multi-Tenant untuk Sekolah
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08]">
            Gerbang Absensi Digital <span className="text-teal-700">Sekolah Masa Kini.</span>
          </h1>
          <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-lg">
            Presensi siswa & guru berbasis pengenalan wajah ArcFace, liveness anti-spoofing, dan GPS geofence.
            Lengkap dengan pembayaran uang sekolah online (QRIS, VA, e-wallet) — tanpa alat khusus, cukup HP atau tablet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a data-testid="hero-cta-pilot" href="#kontak"
              className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm px-6 py-3.5 rounded-2xl transition-colors shadow-lg shadow-teal-700/20">
              Daftar Pilot Sekolah <ArrowRight className="w-4 h-4" />
            </a>
            <Link data-testid="hero-cta-kiosk-demo" to="/kiosk"
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-teal-600 hover:text-teal-700 font-bold text-sm px-6 py-3.5 rounded-2xl transition-colors">
              Coba Mode Kiosk
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[["AI ArcFace", "Pengenalan Wajah"], ["< 3 Detik", "Proses Presensi"], ["100%", "Bisa Offline"], ["Rp 0", "Biaya Alat Khusus"]].map(([v, l]) => (
              <div key={l}>
                <p className="text-xl font-extrabold text-teal-700">{v}</p>
                <p className="text-xs text-slate-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kiosk mockup */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-teal-100/70 to-emerald-50 rounded-[3rem] -z-10" />
          <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img src="/logo-white.png" alt="" className="w-9 h-9 object-contain" />
                <span className="text-white text-xs font-bold">RadiusGate · Kiosk</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="relative aspect-[4/3] rounded-2xl bg-slate-800 overflow-hidden" data-testid="hero-slideshow">
              {SLIDES.map((s, i) => (
                <img key={s.src} src={s.src} alt={s.title}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === slide ? "opacity-100" : "opacity-0"}`} />
              ))}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {SLIDES.map((_, i) => (
                  <button key={i} data-testid={`slide-dot-${i}`} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition-colors ${i === slide ? "bg-teal-400" : "bg-white/30 hover:bg-white/60"}`} />
                ))}
              </div>
            </div>
            <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 min-h-[60px]">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"><Check className="w-4 h-4" /></span>
              <div key={slide}>
                <p className="text-white text-xs font-bold" data-testid="slide-caption">{SLIDES[slide].title}</p>
                <p className="text-slate-400 text-[11px]">{SLIDES[slide].sub}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">Fitur Lengkap untuk Sekolah Indonesia</h2>
          <p className="text-slate-500 text-sm sm:text-base text-center mt-3 max-w-2xl mx-auto">Satu platform untuk presensi wajah, geofence GPS, laporan, sampai penagihan otomatis.</p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} data-testid={`feature-${f.title.slice(0, 12).replace(/\W+/g, "-").toLowerCase()}`}
                className={`${f.wide ? "lg:col-span-2" : ""} group bg-slate-50 hover:bg-teal-50/60 border border-slate-100 hover:border-teal-200 rounded-2xl p-6 transition-colors`}>
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-teal-700/10 text-teal-700 flex items-center justify-center group-hover:bg-teal-700 group-hover:text-white transition-colors">
                    <f.icon className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700/70">{f.badge}</span>
                </div>
                <h3 className="mt-4 font-bold text-slate-800">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara kerja */}
      <section id="cara-kerja" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">3 Langkah Menerapkan RadiusGate</h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="relative bg-white border border-slate-200 rounded-2xl p-6">
              <span className="text-4xl font-extrabold text-teal-100 absolute top-4 right-5">{s.n}</span>
              <span className="w-11 h-11 rounded-2xl bg-teal-700 text-white flex items-center justify-center"><s.icon className="w-5 h-5" /></span>
              <h3 className="mt-4 text-lg font-bold text-slate-800">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pembayaran uang sekolah */}
      <section id="pembayaran" className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5">
              Pembayaran Uang Sekolah
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">SPP Dibayar dari HP, <span className="text-teal-700">Sekolah Terima Otomatis.</span></h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg">
              Buat tagihan SPP massal per kelas dalam sekali klik. Orang tua membayar lewat portal khusus
              memakai channel favoritnya — status lunas, cicilan, dan kuitansi PDF tercatat otomatis.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              {[
                "Multi payment gateway: QRIS, Virtual Account bank, e-wallet & gerai retail",
                "Cicilan parsial + kuitansi PDF berkop sekolah yang bisa diunduh ortu",
                "Pengingat tagihan otomatis via WhatsApp & email",
                "Rekap tunggakan per kelas siap export Excel & PDF",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2.5"><Check className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" /> {x}</li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-teal-100/70 to-emerald-50 rounded-[3rem] -z-10" />
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Kuitansi Pembayaran</p>
                  <p className="text-[10px] text-slate-400 font-mono">No: QRIS-8F2A41C9</p>
                </div>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">LUNAS</span>
              </div>
              <div className="py-4 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">SPP September</span><span className="font-bold text-slate-800">{rupiah(150000)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Metode</span><span className="font-semibold text-slate-700">QRIS</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tanggal</span><span className="font-semibold text-slate-700">23/09/2026</span></div>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3">
                <QrCode className="w-10 h-10 text-teal-400" />
                <div>
                  <p className="text-white text-xs font-bold">Scan untuk bayar</p>
                  <p className="text-slate-400 text-[10px]">Semua QRIS mobile banking & e-wallet</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["QRIS", "BCA", "BNI", "BRI", "Mandiri", "OVO", "DANA", "GoPay", "ShopeePay", "Alfamart"].map((c) => (
                  <span key={c} className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Harga + kalkulator */}
      <section id="harga" className="bg-teal-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Harga Transparan per Siswa</h2>
            <p className="mt-4 text-teal-100/90 leading-relaxed text-sm sm:text-base">
              Tanpa biaya alat, tanpa biaya tersembunyi. Sekolah hanya membayar sesuai jumlah siswa aktif per bulan.
              Program pilot tersedia untuk sekolah pertama di setiap kota.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {["Semua fitur lengkap (wajah, geofence, offline, laporan)", "Pembayaran SPP online: QRIS, VA & e-wallet", "Unlimited perangkat kiosk", "Invoice & notifikasi otomatis", "Dukungan penuh selama pilot"].map((x) => (
                <li key={x} className="flex items-start gap-2.5"><Check className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" /> {x}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white text-slate-900 rounded-3xl p-7 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Simulasi Biaya Bulanan</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-4xl font-extrabold text-teal-700">{rupiah(8000)}</span>
              <span className="text-sm text-slate-500 mb-1.5">/ siswa / bulan</span>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Jumlah siswa</span>
                <span data-testid="calc-count" className="text-teal-700">{students} siswa</span>
              </div>
              <input data-testid="calc-slider" type="range" min={50} max={2500} step={25} value={students}
                onChange={(e) => setStudents(Number(e.target.value))}
                className="mt-2 w-full accent-teal-700" />
            </div>
            <div className="mt-5 bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Estimasi per bulan</span>
              <span data-testid="calc-total" className="text-2xl font-extrabold text-teal-800">{rupiah(students * 8000)}</span>
            </div>
            <a data-testid="pricing-cta" href="#kontak"
              className="mt-5 flex items-center justify-center gap-2 w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors">
              Ajukan Penawaran Sekolah <ArrowRight className="w-4 h-4" />
            </a>
            <p className="mt-3 text-center text-[11px] text-slate-400">Yayasan / multi-sekolah? Hubungi kami untuk harga khusus.</p>
          </div>
        </div>
      </section>

      {/* Kontak */}
      <section id="kontak" className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Daftarkan Sekolah Anda ke Program Pilot</h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              Isi formulir ini — tim PT. Pusaka Kreasi Mandiri akan menghubungi Anda untuk demo dan onboarding.
            </p>
            <div className="mt-8 space-y-3 text-sm text-slate-600">
              <p className="flex items-center gap-2.5"><img src="/logo.png" alt="" className="w-5 h-5 object-contain" /> <strong>RadiusGate</strong>&nbsp;— PT. Pusaka Kreasi Mandiri</p>
              <p>Email: <a className="text-teal-700 font-semibold hover:underline" href="mailto:susyanto@gmail.com">susyanto@gmail.com</a></p>
              <p>Jakarta, Indonesia</p>
            </div>
          </div>
          {sent ? (
            <div data-testid="contact-success" className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-7 h-7" /></span>
              <h3 className="mt-4 text-xl font-bold text-emerald-800">Pengajuan Terkirim!</h3>
              <p className="mt-2 text-sm text-emerald-700/80">Terima kasih. Tim kami akan segera menghubungi Anda.</p>
            </div>
          ) : (
            <form data-testid="contact-form" onSubmit={submit} className="bg-white border border-slate-200 rounded-3xl p-7 space-y-4 shadow-sm">
              <F k="school_name" label="Nama Sekolah / Yayasan" ph="contoh: SMA Negeri 1 Jakarta" testid="contact-input-school" />
              <div className="grid sm:grid-cols-2 gap-4">
                <F k="contact_person" label="Nama Penanggung Jawab" ph="Bpk/Ibu ..." testid="contact-input-name" />
                <F k="phone" label="Nomor WhatsApp" type="tel" ph="0812xxxxxxxx" testid="contact-input-phone" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <F k="email" label="Email" type="email" ph="admin@sekolah.sch.id" testid="contact-input-email" />
                <F k="student_count" label="Perkiraan Jumlah Siswa" type="number" ph="contoh: 450" testid="contact-input-count" />
              </div>
              <F k="message" label="Pesan / Kebutuhan Khusus" ph="Ceritakan kebutuhan sekolah Anda..." testid="contact-input-message" area />
              <button data-testid="contact-submit-button" disabled={busy}
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors disabled:opacity-50">
                {busy ? "Mengirim..." : "Kirim Pengajuan Pilot"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo-white.png" alt="RadiusGate" className="w-11 h-11 object-contain" />
            <div>
              <p className="text-white font-bold text-sm">RadiusGate</p>
              <p className="text-xs">Gerbang Absensi Digital Sekolah Masa Kini.</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold">
            <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
            <a href="#cara-kerja" className="hover:text-white transition-colors">Cara Kerja</a>
            <a href="#harga" className="hover:text-white transition-colors">Harga</a>
            <Link to="/login" className="hover:text-white transition-colors">Masuk Portal</Link>
            <Link to="/kiosk" className="hover:text-white transition-colors">Mode Kiosk</Link>
          </nav>
          <p className="text-[11px] text-slate-500">© 2026 PT. Pusaka Kreasi Mandiri.</p>
        </div>
      </footer>

      <style>{`@keyframes scanline { 0%,100% { top: 15%; } 50% { top: 80%; } }`}</style>
    </div>
  );
}
