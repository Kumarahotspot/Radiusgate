import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api";
import { periodLabel } from "../../i18n";
import { FileText, CreditCard } from "lucide-react";

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function Billing() {
  const { t, i18n } = useTranslation();
  const [invoices, setInvoices] = useState([]);

  useEffect(() => { api.get("/admin/invoices").then((r) => setInvoices(r.data)); }, []);

  return (
    <div data-testid="billing-page" className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t("billing")}</h2>
      <div className="space-y-3">
        {invoices.map((i) => (
          <div key={i.id} data-testid={`billing-invoice-${i.invoice_no}`} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <p className="font-mono text-xs text-slate-500">{i.invoice_no} · {periodLabel(i.period, i18n.language)}</p>
              <p className="font-extrabold text-slate-800 text-xl mt-1">{rupiah(i.amount)}</p>
              <p className="text-xs text-slate-500">{i.student_count} {t("students").toLowerCase()} × {rupiah(i.rate)}</p>
              {i.paid_at && <p className="text-xs text-emerald-600 mt-1">{t("paid_at")}: {i.paid_at.slice(0, 10)}</p>}
            </div>
            <span data-testid={`billing-status-${i.invoice_no}`} className={`text-xs font-bold px-3 py-1.5 rounded-full ${i.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {i.status === "paid" ? t("paid") : t("unpaid")}
            </span>
            <div className="flex gap-2">
              <a data-testid={`billing-pdf-${i.invoice_no}`} href={`${process.env.REACT_APP_BACKEND_URL}/api/public/invoice/${i.public_token}/pdf`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                <FileText className="w-4 h-4" /> {t("view_pdf")}
              </a>
              {i.status !== "paid" && (
                <a data-testid={`billing-pay-${i.invoice_no}`} href={`/pay/${i.public_token}`}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors">
                  <CreditCard className="w-4 h-4" /> {t("pay")}
                </a>
              )}
            </div>
          </div>
        ))}
        {invoices.length === 0 && <p className="text-slate-400 text-sm text-center py-10 bg-white rounded-2xl border border-slate-200">{t("no_data")}</p>}
      </div>
    </div>
  );
}
