import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import MonthYearPicker from "../../components/MonthYearPicker";
import { AlertTriangle, Download, Clock } from "lucide-react";

export default function Pppk() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(new Date().toLocaleDateString("en-CA").slice(0, 7));
  const [data, setData] = useState({ employees: [], max_hours_week: 35 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/admin/pppk/recap", { params: { month } })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(errMsg(e)));
  }, [month]);

  const download = async () => {
    setBusy(true);
    try {
      const r = await api.get("/admin/pppk/daftar-hadir/pdf", { params: { month }, responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daftar-hadir-pppk-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const totalPay = data.employees.reduce((s, e) => s + (e.total_pay || 0), 0);
  const totalHours = data.employees.reduce((s, e) => s + (e.hours || 0), 0);

  return (
    <div data-testid="pppk-page" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{t("recap_pppk_title")}</h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {t("max_hours_week")}: {data.max_hours_week} {t("hours") || "jam"}
          </p>
        </div>
        <div className="flex items-end gap-3">
          <MonthYearPicker testid="pppk-month" value={month} onChange={(v) => v && setMonth(v)} allowEmpty={false} />
          <button data-testid="pppk-download-pdf" onClick={download} disabled={busy}
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" /> {t("daftar_hadir")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("pegawai_menu")}</p>
          <p data-testid="pppk-stat-employees" className="text-2xl font-extrabold text-slate-800 mt-1">{data.employees.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("work_hours")}</p>
          <p data-testid="pppk-stat-hours" className="text-2xl font-extrabold text-slate-800 mt-1">{Math.round(totalHours * 10) / 10}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("total_pay")}</p>
          <p data-testid="pppk-stat-pay" className="text-2xl font-extrabold text-emerald-700 mt-1">Rp {totalPay.toLocaleString("id-ID")}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("nip")}</th>
                <th className="px-4 py-3">{t("department")}</th>
                <th className="px-4 py-3">{t("days_present")}</th>
                <th className="px-4 py-3">{t("work_hours")}</th>
                <th className="px-4 py-3">{t("hourly_rate")}</th>
                <th className="px-4 py-3">{t("total_pay")}</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((e) => (
                <tr key={e.id} data-testid={`pppk-row-${e.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{e.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{e.nip || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-slate-600">{e.department || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-slate-600">{e.days}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-800">{e.hours}j</td>
                  <td className="px-4 py-2.5 text-slate-600">{e.hourly_rate ? `Rp ${Number(e.hourly_rate).toLocaleString("id-ID")}` : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2.5 font-bold text-emerald-700">Rp {Number(e.total_pay || 0).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-2.5">
                    {e.over_weeks?.length ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <AlertTriangle className="w-3 h-3" /> {t("over_limit")}: {t("week_label")} {e.over_weeks.join(", ")}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.employees.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
