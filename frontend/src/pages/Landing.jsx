import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { errMsg } from "@/api";
import {
  ScanFace, MapPin, WifiOff, Tablet, Receipt, Send, Languages, Volume2,
  UserPlus, Camera, FileCheck, MonitorSmartphone, ArrowRight, Check,
  Wallet, QrCode, BellRing, FileText, MessageCircle, Nfc, Keyboard, Building2, GraduationCap, ChevronDown,
} from "lucide-react";

const FEATURES = [
  { icon: ScanFace, badge: "Keamanan AI", title: "Face Recognition ArcFace + Liveness", desc: "AI mengenali wajah siswa & guru dalam hitungan detik, dan menolak kecurangan memakai foto/video HP.", wide: true },
  { icon: Nfc, badge: "Kartu RFID", title: "Absen Tap Kartu RFID/NFC", desc: "Tempel kartu di reader USB/OTG — langsung tercatat tanpa menyentuh layar. Tersedia mode registrasi kartu massal dari kiosk.", wide: true },
  { icon: QrCode, badge: "QR Auto-Deteksi", title: "Kartu QR Code Otomatis", desc: "QR unik anti-palsu dibuat otomatis untuk setiap siswa/guru/karyawan, terdeteksi kamera kiosk tanpa tombol, dan bisa dicetak massal per kelas dalam 1 PDF.", wide: true },
  { icon: Keyboard, badge: "Cadangan", title: "NIS/NIP Manual + Keypad Layar", desc: "Tanpa wajah/kartu? Ketik NIS atau NIP lewat keypad angka besar di layar kiosk — lengkap bunyi klik & foto profil konfirmasi." },
  { icon: MapPin, badge: "Akurasi Lokasi", title: "GPS Geofence", desc: "Absensi hanya sah di dalam radius area sekolah yang ditentukan admin." },
  { icon: WifiOff, badge: "Anti Gangguan", title: "Offline-First Sync", desc: "Internet sekolah down? Absensi tetap jalan dan tersinkron otomatis saat online kembali." },
  { icon: Tablet, badge: "Hemat Biaya", title: "Kiosk Web di HP/Tablet", desc: "Ubah tablet atau HP bekas menjadi mesin absensi canggih — tanpa beli hardware mahal." },
  { icon: MonitorSmartphone, badge: "Bebas Pilih", title: "Sekolah Menentukan Metodenya Sendiri", desc: "Wajah, tap kartu RFID, scan QR, atau NIS manual — semua modul tersedia dalam satu kiosk dan bisa dipakai bersamaan sesuai kebijakan sekolah." },
  { icon: Receipt, badge: "Per-Siswa", title: "Billing Otomatis", desc: "Tagihan dihitung transparan dari jumlah siswa aktif setiap bulan." },
  { icon: Wallet, badge: "SPP Online", title: "Pembayaran Uang Sekolah", desc: "Tagihan SPP & cicilan dengan portal orang tua, kuitansi PDF otomatis, dan pengingat WhatsApp." },
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
  { src: "/slides/kantor-absen.jpg", title: "Karyawan absen di kiosk lobi kantor", sub: "Wajah, kartu RFID, atau QR — tanpa alat khusus" },
  { src: "/slides/pabrik-absen.jpg", title: "Clock-in shift pabrik pagi/siang/malam", sub: "Jam shift per karyawan, telat & lembur dihitung otomatis" },
  { src: "/slides/dashboard.jpg", title: "Admin & HRD memantau laporan real-time", sub: "Rekap harian, keterlambatan, SPP & penggajian satu dasbor" },
];

function useInView() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

const WA_MSGS = {
  default: "Halo RadiusGate, saya ingin bertanya tentang program pilot sekolah",
  solusi: "Halo RadiusGate, saya ingin tahu perbedaan paket Sekolah dan Perusahaan",
  fitur: "Halo RadiusGate, saya ingin tahu lebih detail fitur-fiturnya",
  "cara-kerja": "Halo RadiusGate, saya ingin tahu cara penerapannya di sekolah kami",
  absensi: "Halo RadiusGate, saya ingin tahu tentang absensi siswa",
  "absensi-perusahaan": "Halo RadiusGate, saya ingin tahu tentang absensi karyawan untuk perusahaan/pabrik",
  faq: "Halo RadiusGate, saya punya pertanyaan yang belum terjawab di FAQ",
  admin: "Halo RadiusGate, saya ingin tahu tentang dashboard admin",
  pembayaran: "Halo RadiusGate, saya ingin tahu tentang pembayaran SPP online",
  ortu: "Halo RadiusGate, saya ingin tahu tentang portal orang tua",
  harga: "Halo RadiusGate, saya ingin tanya harga RadiusGate",
  kontak: "Halo RadiusGate, saya ingin mendaftar program pilot sekolah",
};

const FAQS = [
  { q: "Apakah harus membeli mesin absensi khusus yang mahal?", a: "Tidak. RadiusGate berjalan di tablet, HP, atau komputer biasa sebagai kiosk. Untuk kartu RFID cukup reader USB standar (sekitar Rp 50 ribu) yang plug & play — tanpa instalasi driver apa pun." },
  { q: "Bagaimana jika internet di lokasi mati?", a: "Kiosk tetap berfungsi penuh dalam mode offline. Semua absensi tersimpan aman di perangkat dan otomatis tersinkron ke server begitu internet kembali tersambung." },
  { q: "Apakah benar-benar anti titip absen?", a: "Ya. Verifikasi wajah ArcFace dengan liveness detection menolak foto dan video HP, ditambah GPS geofence yang memastikan orang tersebut benar-benar berada di radius lokasi yang diizinkan." },
  { q: "Apakah mendukung shift malam untuk pabrik?", a: "Mendukung penuh. Shift pagi, siang, dan malam dapat diatur per karyawan dengan jam berbeda-beda. Keterlambatan dan lembur dihitung otomatis berdasarkan jam shift masing-masing karyawan." },
  { q: "Bagaimana skema biayanya?", a: "Sekolah: Rp 8.000 per siswa per bulan. Perusahaan: Rp 7.500 (Paket Basic) atau Rp 12.500 (Paket Pro + Payroll) per karyawan per bulan. Semua diawali trial gratis 14 hari tanpa kartu kredit." },
  { q: "Apakah bisa menghitung lembur dan gaji otomatis?", a: "Bisa, di Paket Pro perusahaan. Lembur dihitung otomatis dari jam pulang, langsung masuk ke rekap penggajian, dan slip gaji PDF dapat dicetak per karyawan setiap bulan." },
  { q: "Apakah data kami aman dan tidak tercampur organisasi lain?", a: "Sangat aman. Setiap organisasi berdiri sebagai tenant terpisah dengan data yang terisolasi penuh. Tersedia juga opsi self-host di server milik Anda sendiri untuk kontrol data maksimal." },
  { q: "Bagaimana cara memulai implementasi?", a: "Klik 'Daftar Trial Gratis', isi formulir 1 menit, dan sistem langsung siap dipakai. Tim kami akan membantu onboarding, impor data siswa/karyawan, hingga pairing kiosk pertama Anda." },
];

const rupiah = (n) => "Rp " + n.toLocaleString("id-ID");

const PORTAL_BASE = process.env.REACT_APP_PORTAL_URL || "";
const portalUrl = (path) => (PORTAL_BASE ? `${PORTAL_BASE}${path}` : path);

function PortalLink({ to, children, ...props }) {
  if (PORTAL_BASE) {
    return <a href={portalUrl(to)} {...props}>{children}</a>;
  }
  return <Link to={to} {...props}>{children}</Link>;
}

export default function Landing() {
  const [students, setStudents] = useState(300);
  const [priceTab, setPriceTab] = useState("company");
  const [employees, setEmployees] = useState(50);
  const [empPlan, setEmpPlan] = useState("pro");
  const [form, setForm] = useState({ school_name: "", contact_person: "", email: "", phone: "", student_count: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [slide, setSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const [attRef, attIn] = useInView();
  const [featRef, featIn] = useInView();
  const [stepRef, stepIn] = useInView();
  const [priceRef, priceIn] = useInView();
  const [contactRef, contactIn] = useInView();
  const [admRef, admIn] = useInView();
  const [ortuRef, ortuIn] = useInView();

  // deep-link harga: #harga-perusahaan / #harga-sekolah (bisa di-share via WA)
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash;
      if (h === "#harga-perusahaan" || h === "#harga-sekolah") {
        setPriceTab(h === "#harga-perusahaan" ? "company" : "school");
        setTimeout(() => document.getElementById("harga")?.scrollIntoView({ behavior: "smooth" }), 400);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const pickPriceTab = (v) => {
    setPriceTab(v);
    window.history.replaceState(null, "", v === "company" ? "#harga-perusahaan" : "#harga-sekolah");
  };

  const [waMsg, setWaMsg] = useState(WA_MSGS.default);
  useEffect(() => {
    const ids = ["solusi", "fitur", "cara-kerja", "absensi", "absensi-perusahaan", "admin", "pembayaran", "ortu", "harga", "faq", "kontak"];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setWaMsg(WA_MSGS[e.target.id] || WA_MSGS.default); });
    }, { rootMargin: "-40% 0px -40% 0px" });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
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
      <style>{`
        .att-anim { opacity: 0; }
        .att-anim.att-in { animation: attRowIn .5s cubic-bezier(.22,.8,.36,1) forwards; }
        @keyframes attRowIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .att-anim { opacity: 1; } .att-anim.att-in { animation: none; } }
      `}</style>
      {/* Structured data: Organization + SoftwareApplication */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "name": "PT. Pusaka Kreasi Mandiri",
              "url": "https://radiusgate.id",
              "logo": "https://radiusgate.id/logo.png",
              "email": "admin@radiusgate.id",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Telaga Golf Sawangan, Cluster Belanda Blok E10 No. 60-61",
                "addressLocality": "Sawangan, Depok",
                "addressRegion": "Jawa Barat",
                "postalCode": "16551",
                "addressCountry": "ID",
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+62-888-8200-999",
                "contactType": "sales",
                "availableLanguage": ["Indonesian", "English"],
              },
            },
            {
              "@type": "SoftwareApplication",
              "name": "RadiusGate",
              "url": "https://radiusgate.id",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Platform absensi digital berbasis AI face recognition ArcFace, RFID, QR code, dan GPS geofence untuk sekolah dan perusahaan. Termasuk portal orang tua, SPP online, shift kerja, lembur, penggajian, dan surat peringatan otomatis.",
              "offers": [
                { "@type": "Offer", "name": "Paket Sekolah", "price": "8000", "priceCurrency": "IDR", "description": "Per siswa per bulan" },
                { "@type": "Offer", "name": "Paket Basic Perusahaan", "price": "7500", "priceCurrency": "IDR", "description": "Per karyawan per bulan" },
                { "@type": "Offer", "name": "Paket Pro + Payroll Perusahaan", "price": "12500", "priceCurrency": "IDR", "description": "Per karyawan per bulan" },
              ],
            },
          ],
        }),
      }} />
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-teal-100/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <a href="#" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="RadiusGate" className="w-9 h-9 object-contain" />
            <span className="font-extrabold text-xl tracking-tight">RadiusGate</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a data-testid="nav-link-fitur" href="#fitur" className="hover:text-teal-700 transition-colors">Fitur</a>
            <a data-testid="nav-link-solusi" href="#solusi" className="hover:text-teal-700 transition-colors">Solusi</a>
            <a data-testid="nav-link-cara-kerja" href="#cara-kerja" className="hover:text-teal-700 transition-colors">Cara Kerja</a>
            <a data-testid="nav-link-absensi" href="#absensi" className="hover:text-teal-700 transition-colors">Absensi</a>
            <a data-testid="nav-link-pembayaran" href="#pembayaran" className="hover:text-teal-700 transition-colors">Pembayaran</a>
            <a data-testid="nav-link-harga" href="#harga" className="hover:text-teal-700 transition-colors">Harga</a>
            <a data-testid="nav-link-faq" href="#faq" className="hover:text-teal-700 transition-colors">FAQ</a>
            <a data-testid="nav-link-kontak" href="#kontak" className="hover:text-teal-700 transition-colors">Kontak</a>
          </nav>
          <div className="flex items-center gap-2">
            <PortalLink data-testid="nav-kiosk-button" to="/kiosk"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border border-teal-700 text-teal-700 hover:bg-teal-50 transition-colors">
              <MonitorSmartphone className="w-4 h-4" /> Mode Kiosk
            </PortalLink>
            <PortalLink data-testid="nav-login-button" to="/login"
              className="text-xs font-bold px-4 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 transition-colors">
              Masuk Portal
            </PortalLink>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5">
            Solusi Absensi AI Multi-Tenant untuk Sekolah & Perusahaan
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08]">
            Gerbang Absensi Digital <span className="text-teal-700">Masa Kini.</span>
          </h1>
          <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-lg">
            Presensi siswa, guru & karyawan berbasis pengenalan wajah ArcFace, liveness anti-spoofing, dan GPS geofence.
            SPP online untuk sekolah, shift & penggajian untuk perusahaan — tanpa alat khusus, cukup HP atau tablet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a data-testid="hero-cta-pilot" href="#kontak"
              className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm px-6 py-3.5 rounded-2xl transition-colors shadow-lg shadow-teal-700/20">
              Daftar Pilot Sekolah <ArrowRight className="w-4 h-4" />
            </a>
            <PortalLink data-testid="hero-cta-kiosk-demo" to="/kiosk"
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-teal-600 hover:text-teal-700 font-bold text-sm px-6 py-3.5 rounded-2xl transition-colors">
              Coba Mode Kiosk
            </PortalLink>
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
          <p className="text-slate-500 text-sm sm:text-base text-center mt-3 max-w-2xl mx-auto">Satu platform untuk presensi wajah, kartu RFID, QR code, NIS manual, geofence GPS, laporan, sampai penagihan otomatis — sekolah bebas memilih metode yang dipakai.</p>
          <div ref={featRef} className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title} data-testid={`feature-${f.title.slice(0, 12).replace(/\W+/g, "-").toLowerCase()}`} style={{ animationDelay: `${i * 90}ms` }}
                className={`att-anim ${featIn ? "att-in" : ""} ${f.wide ? "lg:col-span-2" : ""} group bg-slate-50 hover:bg-teal-50/60 border border-slate-100 hover:border-teal-200 rounded-2xl p-6 transition-colors`}>
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
        <div ref={stepRef} className="mt-12 grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ animationDelay: `${i * 140}ms` }} className={`att-anim ${stepIn ? "att-in" : ""} relative bg-white border border-slate-200 rounded-2xl p-6`}>
              <span className="text-4xl font-extrabold text-teal-100 absolute top-4 right-5">{s.n}</span>
              <span className="w-11 h-11 rounded-2xl bg-teal-700 text-white flex items-center justify-center"><s.icon className="w-5 h-5" /></span>
              <h3 className="mt-4 text-lg font-bold text-slate-800">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contoh absensi siswa */}
      <section id="absensi" data-testid="absensi-section" className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5">
              Absensi Siswa Real-Time
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Setiap Siswa Absen, <span className="text-teal-700">Tercatat Detik Itu Juga.</span></h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg">
              Begitu wajah siswa terverifikasi di kiosk, kehadirannya langsung muncul di dashboard admin
              dan portal orang tua — lengkap dengan jam masuk, menit keterlambatan, dan status izin/sakit.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              {[
                "Status otomatis: Hadir, Telat (plus menit keterlambatan), Izin & Sakit",
                "Notifikasi WhatsApp ke orang tua setiap anak absen di kiosk",
                "Rekap harian & bulanan per siswa / per kelas, siap export Excel & PDF",
                "Absensi per mata pelajaran oleh guru mapel dari portal guru",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2.5"><Check className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" /> {x}</li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-teal-100/70 to-emerald-50 rounded-[3rem] -z-10" />
            <div ref={attRef} data-testid="absensi-mock-card" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Absensi Hari Ini</p>
                  <p className="text-[10px] text-slate-400">SMA Nusantara · Rabu, 23/09/2026</p>
                </div>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                  <ScanFace className="w-3 h-3" /> Wajah + GPS
                </span>
              </div>
              <div className="py-2 divide-y divide-slate-100 text-xs">
                {[
                  ["Arto Rahman Sadad", "X TAV", "06:58", "Hadir", "bg-emerald-100 text-emerald-700"],
                  ["Nadia Putri Anjani", "X TAV", "07:02", "Hadir", "bg-emerald-100 text-emerald-700"],
                  ["Bima Prasetyo", "XI TKJ", "07:14", "Telat +4m", "bg-amber-100 text-amber-700"],
                  ["Salsabila Zahra", "XII TB", "—", "Izin", "bg-sky-100 text-sky-700"],
                  ["Dimas Anggara", "X TAV", "—", "Sakit", "bg-red-100 text-red-600"],
                ].map(([nama, kelas, jam, st, cls], i) => (
                  <div key={nama} className={`att-anim ${attIn ? "att-in" : ""} flex items-center gap-3 py-2.5`} style={{ animationDelay: `${i * 120}ms` }}>
                    <span className="w-8 h-8 rounded-full bg-teal-700/10 text-teal-800 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      {nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{nama}</p>
                      <p className="text-[10px] text-slate-400">Kelas {kelas}</p>
                    </div>
                    <span className="font-mono text-slate-500">{jam}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{st}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                {[["Hadir", "1.128", "bg-emerald-50 text-emerald-700 border-emerald-100"],
                  ["Telat", "34", "bg-amber-50 text-amber-700 border-amber-100"],
                  ["Izin", "12", "bg-sky-50 text-sky-700 border-sky-100"],
                  ["Sakit", "8", "bg-red-50 text-red-600 border-red-100"]].map(([label, val, cls], ci) => (
                  <span key={label} className={`att-anim ${attIn ? "att-in" : ""} text-[10px] font-bold border rounded-full px-2.5 py-1 ${cls}`} style={{ animationDelay: `${600 + ci * 90}ms` }}>{label} {val}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contoh absensi karyawan (perusahaan) */}
      <section id="absensi-perusahaan" data-testid="absensi-perusahaan-section" className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-slate-200/70 to-emerald-50 rounded-[3rem] -z-10" />
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
                <img src="/logo-white.png" alt="" className="w-8 h-8 object-contain" />
                <div>
                  <p className="text-xs font-bold text-white">Absensi Karyawan Hari Ini</p>
                  <p className="text-[10px] text-slate-400">PT Maju Bersama · Shift Pagi</p>
                </div>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
                  <Nfc className="w-3 h-3" /> RFID + Shift
                </span>
              </div>
              <div className="py-2 divide-y divide-white/5 text-xs">
                {[
                  ["Rina Marlina", "Produksi · Shift Pagi", "06:52", "Hadir", "bg-emerald-500/15 text-emerald-300"],
                  ["Budi Hartono", "Gudang · Shift Pagi", "07:03", "Hadir", "bg-emerald-500/15 text-emerald-300"],
                  ["Joko Santoso", "Produksi · Shift Pagi", "07:21", "Telat +21m", "bg-amber-500/15 text-amber-300"],
                  ["Siti Rahayu", "HRD · Shift Pagi", "17:42", "Lembur +2j", "bg-teal-500/15 text-teal-300"],
                  ["Agus Wijaya", "Produksi · Shift Malam", "—", "Cuti", "bg-sky-500/15 text-sky-300"],
                ].map(([nama, dept, jam, st, cls]) => (
                  <div key={nama} className="flex items-center gap-3 py-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      {nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate">{nama}</p>
                      <p className="text-[10px] text-slate-400">{dept}</p>
                    </div>
                    <span className="font-mono text-slate-400">{jam}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{st}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                {[["Hadir", "128", "bg-emerald-500/10 text-emerald-300 border-emerald-400/20"],
                  ["Telat", "6", "bg-amber-500/10 text-amber-300 border-amber-400/20"],
                  ["Lembur", "12", "bg-teal-500/10 text-teal-300 border-teal-400/20"],
                  ["Shift Malam", "20", "bg-sky-500/10 text-sky-300 border-sky-400/20"]].map(([label, val, cls]) => (
                  <span key={label} className={`text-[10px] font-bold border rounded-full px-2.5 py-1 ${cls}`}>{label} {val}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
              Absensi Karyawan Real-Time
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Setiap Karyawan Clock-In, <span className="text-emerald-600">HRD Tahu Detik Itu Juga.</span></h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg">
              Kantor maupun pabrik: karyawan absen via wajah, kartu RFID, atau QR di kiosk — keterlambatan dihitung
              dari jam shift masing-masing, lembur dan penggajian terekap otomatis.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              {[
                "Shift kerja pagi/siang/malam dengan jam berbeda per karyawan",
                "Lembur otomatis dari jam pulang, langsung masuk rekap penggajian",
                "SP1/SP2/SP3 otomatis disarankan dari jumlah keterlambatan",
                "Rekap harian & bulanan per departemen, siap export Excel & PDF",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2.5"><Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" /> {x}</li>
              ))}
            </ul>
            <Link data-testid="absensi-company-cta" to="/daftar?type=company" className="mt-7 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3 rounded-2xl transition-colors">
              Coba untuk Perusahaan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Dashboard admin */}
      <section id="admin" data-testid="admin-section" className="max-w-6xl mx-auto px-4 py-20">
        <div ref={admRef} className="grid lg:grid-cols-2 gap-12 items-center">
          <div className={`att-anim ${admIn ? "att-in" : ""} relative mx-auto w-full max-w-md order-2 lg:order-1`}>
            <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-teal-100/70 to-emerald-50 rounded-[3rem] -z-10" />
            <div data-testid="admin-mock-card" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Dashboard Admin</p>
                  <p className="text-[10px] text-slate-400">SMA Nusantara · Real-time</p>
                </div>
                <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 py-4">
                {[["Hadir Hari Ini", "1.128", "text-emerald-600"], ["Telat", "34", "text-amber-600"],
                  ["Izin & Sakit", "20", "text-sky-600"], ["SPP Terkumpul", "87%", "text-teal-700"]].map(([label, val, color]) => (
                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                    <p className={`text-lg font-extrabold ${color}`}>{val}</p>
                    <p className="text-[10px] font-semibold text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Kehadiran 7 Hari Terakhir</p>
                <div className="flex items-end gap-2 h-20">
                  {[45, 62, 55, 78, 92, 70, 38].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-t-md ${i === 4 ? "bg-teal-600" : "bg-teal-200"}`} style={{ height: `${h}%` }} />
                      <span className="text-[8px] font-bold text-slate-400">{["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className={`att-anim ${admIn ? "att-in" : ""} order-1 lg:order-2`} style={{ animationDelay: "150ms" }}>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5">
              Dashboard Admin
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Semua Data Sekolah, <span className="text-teal-700">Satu Layar.</span></h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg">
              Admin memantau kehadiran siswa, guru, dan karyawan secara real-time — dari statistik harian
              sampai rekap SPP, semuanya tersaji dalam satu dasbor yang rapi.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              {[
                "Statistik kehadiran siswa, guru & karyawan real-time",
                "Kelengkapan data orang tua per kelas dalam satu kartu",
                "Laporan harian & bulanan siap export Excel / PDF",
                "Kelola guru, siswa, karyawan, lembur & penggajian",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2.5"><Check className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" /> {x}</li>
              ))}
            </ul>
          </div>
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

      {/* Dua produk: Sekolah & Perusahaan */}
      <section id="solusi" data-testid="solutions-section" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5">Satu Platform, Dua Solusi</span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Pilih Sesuai Organisasi Anda</h2>
        </div>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div data-testid="solution-school" className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-xl hover:border-teal-200 transition-all">
            <span className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center"><GraduationCap className="w-6 h-6" /></span>
            <h3 className="mt-4 text-xl font-extrabold">RadiusGate untuk Sekolah</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">Absensi siswa & guru, portal orang tua, pembayaran SPP online, dan rekap per mata pelajaran.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {["Wajah, RFID, QR & NIS manual", "Portal orang tua + notifikasi WA", "SPP online & kuitansi PDF"].map((x) => (
                <li key={x} className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" /> {x}</li>
              ))}
            </ul>
            <Link data-testid="solution-school-cta" to="/daftar" className="mt-6 flex items-center justify-center gap-2 w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm py-3 rounded-2xl transition-colors">
              Daftar Trial Sekolah <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div data-testid="solution-company" className="bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-sm hover:shadow-xl hover:border-slate-700 transition-all text-white">
            <span className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center"><Building2 className="w-6 h-6" /></span>
            <h3 className="mt-4 text-xl font-extrabold">RadiusGate untuk Perusahaan</h3>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">Absensi karyawan kantor & pabrik: shift kerja, lembur, penggajian, hingga surat peringatan otomatis (SP1–SP3).</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {["Shift pagi/siang/malam per karyawan", "Lembur & penggajian otomatis", "SP1/SP2/SP3 dari data telat"].map((x) => (
                <li key={x} className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" /> {x}</li>
              ))}
            </ul>
            <Link data-testid="solution-company-cta" to="/daftar?type=company" className="mt-6 flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm py-3 rounded-2xl transition-colors">
              Daftar Trial Perusahaan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Harga + kalkulator */}
      {/* Portal orang tua */}
      <section id="ortu" data-testid="ortu-section" className="max-w-6xl mx-auto px-4 py-20">
        <div ref={ortuRef} className="grid lg:grid-cols-2 gap-12 items-center">
          <div className={`att-anim ${ortuIn ? "att-in" : ""} relative mx-auto w-full max-w-[300px] order-2 lg:order-1`}>
            <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-teal-100/70 to-emerald-50 rounded-[3rem] -z-10" />
            <div data-testid="parent-mock-card" className="bg-white border border-slate-200 rounded-[2.5rem] p-4 shadow-2xl">
              <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
                <p className="text-[11px] font-bold text-slate-800">Portal Orang Tua</p>
              </div>
              <div className="mt-3 bg-teal-800 text-white rounded-2xl p-3.5 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-white/20 text-[10px] font-extrabold flex items-center justify-center shrink-0">AR</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Arto Rahman Sadad</p>
                  <p className="text-[9px] text-teal-200">Kelas X TAV · NIS 696969</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                {[["18", "Hadir", "text-emerald-600"], ["2", "Telat", "text-amber-600"], ["0", "Sakit", "text-red-500"], ["2", "Izin", "text-sky-600"]].map(([v, l, c]) => (
                  <div key={l} className="bg-slate-50 border border-slate-100 rounded-xl py-1.5">
                    <p className={`text-sm font-extrabold ${c}`}>{v}</p>
                    <p className="text-[8px] font-semibold text-slate-400">{l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 border border-slate-200 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-800">SPP September</p>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Cicilan</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: "35%" }} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[9px] text-slate-400">Sisa <span className="font-bold text-amber-600">Rp 975.000</span></p>
                  <span className="text-[9px] font-bold text-white bg-teal-700 rounded-lg px-2.5 py-1">Bayar</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-around">
                {[[ScanFace, true], [Wallet, false], [FileText, false], [UserPlus, false]].map(([Icon, active], i) => (
                  <span key={i} className={`flex items-center justify-center w-8 h-8 rounded-full ${active ? "bg-teal-700 text-white" : "text-slate-300"}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className={`att-anim ${ortuIn ? "att-in" : ""} order-1 lg:order-2`} style={{ animationDelay: "150ms" }}>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5">
              Portal Orang Tua
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Orang Tua Memantau <span className="text-teal-700">dari Genggaman.</span></h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg">
              Tanpa install aplikasi — orang tua cukup login dengan nomor WhatsApp di browser HP
              untuk memantau kehadiran dan membayar tagihan anaknya.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              {[
                "Kehadiran harian + rekap bulanan (Hadir/Telat/Sakit/Izin)",
                "Tagihan SPP dengan progress cicilan & bayar dari HP",
                "Ajukan izin/sakit anak langsung dari portal",
                "Kuitansi PDF berkop sekolah bisa diunduh kapan saja",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2.5"><Check className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" /> {x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Harga */}
      <section id="harga" data-testid="pricing-section" className="bg-slate-900 text-white py-20">
        <div ref={priceRef} className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-400/20 rounded-full px-3 py-1.5">
              Harga Transparan Tanpa Biaya Tersembunyi
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Pilih Paket Sesuai Kebutuhan</h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base">
              Tanpa biaya beli mesin absensi mahal. Cukup gunakan tablet/HP yang sudah ada atau reader RFID standar.
            </p>

            {/* Toggle Sekolah / Perusahaan */}
            <div data-testid="pricing-tab-toggle" className="mt-8 inline-flex p-1.5 bg-slate-800 rounded-2xl border border-slate-700">
              <button type="button" data-testid="pricing-tab-company" onClick={() => pickPriceTab("company")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${priceTab === "company" ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
                <Building2 className="w-4 h-4" /> Untuk Perusahaan & Pabrik
              </button>
              <button type="button" data-testid="pricing-tab-school" onClick={() => pickPriceTab("school")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${priceTab === "school" ? "bg-teal-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
                <GraduationCap className="w-4 h-4" /> Untuk Sekolah
              </button>
            </div>
          </div>

          {/* Pricing Perusahaan */}
          {priceTab === "company" ? (
            <div className="mt-12 space-y-10">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Free Trial */}
                <div data-testid="plan-free" className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-600 transition-colors">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-700/60 rounded-full px-2.5 py-1">Uji Coba</span>
                    <h3 className="mt-4 text-xl font-bold text-white">Trial 14 Hari</h3>
                    <p className="mt-1 text-xs text-slate-400">Cocok untuk mencoba seluruh fitur sebelum berlangganan.</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">Rp 0</span>
                      <span className="text-xs text-slate-400">/ 14 hari penuh</span>
                    </div>
                    <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                      {["Full akses semua fitur Pro", "Hingga 50 karyawan", "Presensi Wajah, RFID & QR", "Tanpa perlu kartu kredit"].map((x) => (
                        <li key={x} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> {x}</li>
                      ))}
                    </ul>
                  </div>
                  <Link data-testid="plan-free-cta" to="/daftar?type=company" className="mt-8 flex items-center justify-center gap-1.5 w-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs py-3 rounded-xl transition-colors">
                    Daftar Trial Gratis <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Paket Basic */}
                <div data-testid="plan-basic" className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-600 transition-colors">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 rounded-full px-2.5 py-1">UMKM / Perkantoran</span>
                    <h3 className="mt-4 text-xl font-bold text-white">Paket Basic</h3>
                    <p className="mt-1 text-xs text-slate-400">Absensi akurat anti titip absen untuk kantor & toko.</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">Rp 7.500</span>
                      <span className="text-xs text-slate-400">/ karyawan / bulan</span>
                    </div>
                    <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                      {[
                        "Presensi Wajah ArcFace + Liveness",
                        "Kartu RFID & QR Code Scanner",
                        "Geofencing radius kantor (GPS)",
                        "Manajemen Shift Pagi/Siang/Malam",
                        "Rekap harian & bulanan (Excel/PDF)",
                        "Unlimited perangkat Kiosk",
                      ].map((x) => (
                        <li key={x} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> {x}</li>
                      ))}
                    </ul>
                  </div>
                  <Link data-testid="plan-basic-cta" to="/daftar?type=company" className="mt-8 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-colors">
                    Pilih Paket Basic <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Paket Pro */}
                <div data-testid="plan-pro" className="relative bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-emerald-400 rounded-3xl p-6 flex flex-col justify-between shadow-2xl shadow-emerald-500/10">
                  <span className="absolute -top-3 right-6 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400 text-slate-950 rounded-full px-3 py-1 shadow">
                    Paling Lengkap · Populer
                  </span>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 rounded-full px-2.5 py-1">Pabrik & Korporat</span>
                    <h3 className="mt-4 text-xl font-bold text-white">Paket Pro + Payroll</h3>
                    <p className="mt-1 text-xs text-slate-400">Solusi HR lengkap dari absensi, lembur, sampai SP & slip gaji.</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-emerald-400">Rp 12.500</span>
                      <span className="text-xs text-slate-400">/ karyawan / bulan</span>
                    </div>
                    <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                      {[
                        "Semua fitur di Paket Basic",
                        "Hitung Lembur Otomatis dari jam pulang",
                        "Modul Penggajian / Payroll & Slip Gaji PDF",
                        "Surat Peringatan Otomatis (SP1, SP2, SP3)",
                        "Multi-Departemen & Multi-Lokasi Cabang",
                        "Support Prioritas WhatsApp & Onboarding",
                      ].map((x) => (
                        <li key={x} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> <strong>{x}</strong></li>
                      ))}
                    </ul>
                  </div>
                  <Link data-testid="plan-pro-cta" to="/daftar?type=company" className="mt-8 flex items-center justify-center gap-1.5 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/25">
                    Mulai Trial Paket Pro <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Kalkulator Simulasi Biaya Perusahaan */}
              <div data-testid="company-calc-card" className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">Simulasi Biaya Bulanan Perusahaan</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Geser jumlah karyawan untuk melihat estimasi investasi.</p>
                  </div>
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                    <button type="button" data-testid="calc-plan-basic" onClick={() => setEmpPlan("basic")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${empPlan === "basic" ? "bg-emerald-600 text-white" : "text-slate-400"}`}>
                      Basic (Rp 7.500)
                    </button>
                    <button type="button" data-testid="calc-plan-pro" onClick={() => setEmpPlan("pro")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${empPlan === "pro" ? "bg-emerald-500 text-slate-950" : "text-slate-400"}`}>
                      Pro (Rp 12.500)
                    </button>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-slate-300">Jumlah karyawan aktif</span>
                    <span data-testid="calc-emp-count" className="text-emerald-400 text-base font-extrabold">{employees} karyawan</span>
                  </div>
                  <input data-testid="calc-emp-slider" type="range" min={10} max={500} step={5} value={employees}
                    onChange={(e) => setEmployees(Number(e.target.value))}
                    className="mt-2 w-full accent-emerald-500" />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>10 karyawan</span>
                    <span>250 karyawan</span>
                    <span>500+ karyawan</span>
                  </div>
                </div>
                <div className="mt-6 bg-slate-900 border border-slate-700/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-400 block">Estimasi Investasi Bulanan ({empPlan === "pro" ? "Paket Pro" : "Paket Basic"})</span>
                    <span data-testid="calc-emp-total" className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                      {rupiah(employees * (empPlan === "pro" ? 12500 : 7500))}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">/ bulan</span>
                  </div>
                  <Link data-testid="calc-emp-cta" to="/daftar?type=company"
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl transition-colors">
                    Daftar Sekarang <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Pricing Sekolah */
            <div className="mt-12 grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Paket Lengkap Sekolah</h3>
                <p className="mt-3 text-slate-300 leading-relaxed text-sm">
                  Satu harga terjangkau per siswa per bulan. Semua modul sekolah aktif tanpa biaya tambahan:
                  absensi wajah, RFID, portal orang tua, sampai penagihan SPP online.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-slate-200">
                  {[
                    "Semua metode presensi: Wajah, RFID, QR & NIS manual",
                    "Portal Orang Tua untuk pantau absensi & bayar tagihan",
                    "Pembayaran SPP online (QRIS, VA Bank & E-Wallet)",
                    "Rekap absensi per mata pelajaran oleh guru mapel",
                    "Unlimited perangkat kiosk tablet di gerbang",
                    "Dukungan teknis penuh selama masa pilot",
                  ].map((x) => (
                    <li key={x} className="flex items-start gap-2.5"><Check className="w-4 h-4 mt-0.5 text-teal-400 shrink-0" /> {x}</li>
                  ))}
                </ul>
              </div>
              <div data-testid="pricing-school-card" className="bg-white text-slate-900 rounded-3xl p-7 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Simulasi Biaya Sekolah</p>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-extrabold text-teal-700">{rupiah(8000)}</span>
                  <span className="text-sm text-slate-500 mb-1.5">/ siswa / bulan</span>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Jumlah siswa aktif</span>
                    <span data-testid="calc-count" className="text-teal-700 font-bold">{students} siswa</span>
                  </div>
                  <input data-testid="calc-slider" type="range" min={50} max={2500} step={25} value={students}
                    onChange={(e) => setStudents(Number(e.target.value))}
                    className="mt-2 w-full accent-teal-700" />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>50 siswa</span>
                    <span>1.250 siswa</span>
                    <span>2.500 siswa</span>
                  </div>
                </div>
                <div className="mt-5 bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Estimasi per bulan</span>
                  <span data-testid="calc-total" className="text-2xl font-extrabold text-teal-800">{rupiah(students * 8000)}</span>
                </div>
                <Link data-testid="pricing-school-cta" to="/daftar"
                  className="mt-5 flex items-center justify-center gap-2 w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors">
                  Daftar Trial Sekolah Gratis <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="mt-3 text-center text-[11px] text-slate-400">Yayasan / multi-sekolah? Hubungi kami untuk penawaran khusus.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" data-testid="faq-section" className="max-w-4xl mx-auto px-4 py-20">
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": FAQS.map((f) => ({
              "@type": "Question",
              "name": f.q,
              "acceptedAnswer": { "@type": "Answer", "text": f.a },
            })),
          }),
        }} />
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5">FAQ</span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Pertanyaan yang Sering Diajukan</h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base">Masih ragu? Temukan jawabannya di sini, atau hubungi tim kami via WhatsApp.</p>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} data-testid={`faq-item-${i}`} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-teal-200 transition-colors">
              <button type="button" data-testid={`faq-q-${i}`} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                <span className="text-sm font-bold text-slate-800">{f.q}</span>
                <ChevronDown className={`w-4 h-4 text-teal-600 shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              <div className={`grid transition-all duration-300 ${openFaq === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <p data-testid={`faq-a-${i}`} className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Kontak */}
      <section id="kontak" className="max-w-6xl mx-auto px-4 py-20">
        <div ref={contactRef} className="grid lg:grid-cols-2 gap-12">
          <div className={`att-anim ${contactIn ? "att-in" : ""}`}>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Daftarkan Sekolah Anda ke Program Pilot</h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              Isi formulir ini — tim PT. Pusaka Kreasi Mandiri akan menghubungi Anda untuk demo dan onboarding.
            </p>
            <div className="mt-8 space-y-3 text-sm text-slate-600">
              <p className="flex items-center gap-2.5"><img src="/logo.png" alt="" className="w-5 h-5 object-contain" /> <strong>RadiusGate</strong>&nbsp;— PT. Pusaka Kreasi Mandiri</p>
              <p>Email: <a className="text-teal-700 font-semibold hover:underline" href="mailto:admin@radiusgate.id">admin@radiusgate.id</a></p>
              <p>WhatsApp: <a data-testid="contact-wa" className="text-teal-700 font-semibold hover:underline" href="https://wa.me/628888200999" target="_blank" rel="noreferrer">08888 200 999</a></p>
              <p className="leading-relaxed">PT. Pusaka Kreasi Mandiri<br />Telaga Golf Sawangan, Cluster Belanda Blok E10 No. 60-61,<br />Sawangan, Depok, Jawa Barat 16551</p>
            </div>
          </div>
          {sent ? (
            <div data-testid="contact-success" className={`att-anim ${contactIn ? "att-in" : ""} bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center`} style={{ animationDelay: "150ms" }}>
              <span className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-7 h-7" /></span>
              <h3 className="mt-4 text-xl font-bold text-emerald-800">Pengajuan Terkirim!</h3>
              <p className="mt-2 text-sm text-emerald-700/80">Terima kasih. Tim kami akan segera menghubungi Anda.</p>
            </div>
          ) : (
            <form data-testid="contact-form" onSubmit={submit} className={`att-anim ${contactIn ? "att-in" : ""} bg-white border border-slate-200 rounded-3xl p-7 space-y-4 shadow-sm`} style={{ animationDelay: "150ms" }}>
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
              <p className="text-xs">Gerbang Absensi Digital Masa Kini.</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold">
            <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
            <a href="#cara-kerja" className="hover:text-white transition-colors">Cara Kerja</a>
            <a href="#harga" className="hover:text-white transition-colors">Harga</a>
            <PortalLink to="/login" className="hover:text-white transition-colors">Masuk Portal</PortalLink>
            <PortalLink data-testid="footer-trial-link" to="/daftar" className="hover:text-white transition-colors">Daftar Trial Gratis</PortalLink>
            <PortalLink to="/kiosk" className="hover:text-white transition-colors">Mode Kiosk</PortalLink>
            <Link data-testid="footer-privacy-link" to="/privasi" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
            <Link data-testid="footer-terms-link" to="/syarat" className="hover:text-white transition-colors">Syarat & Ketentuan</Link>
          </nav>
          <p className="text-[11px] text-slate-500">© 2026 PT. Pusaka Kreasi Mandiri.</p>
        </div>
      </footer>

      <style>{`@keyframes scanline { 0%,100% { top: 15%; } 50% { top: 80%; } }`}</style>

      <a data-testid="wa-float" href={`https://wa.me/628888200999?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1fb857] text-white rounded-full shadow-xl shadow-emerald-900/20 px-4 py-3 transition-transform hover:scale-105">
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:block text-xs font-bold">Chat WhatsApp</span>
      </a>
    </div>
  );
}
