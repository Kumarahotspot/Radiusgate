import os
from reportlab.lib.pagesizes import A4
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


def invoice_pdf_path(inv_id: str) -> str:
    return os.path.join(INVOICE_DIR, f"inv_{inv_id}.pdf")


def build_invoice_pdf(inv: dict, school: dict) -> str:
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
    c.drawRightString(w - 20 * mm, h - 20 * mm, "EduGateID · PT. Pusaka Kreasi Mandiri")

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
    desc = f"Langganan absensi {inv['student_count']} siswa x {rupiah(inv['rate'])} / siswa / bulan"
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
    c.drawString(20 * mm, 25 * mm, "Pembayaran via Tripay (QRIS / VA / e-wallet). Invoice ini dibuat otomatis oleh EduGateID — PT. Pusaka Kreasi Mandiri.")
    c.save()
    return path


def build_report_pdf(path: str, school_name: str, date_from: str, date_to: str, rows: list) -> str:
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    tx = 20 * mm
    logo_path = os.path.join(os.path.dirname(__file__), "assets", "logo.png")
    if os.path.exists(logo_path):
        c.drawImage(logo_path, 20 * mm, h - 27 * mm, width=14 * mm, height=14 * mm, mask="auto")
        tx = 37 * mm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(tx, h - 20 * mm, f"Laporan Absensi - {school_name}")
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, h - 27 * mm, f"Periode: {date_from} s/d {date_to}")
    y = h - 40 * mm
    c.setFont("Helvetica-Bold", 8)
    headers = ["Tanggal", "Nama", "NISN", "L/P", "Tipe", "Jam", "Status", "Telat (mnt)", "Lembur (mnt)"]
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
        vals = [r.get("date", ""), r.get("teacher_name", "")[:22], (r.get("nisn", "") or "")[:12],
                r.get("gender", "") or "-", r.get("type", ""),
                r.get("time", ""), r.get("status", ""), str(r.get("late_minutes", 0)), str(r.get("overtime_minutes", 0))]
        for x, v in zip(xs, vals):
            c.drawString(x * mm, y, v)
        y -= 5 * mm
    c.save()
    return path


def build_recap_pdf(path: str, school_name: str, date_from: str, date_to: str, rows: list,
                    class_name: str | None = None) -> str:
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    tx = 20 * mm
    logo_path = os.path.join(os.path.dirname(__file__), "assets", "logo.png")
    if os.path.exists(logo_path):
        c.drawImage(logo_path, 20 * mm, h - 27 * mm, width=14 * mm, height=14 * mm, mask="auto")
        tx = 37 * mm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(tx, h - 20 * mm, f"Rekap Kehadiran Siswa - {school_name}")
    c.setFont("Helvetica", 10)
    subtitle = f"Periode: {date_from} s/d {date_to}"
    if class_name:
        subtitle += f"  |  Kelas: {class_name}"
    c.drawString(20 * mm, h - 27 * mm, subtitle)
    y = h - 40 * mm
    c.setFont("Helvetica-Bold", 9)
    headers = ["Nama", "Kelas", "Hadir", "Telat", "Sakit", "Izin", "Alpha", "Hari Efektif"]
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
        vals = [r.get("name", "")[:30], (r.get("class", "") or "")[:12], str(r.get("hadir", 0)),
                str(r.get("telat", 0)), str(r.get("sakit", 0)), str(r.get("izin", 0)),
                str(r.get("alpha", 0)), str(r.get("active_days", 0))]
        for x, v in zip(xs, vals):
            c.drawString(x * mm, y, v)
        y -= 5.5 * mm
    c.save()
    return path


def build_kiosk_poster_pdf(school: dict, pair_url: str) -> str:
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
    logo_path = os.path.join(os.path.dirname(__file__), "assets", "logo.png")
    if os.path.exists(logo_path):
        c.setFillColorRGB(1, 1, 1)
        c.roundRect(w / 2 - 12 * mm, h - 30 * mm, 24 * mm, 24 * mm, 4 * mm, stroke=0, fill=1)
        c.drawImage(logo_path, w / 2 - 10 * mm, h - 28 * mm, width=20 * mm, height=20 * mm, mask="auto")
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(w / 2, h - 37 * mm, "EduGateID · Kiosk Absensi")

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
    c.drawCentredString(w / 2, 20 * mm, "EduGateID · PT. Pusaka Kreasi Mandiri")
    c.save()
    return path
