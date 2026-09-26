import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import MonthYearPicker from "../../components/MonthYearPicker";
import { AlertTriangle, Download, FileWarning } from "lucide-react";

export default function Warnings() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(new Date().toLocaleDateString("en-CA").slice(0, 7));
  const [data, setData] = useState({ thresholds: {}, candidates: [] });
  const [issued, setIssued] = useState([]);
  const [busy, setBusy] = useState("");

  const load = () => {
    api.get("/admin/warnings/candidates", { params: { month } }).then((r) => setData(r.data));
    api.get("/admin/warnings", { params: { month } }).then((r) => setIssued(r.data));
  };
  useEffect(() => { load(); }, [month]);

  const issue = async (cand, level) => {
    setBusy(cand.person_id + level);
    try {
      await api.post("/admin/warnings/issue", { person_id: cand.person_id, person_type: cand.person_type, month, level });
      toast.success(t("sp_issued_ok"));
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(""); }
  };

  const download = async (wl) => {
    try {
      const r = await api.get(`/admin/warnings/${wl.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${wl.level}-${wl.name}-${wl.month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const lvlColor = { SP1: "bg-amber-100 text-amber-700", SP2: "bg-orange-100 text-orange-700", SP3: "bg-red-100 text-red-700" };

  return (
    <div data-testid="warnings-page" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">{t("warnings_menu")}</h2>
        <MonthYearPicker testid="sp-month" value={month} onChange={(v) => v && setMonth(v)} allowEmpty={false} />
      </div>
      <p className="text-xs text-slate-500">
        {t("sp_thresholds")}: SP1 ≥ {data.thresholds.SP1 || 3}x · SP2 ≥ {data.thresholds.SP2 || 6}x · SP3 ≥ {data.thresholds.SP3 || 10}x
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <p className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 border-b bg-slate-50 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> {t("sp_candidates")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("type")}</th>
                <th className="px-4 py-3">{t("sp_late_count")}</th>
                <th className="px-4 py-3">{t("sp_issued_list")}</th>
                <th className="px-4 py-3">{t("sp_suggested")}</th>
              </tr>
            </thead>
            <tbody>
              {data.candidates.map((c) => (
                <tr key={c.person_id} data-testid={`sp-candidate-${c.person_id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{c.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c.person_type === "employee" ? t("employee_singular") || "Karyawan" : t("teacher_singular") || "Guru"}</td>
                  <td className="px-4 py-2.5 font-bold text-amber-600">{c.late_count}x</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {c.issued_levels.map((lv) => (
                        <span key={lv} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${lvlColor[lv]}`}>{lv}</span>
                      ))}
                      {c.issued_levels.length === 0 && <span className="text-slate-300">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {c.suggested ? (
                      <button data-testid={`sp-issue-${c.person_id}`} disabled={busy === c.person_id + c.suggested}
                        onClick={() => issue(c, c.suggested)}
                        className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        <FileWarning className="w-3.5 h-3.5" /> {t("sp_issue")} {c.suggested}
                      </button>
                    ) : <span className="text-xs text-slate-400">{t("sp_already_issued")}</span>}
                  </td>
                </tr>
              ))}
              {data.candidates.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("sp_none")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <p className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 border-b bg-slate-50">{t("sp_issued_list")} — {month}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("sp_level")}</th>
                <th className="px-4 py-3">{t("sp_late_count")}</th>
                <th className="px-4 py-3">HRD</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {issued.map((wl) => (
                <tr key={wl.id} data-testid={`sp-issued-${wl.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{wl.name}</td>
                  <td className="px-4 py-2.5"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${lvlColor[wl.level]}`}>{wl.level}</span></td>
                  <td className="px-4 py-2.5 text-slate-600">{wl.late_count}x</td>
                  <td className="px-4 py-2.5 text-slate-600">{wl.issued_by}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button data-testid={`sp-download-${wl.id}`} onClick={() => download(wl)}
                      className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors ml-auto">
                      <Download className="w-3.5 h-3.5" /> {t("sp_download")}
                    </button>
                  </td>
                </tr>
              ))}
              {issued.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
