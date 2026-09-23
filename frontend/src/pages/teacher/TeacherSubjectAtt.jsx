import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { Save, CheckCheck, BookOpen, Lock } from "lucide-react";

const STATUSES = ["hadir", "sakit", "izin", "alpha"];
const ON = { hadir: "bg-emerald-600 text-white border-emerald-600", sakit: "bg-red-500 text-white border-red-500", izin: "bg-sky-500 text-white border-sky-500", alpha: "bg-slate-500 text-white border-slate-500" };
const OFF = "bg-white text-slate-500 border-slate-200 hover:border-slate-400";

export default function TeacherSubjectAtt() {
  const { t } = useTranslation();
  const today = new Date().toLocaleDateString("en-CA");
  const [meta, setMeta] = useState({ subjects: [], classes: [] });
  const [date, setDate] = useState(today);
  const [subject, setSubject] = useState("");
  const [cls, setCls] = useState("");
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/teacher/subject-att/meta").then((r) => {
      setMeta(r.data);
      if (r.data.subjects.length) setSubject(r.data.subjects[0]);
      if (r.data.classes.length) setCls(r.data.classes[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!subject || !cls) return;
    api.get("/teacher/subject-att", { params: { date, subject, class_name: cls } }).then((r) => {
      setStudents(r.data.students);
      const m = {};
      r.data.students.forEach((s) => { m[s.id] = r.data.records[s.id] || (r.data.prefill || {})[s.id] || "hadir"; });
      setMarks(m);
      setSaved(r.data.saved);
      setLocked(!!r.data.locked);
    }).catch((err) => { setStudents([]); toast.error(errMsg(err)); });
  }, [date, subject, cls]);

  const save = async (lock = false) => {
    if (locked && !lock && !window.confirm(t("session_locked_confirm"))) return;
    setBusy(true);
    try {
      const records = students.map((s) => ({ student_id: s.id, status: marks[s.id] || "hadir" }));
      await api.post("/teacher/subject-att", { date, subject, class_name: cls, records, lock });
      toast.success(t("att_saved"));
      setSaved(true);
      if (lock) setLocked(true);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const count = (st) => students.filter((s) => (marks[s.id] || "hadir") === st).length;

  return (
    <div data-testid="subject-att-page" className="space-y-5">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-teal-700" /> {t("subject_att")}</h2>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("date")}</label>
          <input data-testid="sa-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("mapel")}</label>
          <select data-testid="sa-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-teal-600">
            {meta.subjects.length === 0 && <option value="">—</option>}
            {meta.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("class")}</label>
          <select data-testid="sa-class" value={cls} onChange={(e) => setCls(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-teal-600">
            {meta.classes.length === 0 && <option value="">—</option>}
            {meta.classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button data-testid="sa-all-present" onClick={() => { const m = {}; students.forEach((s) => { m[s.id] = "hadir"; }); setMarks(m); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
          <CheckCheck className="w-4 h-4" /> {t("all_present")}
        </button>
        <button data-testid="sa-save" onClick={() => save(false)} disabled={busy || !students.length}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors ml-auto">
          <Save className="w-4 h-4" /> {busy ? t("loading") : t("save")}
        </button>
        <button data-testid="sa-lock" onClick={() => save(true)} disabled={busy || !students.length}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition-colors">
          <Lock className="w-4 h-4" /> {t("lock_done")}
        </button>
      </div>

      {saved && <p data-testid="sa-saved-note" className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{t("att_edit_note")}</p>}
      {locked && <span data-testid="sa-locked-badge" className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 w-fit"><Lock className="w-3 h-3" /> {t("session_locked")}</span>}

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((st) => (
          <span key={st} data-testid={`sa-count-${st}`} className={`px-3 py-1 rounded-full text-xs font-bold ${ON[st]}`}>{t(`att_${st}`)}: {count(st)}</span>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3 w-8">#</th>
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("nis")}</th>
                <th className="px-4 py-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} data-testid={`sa-row-${s.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{s.nis}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((st) => (
                        <button key={st} data-testid={`sa-${st}-${s.id}`} onClick={() => setMarks({ ...marks, [s.id]: st })}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${(marks[s.id] || "hadir") === st ? ON[st] : OFF}`}>
                          {t(`att_${st}`)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
