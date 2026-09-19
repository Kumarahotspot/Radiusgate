import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { periodLabel } from "../../i18n";
import { FileText, Send, MessageCircle } from "lucide-react";

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function OwnerInvoices() {
  const { t, i18n } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/owner/invoices").then((r) => setInvoices(r.data));
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/owner/invoices/generate", { period, send_email: sendEmail });
      toast.success(`${t("generate_invoices")}: ${data.created} (${t("send")}: ${data.sent})`);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const sendOne = async (inv) => {
    try {
      const { data } = await api.post(`/owner/invoices/${inv.id}/send`);
      toast.success(`${t("send")} OK`);
      if (data.wa?.mode === "wablas") toast.success("WhatsApp: terkirim via Wablas");
      else if (data.wa?.wa_link) window.open(data.wa.wa_link, "_blank");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="owner-invoices" className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("period")}</label>
          <input data-testid="invoice-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 pb-2.5">
          <input data-testid="invoice-send-email" type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="accent-teal-700 w-4 h-4" />
          {t("send_email_too")}
        </label>
        <button data-testid="generate-invoices-btn" onClick={generate} disabled={busy}
          className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50">
          {busy ? t("loading") : t("generate_invoices")}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("invoice_no")}</th>
                <th className="px-4 py-3">{t("school_name")}</th>
                <th className="px-4 py-3">{t("period")}</th>
                <th className="px-4 py-3">{t("student_count")}</th>
                <th className="px-4 py-3">{t("amount")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} data-testid={`invoice-row-${i.invoice_no}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs">{i.invoice_no}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{i.school_name}</td>
                  <td className="px-4 py-3">{periodLabel(i.period, i18n.language)}</td>
                  <td className="px-4 py-3">{i.student_count}</td>
                  <td className="px-4 py-3 font-semibold">{rupiah(i.amount)}</td>
                  <td className="px-4 py-3">
                    <span data-testid={`invoice-status-${i.invoice_no}`} className={`text-xs font-bold px-2.5 py-1 rounded-full ${i.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {i.status === "paid" ? t("paid") : t("unpaid")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <a data-testid={`invoice-pdf-${i.invoice_no}`} href={`${process.env.REACT_APP_BACKEND_URL}/api/public/invoice/${i.public_token}/pdf`} target="_blank" rel="noreferrer"
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title={t("view_pdf")}><FileText className="w-4 h-4" /></a>
                      <button data-testid={`invoice-send-${i.invoice_no}`} onClick={() => sendOne(i)} className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg" title={t("send")}><Send className="w-4 h-4" /></button>
                      <a data-testid={`invoice-wa-${i.invoice_no}`} href={`https://wa.me/?text=${encodeURIComponent(`${t("app_name")} - ${i.invoice_no} (${i.period}) ${rupiah(i.amount)}: ${process.env.REACT_APP_BACKEND_URL}/pay/${i.public_token}`)}`} target="_blank" rel="noreferrer"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title={t("send_wa")}><MessageCircle className="w-4 h-4" /></a>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
