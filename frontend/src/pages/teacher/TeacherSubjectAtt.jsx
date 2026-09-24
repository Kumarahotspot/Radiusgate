import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { BookOpen, Lock, LockOpen, Megaphone, Volume2, VolumeX, X } from "lucide-react";

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
  const [callIdx, setCallIdx] = useState(null);
  const [muted, setMuted] = useState(() => localStorage.getItem("sa_voice_muted") === "1");
  const speak = (text) => {
    if (muted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = 0.95;
    const g = meta.gender;
    if (g === "L" || g === "P") {
      const idv = window.speechSynthesis.getVoices().filter((v) => (v.lang || "").toLowerCase().replace("_", "-").startsWith("id"));
      const isFem = (v) => { const n = (v.name || "").toLowerCase(); return n.includes("female") || n.includes("wanita") || n.includes("perempuan") || n.includes("damayanti") || n.includes("google bahasa indonesia"); };
      const isMale = (v) => { const n = (v.name || "").toLowerCase(); return !isFem(v) && (n.includes("male") || n.includes("ardi") || n.includes("bayu")); };
      if (g === "P") {
        const v = idv.find(isFem);
        if (v) u.voice = v;
        u.pitch = 1.1;
      } else {
        const v = idv.find(isMale) || idv.find((x) => !isFem(x));
        if (v) u.voice = v;
        u.pitch = 0.9;
      }
    }
    window.speechSynthesis.speak(u);
  };
  const toggleMute = () => {
    setMuted((m) => {
      const nv = !m;
      localStorage.setItem("sa_voice_muted", nv ? "1" : "0");
      if (nv) window.speechSynthesis?.cancel();
      return nv;
    });
  };
  const closeCall = () => { setCallIdx(null); window.speechSynthesis?.cancel(); };

  useEffect(() => {
    api.get("/teacher/subject-att/meta").then((r) => {
      setMeta(r.data);
      if (r.data.subjects.length) setSubject(r.data.subjects[0]);
      if (r.data.classes.length) setCls(r.data.classes[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!subject || !cls) return;
    confirmedRef.current = false;
    api.get("/teacher/subject-att", { params: { date, subject, class_name: cls } }).then((r) => {
      setStudents(r.data.students);
      const m = {};
      r.data.students.forEach((s) => { m[s.id] = r.data.records[s.id] || (r.data.prefill || {})[s.id] || "hadir"; });
      setMarks(m);
      setSaved(r.data.saved);
      setLocked(!!r.data.locked);
    }).catch((err) => { setStudents([]); toast.error(errMsg(err)); });
  }, [date, subject, cls]);

  const confirmedRef = useRef(false);

  const autoSave = async (studentId, status) => {
    if (locked && !confirmedRef.current) {
      if (!window.confirm(t("session_locked_confirm"))) return;
      confirmedRef.current = true;
    }
    const prev = marks[studentId] || "hadir";
    setMarks({ ...marks, [studentId]: status });
    try {
      await api.post("/teacher/subject-att", { date, subject, class_name: cls, records: [{ student_id: studentId, status }] });
      setSaved(true);
    } catch (err) {
      setMarks((m) => ({ ...m, [studentId]: prev }));
      toast.error(errMsg(err));
    }
  };

  useEffect(() => {
    if (callIdx !== null && students[callIdx]) speak(students[callIdx].name);
  }, [callIdx]); // eslint-disable-line

  const save = async (lock = null) => {
    setBusy(true);
    try {
      const records = students.map((s) => ({ student_id: s.id, status: marks[s.id] || "hadir" }));
      await api.post("/teacher/subject-att", { date, subject, class_name: cls, records, lock });
      toast.success(t("att_saved"));
      setSaved(true);
      if (lock === true) setLocked(true);
      if (lock === false) setLocked(false);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const count = (st) => students.filter((s) => (marks[s.id] || "hadir") === st).length;

  return (
    <div data-testid="subject-att-page" className="space-y-5">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-teal-700" /> {t("subject_att")}</h2>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-3">
        <div className="min-w-0">
          <label className="text-xs font-semibold text-slate-500">{t("date")}</label>
          <input data-testid="sa-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
        </div>
        <div className="min-w-0">
          <label className="text-xs font-semibold text-slate-500">{t("mapel")}</label>
          <select data-testid="sa-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-teal-600">
            {meta.subjects.length === 0 && <option value="">—</option>}
            {meta.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="min-w-0 col-span-2 sm:col-span-1">
          <label className="text-xs font-semibold text-slate-500">{t("class")}</label>
          <select data-testid="sa-class" value={cls} onChange={(e) => setCls(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-teal-600">
            {meta.classes.length === 0 && <option value="">—</option>}
            {meta.classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 [&>button]:justify-center">
        <button data-testid="sa-call-start" onClick={() => setCallIdx(0)} disabled={!students.length}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition-colors">
          <Megaphone className="w-4 h-4" /> {t("call_start")}
        </button>
        {locked ? (
          <button data-testid="sa-lock" onClick={() => { if (window.confirm(t("unlock_confirm"))) save(false); }} disabled={busy || !students.length}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 border border-slate-300 hover:bg-slate-300 disabled:opacity-50 transition-colors">
            <Lock className="w-4 h-4" /> {t("unlock_session")}
          </button>
        ) : (
          <button data-testid="sa-lock" onClick={() => save(true)} disabled={busy || !students.length}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition-colors">
            <LockOpen className="w-4 h-4" /> {t("lock_done")}
          </button>
        )}
        </div>
      </div>

      {saved && <p data-testid="sa-saved-note" className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{t("att_edit_note")}</p>}
      {locked && <span data-testid="sa-locked-badge" className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 w-fit"><Lock className="w-3 h-3" /> {t("session_locked")}</span>}

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((st) => (
          <span key={st} data-testid={`sa-count-${st}`} className={`px-3 py-1 rounded-full text-xs font-bold ${ON[st]}`}>{t(`att_${st}`)}: {count(st)}</span>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
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
                        <button key={st} data-testid={`sa-${st}-${s.id}`} onClick={() => autoSave(s.id, st)}
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

      <div className="md:hidden space-y-2.5">
        {students.map((s, i) => (
          <div key={s.id} data-testid={`sa-card-${s.id}`} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}.</span>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{s.name}</p>
                <p className="text-[11px] font-mono text-slate-400">NIS {s.nis}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((st) => (
                <button key={st} data-testid={`sa-m-${st}-${s.id}`} onClick={() => autoSave(s.id, st)}
                  className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${(marks[s.id] || "hadir") === st ? ON[st] : OFF}`}>
                  {t(`att_${st}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
        {students.length === 0 && <p className="text-center text-slate-400 text-sm py-8">{t("no_data")}</p>}
      </div>

      {callIdx !== null && students[callIdx] && (
        <div data-testid="sa-call-modal" className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span data-testid="sa-call-progress" className="text-xs font-bold text-slate-400">{callIdx + 1} / {students.length}</span>
              <div className="flex items-center gap-1">
                <button data-testid="sa-call-mute" onClick={toggleMute} title={t(muted ? "kiosk_unmute" : "kiosk_mute")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition-colors">
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button data-testid="sa-call-close" onClick={closeCall} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${((callIdx + 1) / students.length) * 100}%` }} />
            </div>
            <div className="text-center mb-6">
              <span className="inline-flex w-16 h-16 rounded-full bg-teal-700/10 text-teal-800 text-xl font-extrabold items-center justify-center mb-3">
                {students[callIdx].name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <p data-testid="sa-call-name" className="text-2xl font-extrabold text-slate-800">{students[callIdx].name}</p>
              <p className="text-sm text-slate-400 font-mono mt-1">NIS {students[callIdx].nis}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {STATUSES.map((st) => (
                <button key={st} data-testid={`sa-call-${st}`}
                  onClick={() => {
                    autoSave(students[callIdx].id, st);
                    if (callIdx + 1 < students.length) setCallIdx(callIdx + 1);
                    else { closeCall(); toast.success(t("call_done")); }
                  }}
                  className={`py-4 rounded-2xl text-sm font-extrabold border-2 transition-all ${(marks[students[callIdx].id] || "hadir") === st ? ON[st] : OFF}`}>
                  {t(`att_${st}`)}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-5">
              <button data-testid="sa-call-prev" disabled={callIdx === 0} onClick={() => setCallIdx(callIdx - 1)}
                className="text-xs font-bold text-slate-500 hover:text-teal-700 disabled:opacity-30 transition-colors">← {t("call_prev")}</button>
              <button data-testid="sa-call-skip" onClick={() => callIdx + 1 < students.length ? setCallIdx(callIdx + 1) : closeCall()}
                className="text-xs font-bold text-slate-500 hover:text-teal-700 transition-colors">{t("call_skip")} →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
