import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { Check, X, FileDown } from "lucide-react";

const rp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function Overtime() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("approval");
  const [reqs, setReqs] = useState([]);
  const [recap, setRecap] = useState([]);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState(today.slice(0, 7));
  const [payroll, setPayroll] = useState([]);

  const loadReqs = () => api.get("/admin/overtime").then((r) => setReqs(r.data));
  const loadRecap = () => api.get("/admin/reports/overtime", { params: { date_from: from, date_to: to } }).then((r) => setRecap(r.data));
  const loadPayroll = () => api.get("/admin/reports/payroll", { params: { period } }).then((r) => setPayroll(r.data));
  useEffect(() => { loadReqs(); }, []);
  useEffect(() => { if (tab === "report") loadRecap(); }, [tab]); // eslint-disable-line
  useEffect(() => { if (tab === "payroll") loadPayroll(); }, [tab]); // eslint-disable-line

  const decide = async (id, status) => {
    try {
      await api.post(`/admin/overtime/${id}/decision`, { status });
      toast.success(t("save"));
      loadReqs();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const exportXlsx = async () => {
    try {
      const res = await api.get("/admin/reports/overtime/export", { params: { date_from: from, date_to: to }, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "laporan-lembur.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const exportPayroll = async () => {
    try {
      const res = await api.get("/admin/reports/payroll/export", { params: { period }, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `penggajian-${period}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const badge = (s) => s === "approved" ? "bg-emerald-100 text-emerald-700" : s === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700";

  return (
    <div data-testid="overtime-page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-slate-800">{t("overtime")}</h2>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          <button data-testid="tab-approval" onClick={() => setTab("approval")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "approval" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {t("overtime_approval")}
          </button>
          <button data-testid="tab-report" onClick={() => setTab("report")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "report" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {t("overtime_report")}
          </button>
          <button data-testid="tab-payroll" onClick={() => setTab("payroll")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "payroll" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {t("payroll")}
          </button>
        </div>
      </div>

      {tab === "approval" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                  <th className="px-4 py-3">{t("ot_date")}</th>
                  <th className="px-4 py-3">{t("name")}</th>
                  <th className="px-4 py-3">{t("ot_minutes")}</th>
                  <th className="px-4 py-3">{t("ot_reason")}</th>
                  <th className="px-4 py-3">{t("status")}</th>
                  <th className="px-4 py-3">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {reqs.map((r) => (
                  <tr key={r.id} data-testid={`ot-row-${r.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs">{r.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.employee_name}</td>
                    <td className="px-4 py-3">{r.minutes}</td>
                    <td className="px-4 py-3 text-slate-600">{r.reason || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span data-testid={`ot-status-${r.id}`} className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge(r.status)}`}>
                        {t(`ot_status_${r.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <div className="flex gap-1">
                          <button data-testid={`ot-approve-${r.id}`} onClick={() => decide(r.id, "approved")}
                            className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1.5 rounded-lg transition-colors">
                            <Check className="w-4 h-4" /> {t("approve")}
                          </button>
                          <button data-testid={`ot-reject-${r.id}`} onClick={() => decide(r.id, "rejected")}
                            className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">
                            <X className="w-4 h-4" /> {t("reject")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {reqs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "report" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("date_from")}</label>
              <input data-testid="ot-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("date_to")}</label>
              <input data-testid="ot-to" type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            </div>
            <button data-testid="ot-apply" onClick={loadRecap}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800">{t("apply")}</button>
            <button data-testid="ot-export" onClick={exportXlsx}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100">
              <FileDown className="w-4 h-4" /> {t("export_file")}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                    <th className="px-4 py-3">{t("name")}</th>
                    <th className="px-4 py-3">{t("department")}</th>
                    <th className="px-4 py-3">{t("ot_actual")}</th>
                    <th className="px-4 py-3">{t("ot_paid")}</th>
                    <th className="px-4 py-3">{t("overtime_rate")}</th>
                    <th className="px-4 py-3">{t("ot_pay")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.map((r) => (
                    <tr key={r.id} data-testid={`ot-recap-${r.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.department || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">{r.overtime_minutes}</td>
                      <td className="px-4 py-3">{r.paid_minutes}</td>
                      <td className="px-4 py-3 text-slate-600">{rp(r.overtime_rate)}</td>
                      <td className="px-4 py-3 font-bold text-teal-700">{rp(r.overtime_pay)}</td>
                    </tr>
                  ))}
                  {recap.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
                  {recap.length > 0 && (
                    <tr className="bg-slate-50 font-bold">
                      <td className="px-4 py-3" colSpan={3}>Total</td>
                      <td className="px-4 py-3">{recap.reduce((s, r) => s + r.paid_minutes, 0)}</td>
                      <td className="px-4 py-3"></td>
                      <td data-testid="ot-grand-total" className="px-4 py-3 text-teal-700">{rp(recap.reduce((s, r) => s + r.overtime_pay, 0))}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400">{t("overtime_pay_hint")}</p>
        </div>
      )}

      {tab === "payroll" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("payroll_period")}</label>
              <input data-testid="payroll-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            </div>
            <button data-testid="payroll-apply" onClick={loadPayroll}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800">{t("apply")}</button>
            <button data-testid="payroll-export" onClick={exportPayroll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100">
              <FileDown className="w-4 h-4" /> {t("export_file")}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                    <th className="px-4 py-3">{t("name")}</th>
                    <th className="px-4 py-3">{t("department")}</th>
                    <th className="px-4 py-3">{t("present_days")}</th>
                    <th className="px-4 py-3">{t("ot_paid")}</th>
                    <th className="px-4 py-3">{t("ot_pay")}</th>
                    <th className="px-4 py-3">{t("base_salary")}</th>
                    <th className="px-4 py-3">{t("total_pay")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.map((r) => (
                    <tr key={r.id} data-testid={`payroll-row-${r.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.department || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">{r.present_days}</td>
                      <td className="px-4 py-3">{r.paid_minutes}</td>
                      <td className="px-4 py-3 text-slate-600">{rp(r.overtime_pay)}</td>
                      <td className="px-4 py-3 text-slate-600">{rp(r.base_salary)}</td>
                      <td className="px-4 py-3 font-bold text-teal-700">{rp(r.total_pay)}</td>
                    </tr>
                  ))}
                  {payroll.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
                  {payroll.length > 0 && (
                    <tr className="bg-slate-50 font-bold">
                      <td className="px-4 py-3" colSpan={4}>Total</td>
                      <td className="px-4 py-3">{rp(payroll.reduce((s, r) => s + r.overtime_pay, 0))}</td>
                      <td className="px-4 py-3">{rp(payroll.reduce((s, r) => s + r.base_salary, 0))}</td>
                      <td data-testid="payroll-grand-total" className="px-4 py-3 text-teal-700">{rp(payroll.reduce((s, r) => s + r.total_pay, 0))}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
