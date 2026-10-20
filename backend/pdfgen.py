import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.pagesizes import landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

INVOICE_DIR = os.path.join(os.path.dirname(__file__), "invoices")
os.makedirs(INVOICE_DIR, exist_ok=True)


_BULAN = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"]


def periode_label(period: str) -> str:
    try:
        y, m = period.split("-")
        return f"{_BULAN[int(m)]} {y}"
    except Exception:
        return period


def rupiah(n: int) -> str:
    return f"Rp {int(n):,}".replace(",", ".")


def _logo_reader(logo_bytes: bytes | None):
    if not logo_bytes:
        return None
    try:
        import io as _io
        from reportlab.lib.utils import ImageReader
        return ImageReader(_io.BytesIO(logo_bytes))
    except Exception:
        return None


def build_warning_letter_pdf(letter: dict, school: dict, logo_bytes: bytes | None = None) -> str:
    path = os.path.join(INVOICE_DIR, f"sp_{letter['id']}.pdf")
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    logo_path = _logo_reader(logo_bytes) or os.path.join(os.path.dirname(__file__), "assets", "logo.png")
    if not isinstance(logo_path, str) or os.path.exists(logo_path):
        c.drawImage(logo_path, 20 * mm, h - 26 * mm, width=14 * mm, height=14 * mm, mask="auto")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(38 * mm, h - 20 * mm, school.get("name", ""))
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    if school.get("address"):
        c.drawString(38 * mm, h - 25 * mm, school["address"])
    c.setFillColorRGB(0, 0, 0)
    c.setLineWidth(1.2)
    c.line(20 * mm, h - 30 * mm, w - 20 * mm, h - 30 * mm)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(w / 2, h - 44 * mm, f"SURAT PERINGATAN {letter['level']}")
    c.setFont("Helvetica", 10)
    c.drawCentredString(w / 2, h - 50 * mm, f"Nomor: {letter['level']}/HRD/{letter['month']}")
    y = h - 64 * mm
    lines = [
        f"Yang bertanda tangan di bawah ini mewakili manajemen {school.get('name', '')}, dengan ini",
        f"memberikan Surat Peringatan {letter['level']} kepada:",
        "",
        f"        Nama             :  {letter['name']}",
        f"        NIP               :  {letter.get('nip') or '-'}",
        f"        Departemen  :  {letter.get('department') or '-'}",
        f"        Jabatan          :  {letter.get('position') or '-'}",
        "",
        "Berdasarkan catatan kehadiran digital, yang bersangkutan tercatat terlambat hadir",
        f"sebanyak {letter['late_count']} kali pada periode {periode_label(letter['month'])}. Hal tersebut",
        "melanggar peraturan kedisiplinan perusahaan.",
        "",
        "Melalui surat ini, yang bersangkutan diperingatkan untuk memperbaiki kedisiplinan",
        "kehadiran. Apabila pelanggaran serupa terulang, perusahaan akan memberikan",
        "tindakan lanjutan sesuai peraturan perusahaan yang berlaku.",
        "",
        "Demikian surat peringatan ini dibuat untuk diperhatikan dan dipatuhi.",
    ]
    c.setFont("Helvetica", 10.5)
    for ln in lines:
        c.drawString(20 * mm, y, ln)
        y -= 6.2 * mm
    y -= 12 * mm
    c.setFont("Helvetica", 10.5)
    c.drawString(30 * mm, y, "Yang bersangkutan,")
    c.drawString(w - 90 * mm, y, "Hormat kami,")
    c.drawString(w - 90 * mm, y - 5 * mm, "HRD / Manajemen")
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(30 * mm, y - 32 * mm, f"( {letter['name']} )")
    c.drawString(w - 90 * mm, y - 32 * mm, f"( {letter.get('issued_by') or 'HRD'} )")
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawString(20 * mm, 15 * mm, "Dokumen ini dibuat otomatis oleh RadiusGate berdasarkan data kehadiran digital.")
    c.save()
    return path


def build_daftar_hadir_pdf(school: dict, employees: list, matrix: dict, month: str, logo_bytes: bytes | None = None) -> str:
    import calendar as _cal
    year, mon = map(int, month.split("-"))
    ndays = _cal.monthrange(year, mon)[1]
    path = os.path.join(INVOICE_DIR, f"daftar_hadir_pppk_{month}.pdf")
    _hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    cols = [20 * mm, 32 * mm, 58 * mm, 84 * mm, 108 * mm, 132 * mm, 152 * mm]
    headers = ["No", "Tanggal", "Hari", "Jam Masuk", "Jam Pulang", "Jam Kerja", "Paraf"]
    row_h = 6.4 * mm
    logo = _logo_reader(logo_bytes)

    for emp in employees:
        y = h - 18 * mm
        if logo:
            c.drawImage(logo, 20 * mm, y - 12 * mm, width=16 * mm, height=16 * mm, mask="auto", preserveAspectRatio=True)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(w / 2, y, (school.get("name") or "").upper())
        c.setFont("Helvetica", 9)
        y -= 5 * mm
        if school.get("address"):
            c.drawCentredString(w / 2, y, school["address"])
        y -= 3 * mm
        if logo:
            y -= 6 * mm
        c.setLineWidth(1.2)
        c.line(20 * mm, y, w - 20 * mm, y)
        y -= 10 * mm
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(w / 2, y, "DAFTAR HADIR PPPK PARUH WAKTU")
        c.setFont("Helvetica", 10)
        y -= 6 * mm
        c.drawCentredString(w / 2, y, f"Periode: {periode_label(month)}")
        y -= 12 * mm
        for label, val in [("Nama", emp.get("name", "")), ("NIP/NIPTT-PW", emp.get("nip") or "-"),
                           ("Unit Kerja", emp.get("department") or "-"), ("Jabatan", emp.get("position") or "-")]:
            c.drawString(20 * mm, y, f"{label:<14}:  {val}")
            y -= 6 * mm
        y -= 3 * mm

        def _thead():
            c.setFont("Helvetica-Bold", 8.5)
            c.rect(20 * mm, y - row_h, w - 40 * mm, row_h)
            for cx, htxt in zip(cols, headers):
                c.drawString(cx + 1.5 * mm, y - 4.4 * mm, htxt)
            for cx in cols[1:]:
                c.line(cx, y, cx, y - row_h)

        _thead()
        y -= row_h
        emat = matrix.get(emp["id"], {})
        total_min = 0
        no = 0
        c.setFont("Helvetica", 8.5)
        for dnum in range(1, ndays + 1):
            dstr = f"{year}-{mon:02d}-{dnum:02d}"
            rec = emat.get(dstr)
            if not rec:
                continue
            if y < 50 * mm:
                c.showPage()
                y = h - 25 * mm
                _thead()
                y -= row_h
                c.setFont("Helvetica", 8.5)
            no += 1
            hari = _hari[datetime(year, mon, dnum).weekday()]
            jk = f"{rec['minutes'] // 60}j {rec['minutes'] % 60}m" if rec["minutes"] else "-"
            total_min += rec["minutes"]
            row = [str(no), f"{dnum:02d}/{mon:02d}/{year}", hari, rec.get("in") or "-", rec.get("out") or "-", jk, ""]
            c.rect(20 * mm, y - row_h, w - 40 * mm, row_h)
            for cx, val in zip(cols, row):
                c.drawString(cx + 1.5 * mm, y - 4.4 * mm, str(val))
            for cx in cols[1:]:
                c.line(cx, y, cx, y - row_h)
            y -= row_h
        y -= 8 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20 * mm, y, f"Total Jam Kerja: {total_min // 60} jam {total_min % 60} menit")
        y -= 18 * mm
        c.setFont("Helvetica", 10)
        c.drawString(20 * mm, y, "Pegawai yang bersangkutan,")
        c.drawString(w - 90 * mm, y, "Pejabat Penilai Kinerja,")
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20 * mm, y - 26 * mm, f"( {emp.get('name', '')} )")
        c.drawString(w - 90 * mm, y - 26 * mm, "( .................................... )")
        c.showPage()
    c.save()
    return path


def build_pppk_weekly_pdf(school: dict, rows: list, w_start: str, w_end: str, logo_bytes: bytes | None = None) -> str:
    def _fd(s: str) -> str:
        return datetime.strptime(s, "%Y-%m-%d").strftime("%d/%m/%Y")

    path = os.path.join(INVOICE_DIR, f"laporan_mingguan_pppk_{w_start}.pdf")
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    cols = [20 * mm, 28 * mm, 62 * mm, 88 * mm, 112 * mm, 124 * mm, 148 * mm, 168 * mm]
    headers = ["No", "Nama", "NIP/NIPTT-PW", "Unit Kerja", "Hari", "Jam Kerja", "Tarif/Jam", "Upah"]
    row_h = 6.4 * mm
    logo = _logo_reader(logo_bytes)

    def _kop(y):
        if logo:
            c.drawImage(logo, 20 * mm, y - 12 * mm, width=16 * mm, height=16 * mm, mask="auto", preserveAspectRatio=True)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(w / 2, y, (school.get("name") or "").upper())
        y -= 5 * mm
        c.setFont("Helvetica", 9)
        if school.get("address"):
            c.drawCentredString(w / 2, y, school["address"])
        y -= 3 * mm
        if logo:
            y -= 6 * mm
        c.setLineWidth(1.2)
        c.line(20 * mm, y, w - 20 * mm, y)
        y -= 10 * mm
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(w / 2, y, "LAPORAN MINGGUAN PPPK PARUH WAKTU")
        y -= 6 * mm
        c.setFont("Helvetica", 10)
        c.drawCentredString(w / 2, y, f"Periode: {_fd(w_start)} s.d. {_fd(w_end)}")
        return y - 12 * mm

    def _thead(y):
        c.setFont("Helvetica-Bold", 8.5)
        c.rect(20 * mm, y - row_h, w - 40 * mm, row_h)
        for cx, htxt in zip(cols, headers):
            c.drawString(cx + 1.5 * mm, y - 4.4 * mm, htxt)
        for cx in cols[1:]:
            c.line(cx, y, cx, y - row_h)
        return y - row_h

    y = _thead(_kop(h - 18 * mm))
    c.setFont("Helvetica", 8.5)
    tot_min = tot_pay = 0
    for i, r in enumerate(rows, 1):
        if y < 45 * mm:
            c.showPage()
            y = _thead(h - 20 * mm)
            c.setFont("Helvetica", 8.5)
        jk = f"{r['minutes'] // 60}j {r['minutes'] % 60}m" if r["minutes"] else "-"
        vals = [str(i), (r["name"] or "")[:24], (r["nip"] or "-")[:18], (r["department"] or "-")[:16],
                str(r["days"]), jk, rupiah(r["hourly_rate"]) if r["hourly_rate"] else "-", rupiah(r["pay"])]
        c.rect(20 * mm, y - row_h, w - 40 * mm, row_h)
        for cx, val in zip(cols, vals):
            c.drawString(cx + 1.5 * mm, y - 4.4 * mm, str(val))
        for cx in cols[1:]:
            c.line(cx, y, cx, y - row_h)
        y -= row_h
        tot_min += r["minutes"]
        tot_pay += r["pay"]
    c.setFont("Helvetica-Bold", 8.5)
    c.rect(20 * mm, y - row_h, w - 40 * mm, row_h)
    c.drawString(28 * mm + 1.5 * mm, y - 4.4 * mm, "TOTAL")
    c.drawString(112 * mm + 1.5 * mm, y - 4.4 * mm, str(sum(r["days"] for r in rows)))
    c.drawString(124 * mm + 1.5 * mm, y - 4.4 * mm, f"{tot_min // 60}j {tot_min % 60}m")
    c.drawString(168 * mm + 1.5 * mm, y - 4.4 * mm, rupiah(tot_pay))
    for cx in cols[1:]:
        c.line(cx, y, cx, y - row_h)
    y -= row_h + 16 * mm
    c.setFont("Helvetica", 10)
    c.drawString(w - 90 * mm, y, "Pejabat Penilai Kinerja,")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(w - 90 * mm, y - 26 * mm, "( .................................... )")
    c.save()
    return path


def invoice_pdf_path(inv_id: str) -> str:
    return os.path.join(INVOICE_DIR, f"inv_{inv_id}.pdf")


def build_invoice_pdf(inv: dict, school: dict, logo_bytes: bytes | None = None) -> str:
    path = invoice_pdf_path(inv["id"])
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    c.setFillColorRGB(0.059, 0.463, 0.431)
    c.rect(0, h - 30 * mm, w, 30 * mm, stroke=0, fill=1)
    logo_path = os.path.join(os.path.dirname(__file__), "assets", "logo.png")
    tx = 20 * mm
    if os.path.exists(logo_path):
        c.setFillColorRGB(1, 1, 1)
        c.roundRect(12 * mm, h - 27 * mm, 24 * mm, 24 * mm, 4 * mm, stroke=0, fill=1)
        c.drawImage(logo_path, 14 * mm, h - 25 * mm, width=20 * mm, height=20 * mm, mask="auto")
        tx = 40 * mm
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(tx, h - 20 * mm, "INVOICE")
    c.setFont("Helvetica", 11)
    c.drawRightString(w - 20 * mm, h - 20 * mm, "RadiusGate · PT. Pusaka Kreasi Mandiri")

    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20 * mm, h - 45 * mm, "Ditagihkan kepada:")
    c.setFont("Helvetica", 11)
    c.drawString(20 * mm, h - 52 * mm, school.get("name", ""))
    c.drawString(20 * mm, h - 58 * mm, school.get("address", "") or "")

    c.drawRightString(w - 20 * mm, h - 45 * mm, f"No: {inv['invoice_no']}")
    c.drawRightString(w - 20 * mm, h - 51 * mm, f"Periode: {periode_label(inv['period'])}")
    status = "LUNAS" if inv["status"] == "paid" else "BELUM LUNAS"
    c.drawRightString(w - 20 * mm, h - 57 * mm, f"Status: {status}")

    y = h - 80 * mm
    c.setFillColorRGB(0.94, 0.97, 0.96)
    c.rect(20 * mm, y - 8 * mm, w - 40 * mm, 10 * mm, stroke=0, fill=1)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(23 * mm, y - 4 * mm, "Deskripsi")
    c.drawRightString(w - 23 * mm, y - 4 * mm, "Jumlah")
    y -= 18 * mm
    c.setFont("Helvetica", 10)
    unit = inv.get("unit_label", "siswa")
    desc = f"Langganan absensi {inv['student_count']} {unit} x {rupiah(inv['rate'])} / {unit} / bulan"
    c.drawString(23 * mm, y, desc)
    c.drawRightString(w - 23 * mm, y, rupiah(inv["amount"]))
    y -= 12 * mm
    c.setLineWidth(0.5)
    c.line(20 * mm, y, w - 20 * mm, y)
    y -= 8 * mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(23 * mm, y, "TOTAL")
    c.drawRightString(w - 23 * mm, y, rupiah(inv["amount"]))

    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.45, 0.45, 0.45)
    c.drawString(20 * mm, 25 * mm, "Pembayaran via Tripay (QRIS / VA / e-wallet). Invoice ini dibuat otomatis oleh RadiusGate — PT. Pusaka Kreasi Mandiri.")
    c.save()
    return path


def build_report_pdf(path: str, school_name: str, date_from: str, date_to: str, rows: list,
                     id_label: str = "NISN", logo_bytes: bytes | None = None) -> str:
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    tx = 20 * mm
    logo_path = _logo_reader(logo_bytes) or os.path.join(os.path.dirname(__file__), "assets", "logo.png")
    if not isinstance(logo_path, str) or os.path.exists(logo_path):
        c.drawImage(logo_path, 20 * mm, h - 27 * mm, width=14 * mm, height=14 * mm, mask="auto")
        tx = 37 * mm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(tx, h - 20 * mm, f"Laporan Absensi - {school_name}")
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, h - 27 * mm, f"Periode: {date_from} s/d {date_to}")
    y = h - 40 * mm
    c.setFont("Helvetica-Bold", 8)
    headers = ["Tanggal", "Nama", id_label, "L/P", "Tipe", "Jam", "Status", "Telat (mnt)", "Lembur (mnt)"]
    xs = [20, 42, 88, 108, 118, 132, 148, 168, 184]
    for x, hd in zip(xs, headers):
        c.drawString(x * mm, y, hd)
    y -= 6 * mm
    c.setFont("Helvetica", 8)
    for r in rows[:400]:
        if y < 20 * mm:
            c.showPage()
            y = h - 20 * mm
            c.setFont("Helvetica", 8)
        vals = [r.get("date", ""), r.get("teacher_name", "")[:22], (r.get("nisn", "") or r.get("nip", ""))[:12],
                r.get("gender", "") or "-", r.get("type", ""),
                r.get("time", ""), r.get("status", ""), str(r.get("late_minutes", 0)), str(r.get("overtime_minutes", 0))]
        for x, v in zip(xs, vals):
            c.drawString(x * mm, y, v)
        y -= 5 * mm
    c.save()
    return path


def build_recap_pdf(path: str, school_name: str, date_from: str, date_to: str, rows: list,
                    class_name: str | None = None, person_label: str = "Siswa",
                    grp_label: str = "Kelas", logo_bytes: bytes | None = None) -> str:
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    tx = 20 * mm
    logo_path = _logo_reader(logo_bytes) or os.path.join(os.path.dirname(__file__), "assets", "logo.png")
    if not isinstance(logo_path, str) or os.path.exists(logo_path):
        c.drawImage(logo_path, 20 * mm, h - 27 * mm, width=14 * mm, height=14 * mm, mask="auto")
        tx = 37 * mm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(tx, h - 20 * mm, f"Rekap Kehadiran {person_label} - {school_name}")
    c.setFont("Helvetica", 10)
    subtitle = f"Periode: {date_from} s/d {date_to}"
    if class_name:
        subtitle += f"  |  Kelas: {class_name}"
    c.drawString(20 * mm, h - 27 * mm, subtitle)
    y = h - 40 * mm
    c.setFont("Helvetica-Bold", 9)
    headers = ["Nama", grp_label, "Hadir", "Telat", "Sakit", "Izin", "Alpha", "Hari Efektif"]
    xs = [20, 78, 104, 119, 134, 149, 164, 180]
    for x, hd in zip(xs, headers):
        c.drawString(x * mm, y, hd)
    y -= 6 * mm
    c.setFont("Helvetica", 9)
    for r in rows[:400]:
        if y < 20 * mm:
            c.showPage()
            y = h - 20 * mm
            c.setFont("Helvetica", 9)
        vals = [r.get("name", "")[:30], (r.get("group", "") or "")[:12], str(r.get("hadir", 0)),
                str(r.get("telat", 0)), str(r.get("sakit", 0)), str(r.get("izin", 0)),
                str(r.get("alpha", 0)), str(r.get("active_days", 0))]
        for x, v in zip(xs, vals):
            c.drawString(x * mm, y, v)
        y -= 5.5 * mm
    c.save()
    return path


def build_kiosk_poster_pdf(school: dict, pair_url: str, logo_bytes: bytes | None = None) -> str:
    import qrcode
    token = school.get("kiosk_token", "")
    path = os.path.join(INVOICE_DIR, f"kiosk_poster_{token}.pdf")
    qr_path = os.path.join(INVOICE_DIR, f"kiosk_qr_{token}.png")
    qrcode.make(pair_url).save(qr_path)

    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    teal = (0.059, 0.463, 0.431)
    c.setFillColorRGB(*teal)
    c.rect(0, h - 40 * mm, w, 40 * mm, stroke=0, fill=1)
    logo_path = _logo_reader(logo_bytes) or os.path.join(os.path.dirname(__file__), "assets", "logo.png")
    if not isinstance(logo_path, str) or os.path.exists(logo_path):
        c.setFillColorRGB(1, 1, 1)
        c.roundRect(w / 2 - 12 * mm, h - 30 * mm, 24 * mm, 24 * mm, 4 * mm, stroke=0, fill=1)
        c.drawImage(logo_path, w / 2 - 10 * mm, h - 28 * mm, width=20 * mm, height=20 * mm, mask="auto")
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(w / 2, h - 37 * mm, "RadiusGate · Kiosk Absensi")

    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(w / 2, h - 60 * mm, school.get("name", "")[:55])

    c.drawImage(qr_path, w / 2 - 40 * mm, h - 155 * mm, width=80 * mm, height=80 * mm)

    c.setFillColorRGB(*teal)
    c.roundRect(w / 2 - 45 * mm, h - 172 * mm, 90 * mm, 11 * mm, 2 * mm, stroke=0, fill=1)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Courier-Bold", 15)
    c.drawCentredString(w / 2, h - 168.5 * mm, token)

    c.setFillColorRGB(0.35, 0.35, 0.35)
    c.setFont("Helvetica", 11)
    c.drawCentredString(w / 2, h - 185 * mm, "Arahkan kamera tablet/HP ke QR code ini untuk pairing kiosk otomatis,")
    c.drawCentredString(w / 2, h - 191 * mm, "atau buka halaman Kiosk lalu masukkan kode di atas secara manual.")

    c.setFont("Helvetica", 9)
    c.drawCentredString(w / 2, 20 * mm, "RadiusGate · PT. Pusaka Kreasi Mandiri")
    c.save()
    return path



_ANGKA = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan",
          "Sembilan", "Sepuluh", "Sebelas"]


def terbilang(n: int) -> str:
    n = int(n)
    if n < 12:
        return _ANGKA[n]
    if n < 20:
        return (terbilang(n - 10) + " Belas").strip()
    if n < 100:
        return (terbilang(n // 10) + " Puluh " + terbilang(n % 10)).strip()
    if n < 200:
        return ("Seratus " + terbilang(n - 100)).strip()
    if n < 1000:
        return (terbilang(n // 100) + " Ratus " + terbilang(n % 100)).strip()
    if n < 2000:
        return ("Seribu " + terbilang(n - 1000)).strip()
    if n < 1000000:
        return (terbilang(n // 1000) + " Ribu " + terbilang(n % 1000)).strip()
    if n < 1000000000:
        return (terbilang(n // 1000000) + " Juta " + terbilang(n % 1000000)).strip()
    return str(n)


def _spp_kop(c, school_name: str, title: str, logo_bytes: bytes | None = None):
    w, h = A4
    c.setFillColorRGB(0.059, 0.463, 0.431)
    c.rect(0, h - 28 * mm, w, 28 * mm, stroke=0, fill=1)
    logo_path = os.path.join(os.path.dirname(__file__), "assets", "logo.png")
    tx = 20 * mm
    if os.path.exists(logo_path):
        c.setFillColorRGB(1, 1, 1)
        c.roundRect(12 * mm, h - 25 * mm, 22 * mm, 22 * mm, 4 * mm, stroke=0, fill=1)
        c.drawImage(logo_path, 14 * mm, h - 23 * mm, width=18 * mm, height=18 * mm, mask="auto")
        tx = 40 * mm
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(tx, h - 14 * mm, title)
    c.setFont("Helvetica", 10)
    c.drawString(tx, h - 21 * mm, school_name)
    return h - 40 * mm


def _signature(c, y: float, label: str = "Petugas / Bendahara"):
    w, _ = A4
    from datetime import datetime as _dt
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica", 10)
    tanggal = f"{_dt.now().day} {_BULAN[_dt.now().month]} {_dt.now().year}"
    c.drawString(w - 90 * mm, y, f"Tanggal, {tanggal}")
    c.drawString(w - 90 * mm, y - 7 * mm, label)
    c.line(w - 90 * mm, y - 28 * mm, w - 25 * mm, y - 28 * mm)
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0.45, 0.45, 0.45)
    c.drawString(w - 90 * mm, y - 32 * mm, "( Nama jelas & tanda tangan )")


def build_spp_receipt_pdf(path: str, school_name: str, bill: dict, pay: dict, logo_bytes: bytes | None = None) -> str:
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    y = _spp_kop(c, school_name, "KUITANSI PEMBAYARAN", logo_bytes)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(w - 20 * mm, y + 8 * mm, f"No: {pay.get('reference', '-')}")
    rows = [
        ("Diterima dari", f"Orang tua/wali murid"),
        ("Nama Siswa", bill.get("student_name", "")),
        ("Kelas", bill.get("class", "") or "-"),
        ("Untuk Pembayaran", bill.get("title", "")),
        ("Tanggal Bayar", (pay.get("paid_at") or "")[:10]),
        ("Metode", pay.get("method", "") or "-"),
    ]
    for label, val in rows:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20 * mm, y, label)
        c.setFont("Helvetica", 10)
        c.drawString(70 * mm, y, f": {val}")
        y -= 8 * mm
    y -= 2 * mm
    c.setFillColorRGB(0.94, 0.97, 0.96)
    c.rect(20 * mm, y - 12 * mm, w - 40 * mm, 18 * mm, stroke=0, fill=1)
    c.setFillColorRGB(0.059, 0.463, 0.431)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(26 * mm, y - 1 * mm, rupiah(pay.get("amount", 0)))
    c.setFillColorRGB(0.35, 0.35, 0.35)
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(26 * mm, y - 8 * mm, f"Terbilang: {terbilang(pay.get('amount', 0))} Rupiah")
    y -= 22 * mm
    remaining = bill.get("remaining", 0)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 11)
    if bill.get("status") == "paid":
        c.drawString(20 * mm, y, "Status: LUNAS")
    else:
        c.drawString(20 * mm, y, f"Status: CICILAN — sisa tagihan {rupiah(remaining)}")
    _signature(c, y - 15 * mm)
    c.save()
    return path


def build_spp_invoice_pdf(path: str, school_name: str, bill: dict, logo_bytes: bytes | None = None) -> str:
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    y = _spp_kop(c, school_name, "INVOICE TAGIHAN", logo_bytes)
    status_label = {"paid": "LUNAS", "partial": "CICILAN", "unpaid": "BELUM LUNAS"}.get(bill.get("status"), "BELUM LUNAS")
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica", 10)
    c.drawRightString(w - 20 * mm, y + 8 * mm, f"No: SPP-{bill.get('id', '')[:8].upper()}")
    c.drawRightString(w - 20 * mm, y + 2 * mm, f"Status: {status_label}")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "Ditagihkan kepada:")
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y - 6 * mm, f"{bill.get('student_name', '')} — Kelas {bill.get('class', '') or '-'}")
    y -= 18 * mm
    c.setFillColorRGB(0.94, 0.97, 0.96)
    c.rect(20 * mm, y - 2 * mm, w - 40 * mm, 9 * mm, stroke=0, fill=1)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 9)
    for x, hd in ((23, "Judul Tagihan"), (95, "Kategori"), (125, "Jatuh Tempo"), (155, "Jumlah")):
        c.drawString(x * mm, y + 1 * mm, hd)
    y -= 10 * mm
    c.setFont("Helvetica", 10)
    c.drawString(23 * mm, y, (bill.get("title", "") or "")[:32])
    c.drawString(95 * mm, y, (bill.get("category", "") or "")[:12])
    c.drawString(125 * mm, y, bill.get("due_date", ""))
    c.drawString(155 * mm, y, rupiah(bill.get("amount", 0)))
    y -= 10 * mm
    c.setLineWidth(0.5)
    c.line(20 * mm, y, w - 20 * mm, y)
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    c.drawString(23 * mm, y, "Sudah dibayar")
    c.drawString(155 * mm, y, rupiah(bill.get("paid_amount", 0)))
    y -= 7 * mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(23 * mm, y, "SISA TAGIHAN")
    c.drawString(155 * mm, y, rupiah(bill.get("remaining", 0)))
    y -= 14 * mm
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.45, 0.45, 0.45)
    c.drawString(20 * mm, y, "Pembayaran dapat dilakukan tunai ke bendahara sekolah atau online melalui portal orang tua (RadiusGate).")
    _signature(c, y - 15 * mm)
    c.save()
    return path


def build_spp_bills_pdf(path: str, school_name: str, bills: list, logo_bytes: bytes | None = None) -> str:
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    first = bills[0]
    y = _spp_kop(c, school_name, "REKAP TAGIHAN SISWA", logo_bytes)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20 * mm, y, f"{first.get('student_name', '')}")
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y - 6 * mm, f"Kelas {first.get('class', '') or '-'}")
    y -= 16 * mm
    headers = ["Judul Tagihan", "Kategori", "Jatuh Tempo", "Jumlah", "Terbayar", "Sisa", "Status"]
    xs = [20, 70, 92, 112, 132, 152, 172]
    status_label = {"paid": "Lunas", "partial": "Cicilan", "unpaid": "Belum"}
    tot = sum(b.get("amount", 0) for b in bills)
    tot_paid = sum(b.get("paid_amount", 0) for b in bills)
    c.setFont("Helvetica-Bold", 9)
    for x, hd in zip(xs, headers):
        c.drawString(x * mm, y, hd)
    y -= 6 * mm
    c.setFont("Helvetica", 9)
    for b in bills:
        if y < 30 * mm:
            c.showPage()
            y = h - 20 * mm
            c.setFont("Helvetica", 9)
        vals = [(b.get("title", "") or "")[:24], (b.get("category", "") or "")[:10], b.get("due_date", ""),
                rupiah(b.get("amount", 0)), rupiah(b.get("paid_amount", 0)), rupiah(b.get("remaining", 0)),
                status_label.get(b.get("status"), "-")]
        for x, v in zip(xs, vals):
            c.drawString(x * mm, y, v)
        y -= 6 * mm
    y -= 4 * mm
    c.setLineWidth(0.5)
    c.line(20 * mm, y, w - 20 * mm, y)
    y -= 7 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20 * mm, y, "TOTAL")
    c.drawString(112 * mm, y, rupiah(tot))
    c.drawString(132 * mm, y, rupiah(tot_paid))
    c.drawString(152 * mm, y, rupiah(max(0, tot - tot_paid)))
    _signature(c, y - 15 * mm)
    c.save()
    return path