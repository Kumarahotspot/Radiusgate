import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import LangSwitch from "../components/LangSwitch";
import { FileText, CheckCircle2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function Pay() {
  const { token } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    axios.get(`${API}/public/invoice/${token}`)
      .then((r) => { setData(r.data); setPaid(r.data.invoice.status === "paid"); })
      .catch(() => setError("Invoice tidak ditemukan"));
  }, [token]);

  const mockPay = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/public/invoice/${token}/mock-pay`);
      setPaid(true);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RadiusGate" className="w-11 h-11 object-contain" />
            <p className="text-white font-bold">{t("app_name")}</p>
          </div>
          <LangSwitch dark />
        </div>

        {error && <p data-testid="pay-error" className="text-red-400 text-center">{error}</p>}

        {data && (
          <div data-testid="pay-card" className="bg-white rounded-3xl overflow-hidden">
            <div className={`px-6 py-5 ${paid ? "bg-emerald-600" : "bg-teal-700"}`}>
              <p className="text-white/70 text-xs uppercase tracking-widest">{t("invoice_detail")}</p>
              <p className="text-white font-extrabold text-3xl mt-1" data-testid="pay-amount">{rupiah(data.invoice.amount)}</p>
              <p className="text-white/80 text-sm font-mono mt-1">{data.invoice.invoice_no} · {data.invoice.period}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm space-y-2">
                <Row k={t("school_name")} v={data.school?.name} />
                <Row k={t("student_count")} v={`${data.invoice.student_count} × ${rupiah(data.invoice.rate)}`} />
                <Row k={t("status")} v={paid ? t("paid") : t("unpaid")} />
              </div>
              {paid ? (
                <div data-testid="pay-success" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-2xl px-4 py-3.5">
                  <CheckCircle2 className="w-5 h-5" /> {t("invoice_paid")}
                </div>
              ) : (
                <>
                  {data.tripay_mode === "mock" && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 font-medium">{t("pay_mock_note")}</p>
                  )}
                  <button data-testid="pay-now-btn" onClick={mockPay} disabled={busy}
                    className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl py-3.5 text-sm transition-colors disabled:opacity-50">
                    {busy ? t("loading") : data.tripay_mode === "mock" ? t("pay_simulate") : t("pay_now")}
                  </button>
                </>
              )}
              <a data-testid="pay-pdf-link" href={`${API}/public/invoice/${token}/pdf`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 text-teal-700 hover:text-teal-800 text-sm font-semibold">
                <FileText className="w-4 h-4" /> {t("view_pdf")}
              </a>
            </div>
          </div>
        )}
        <div className="text-center mt-6">
          <Link to="/login" className="text-slate-500 hover:text-slate-300 text-xs font-semibold">{t("back")}</Link>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{k}</span>
      <span className="font-semibold text-slate-800 text-right">{v}</span>
    </div>
  );
}
