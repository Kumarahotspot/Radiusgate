import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { FileSpreadsheet, FileText } from "lucide-react";

export default function TeacherReports() {
  const { t } = useTranslation();
  const now = new Date();
  const [repClasses, setRepClasses] = useState([]);
  const [repClass, setRepClass] = useState("");
  const [repFrom, setRepFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [repTo, setRepTo] = useState(now.toISOString().slice(0, 10));
  const [repTab, setRepTab] = useState("daily");
  const [repRows, setRepRows] = useState([]);
  const [recapRows, setRecapRows] = useState([]);
  const [repLoaded, setRepLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/teacher/my-classes").then((r) => {
      const cls = r.data.classes || [];
      setRepClasses(cls);
      if (cls.length > 0) {
        setRepClass(cls[0]);
      }
    });
  }, []);

  const loadReport = async () => {
    setLoading(true);
    const params = { date_from: repFrom, date_to: repTo, class_name: repClass || undefined };
    try {
      const [a, rc] = await Promise.all([
        api.get("/teacher/report/attendance", { params }),
        api.get("/teacher/report/recap", { params }),
      ]);
      setRepRows(a.data);
      setRecapRows(rc.data);
      setRepLoaded(true);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const repExport = async (fmt) => {
    try {
      const r = await api.get("/teacher/report/export", {
        params: { format: fmt, date_from: repFrom, date_to: repTo, class_name: repClass || undefined },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = fmt === "xlsx" ? "laporan-siswa.xlsx" : "laporan-siswa.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div data-testid="teacher-reports-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{t("report_students_title")}</h2>
          <p className="text-xs text-slate-500">{t("teacher_classes")}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm" data-testid="student-report-card">
        {repClasses.length === 0 ? (
          <div className="p-8 text-center" data-testid="no-classes-msg">
            <p className="text-sm font-semibold text-slate-700">{t("no_classes_assigned")}</p>
            <p className="text-xs text-slate-400 mt-1">Admin sekolah dapat menambahkan kelas di menu Manajemen Guru.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-3 [&>button]:justify-center">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-500">{t("col_class")}</label>
                <select
                  data-testid="report-class"
                  value={repClass}
                  onChange={(e) => setRepClass(e.target.value)}
                  className="mt-1 w-full sm:w-44 rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600"
                >
                  <option value="">{t("all_classes")}</option>
                  {repClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("date_from")}</label>
                <input
                  data-testid="report-from"
                  type="date"
                  value={repFrom}
                  onChange={(e) => setRepFrom(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("date_to")}</label>
                <input
                  data-testid="report-to"
                  type="date"
                  value={repTo}
                  onChange={(e) => setRepTo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <button
                data-testid="report-load-btn"
                onClick={loadReport}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                {loading ? t("loading") : t("load_report")}
              </button>
              <button
                data-testid="report-export-xlsx"
                onClick={() => repExport("xlsx")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" /> {t("export_xlsx")}
              </button>
              <button
                data-testid="report-export-pdf"
                onClick={() => repExport("pdf")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
              >
                <FileText className="w-4 h-4" /> {t("export_pdf")}
              </button>
            </div>

            {repLoaded && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex gap-2 mb-4">
                  <button
                    data-testid="tab-daily"
                    onClick={() => setRepTab("daily")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      repTab === "daily" ? "bg-teal-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t("tab_daily")} ({repRows.length})
                  </button>
                  <button
                    data-testid="tab-recap"
                    onClick={() => setRepTab("recap")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      repTab === "recap" ? "bg-teal-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t("tab_recap")} ({recapRows.length})
                  </button>
                </div>

                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                  {repTab === "daily" ? (
                    <table className="w-full text-sm" data-testid="report-daily-table">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                          <th className="px-4 py-3">{t("date_from")}</th>
                          <th className="px-4 py-3">{t("name")}</th>
                          <th className="px-4 py-3">{t("col_class")}</th>
                          <th className="px-4 py-3">{t("time")}</th>
                          <th className="px-4 py-3">{t("status")}</th>
                          <th className="px-4 py-3">{t("telat")} (mnt)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repRows.map((r) => {
                          const st = r.att_status && r.att_status !== "present" ? r.att_status : r.status;
                          return (
                            <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/60" data-testid={`report-row-${r.id}`}>
                              <td className="px-4 py-2.5 text-slate-600">{r.date}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-800">{r.teacher_name}</td>
                              <td className="px-4 py-2.5 text-slate-600">{r.class}</td>
                              <td className="px-4 py-2.5 font-mono text-xs">{r.time}</td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                    st === "ok"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : st === "late"
                                      ? "bg-amber-100 text-amber-700"
                                      : st === "sakit"
                                      ? "bg-red-100 text-red-600"
                                      : "bg-sky-100 text-sky-700"
                                  }`}
                                >
                                  {st}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">{r.late_minutes || 0}</td>
                            </tr>
                          );
                        })}
                        {repRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              {t("no_data")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-sm" data-testid="report-recap-table">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                          <th className="px-4 py-3">{t("name")}</th>
                          <th className="px-4 py-3">{t("col_class")}</th>
                          <th className="px-4 py-3 text-emerald-700">{t("hadir")}</th>
                          <th className="px-4 py-3 text-amber-700">{t("telat")}</th>
                          <th className="px-4 py-3 text-red-600">{t("sakit")}</th>
                          <th className="px-4 py-3 text-sky-700">{t("izin")}</th>
                          <th className="px-4 py-3 text-rose-700">{t("alpha")}</th>
                          <th className="px-4 py-3">{t("active_days")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recapRows.map((r) => (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/60" data-testid={`recap-row-${r.id}`}>
                            <td className="px-4 py-2.5 font-semibold text-slate-800">{r.name}</td>
                            <td className="px-4 py-2.5 text-slate-600">{r.class}</td>
                            <td className="px-4 py-2.5 font-bold text-emerald-600">{r.hadir}</td>
                            <td className="px-4 py-2.5 font-bold text-amber-600">{r.telat}</td>
                            <td className="px-4 py-2.5 font-bold text-red-600">{r.sakit}</td>
                            <td className="px-4 py-2.5 font-bold text-sky-600">{r.izin}</td>
                            <td className="px-4 py-2.5 font-bold text-rose-600">{r.alpha}</td>
                            <td className="px-4 py-2.5 text-slate-600">{r.active_days}</td>
                          </tr>
                        ))}
                        {recapRows.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                              {t("no_data")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="md:hidden space-y-2">
                  {repTab === "daily" ? (
                    repRows.map((r) => {
                      const st = r.att_status && r.att_status !== "present" ? r.att_status : r.status;
                      return (
                        <div key={r.id} data-testid={`report-card-${r.id}`} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-800 truncate">{r.teacher_name}</p>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                              st === "ok" ? "bg-emerald-100 text-emerald-700" : st === "late" ? "bg-amber-100 text-amber-700"
                              : st === "sakit" ? "bg-red-100 text-red-600" : "bg-sky-100 text-sky-700"}`}>{st}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{r.date} · {r.class} · <span className="font-mono">{r.time}</span>{r.late_minutes ? ` · ${t("telat")} ${r.late_minutes} mnt` : ""}</p>
                        </div>
                      );
                    })
                  ) : (
                    recapRows.map((r) => (
                      <div key={r.id} data-testid={`recap-card-${r.id}`} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
                        <p className="text-sm font-bold text-slate-800">{r.name} <span className="text-[11px] font-normal text-slate-400">· {r.class} · {r.active_days} {t("active_days").toLowerCase()}</span></p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{t("hadir")} {r.hadir}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t("telat")} {r.telat}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{t("sakit")} {r.sakit}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">{t("izin")} {r.izin}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">{t("alpha")} {r.alpha}</span>
                        </div>
                      </div>
                    ))
                  )}
                  {(repTab === "daily" ? repRows : recapRows).length === 0 && <p className="text-center text-slate-400 text-sm py-8">{t("no_data")}</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
