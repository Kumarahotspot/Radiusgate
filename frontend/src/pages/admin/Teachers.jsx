import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import CameraCapture from "../../components/CameraCapture";
import QrModal from "../../components/QrModal";
import { Plus, ScanFace, Trash2, CheckCircle2, Circle, Pencil, Search, ChevronLeft, ChevronRight, QrCode, Nfc } from "lucide-react";

export default function Teachers() {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [enrollFor, setEnrollFor] = useState(null);
  const [qrFor, setQrFor] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", nip: "", subject: "", classes: "", gender: "", card_uid: "" });
  const [subjectOther, setSubjectOther] = useState("");
  const [opts, setOpts] = useState({ classes: [], subjects: [] });
  const [busy, setBusy] = useState(false);
  const [editFor, setEditFor] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const q = query.trim().toLowerCase();
  const filtered = teachers.filter((tc) => !q || [tc.name, tc.email, tc.nip, tc.subject].some((f) => (f || "").toLowerCase().includes(q)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/admin/teachers/${editFor.id}`, {
        name: editFor.name, nip: editFor.nip,
        subject: [editFor.subject, (editFor.subject_other || "").trim()].filter(Boolean).join(", "),
        active: !!editFor.active, classes: editFor.classes || "", card_uid: editFor.card_uid || "",
        ...(editFor.gender ? { gender: editFor.gender } : {}),
        ...(editFor.new_password?.trim() ? { password: editFor.new_password.trim() } : {}),
      });
      toast.success(t("save"));
      setEditFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const load = () => {
    api.get("/admin/teachers").then((r) => setTeachers(r.data));
    api.get("/admin/meta/options").then((r) => setOpts(r.data));
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const subject = [form.subject, subjectOther.trim()].filter(Boolean).join(", ");
      await api.post("/admin/teachers", { ...form, subject });
      toast.success(t("save"));
      setShowForm(false);
      setForm({ name: "", email: "", password: "", nip: "", subject: "", classes: "", gender: "" });
      setSubjectOther("");
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const enroll = async (photo) => {
    try {
      await api.post(`/admin/teachers/${enrollFor.id}/enroll`, { photo });
      toast.success(t("enroll_success"));
      setEnrollFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    await api.delete(`/admin/teachers/${id}`);
    load();
  };

  return (
    <div data-testid="teachers-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{t("teachers")}</h2>
        <button data-testid="add-teacher-btn" onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> {t("add_teacher")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} data-testid="add-teacher-form" className="bg-white rounded-2xl border border-slate-200 p-5 grid sm:grid-cols-3 gap-4">
          <In label={t("name")} testid="teacher-name" v={form.name} set={(v) => setForm({ ...form, name: v })} req />
          <In label={t("email")} testid="teacher-email" type="email" v={form.email} set={(v) => setForm({ ...form, email: v })} req />
          <In label={t("password")} testid="teacher-password" v={form.password} set={(v) => setForm({ ...form, password: v })} req />
          <In label={t("nip")} testid="teacher-nip" v={form.nip} set={(v) => setForm({ ...form, nip: v })} />
          <In label={t("card_uid")} testid="teacher-card-uid" v={form.card_uid} set={(v) => setForm({ ...form, card_uid: v })} />
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("gender")}</label>
            <select data-testid="teacher-gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition bg-white">
              <option value="">-</option>
              <option value="L">{t("gender_l")}</option>
              <option value="P">{t("gender_p")}</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <CheckGroup label={t("subject")} testid="teacher-subject" options={opts.subjects} value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} />
            <input data-testid="teacher-subject-other" value={subjectOther} placeholder={t("subject_other")} onChange={(e) => setSubjectOther(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
          </div>
          <div className="sm:col-span-3">
            <CheckGroup label={t("teacher_classes")} testid="teacher-classes" options={opts.classes} value={form.classes} onChange={(v) => setForm({ ...form, classes: v })} emptyHint={t("classes_empty_hint")} />
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
            <button data-testid="teacher-submit" disabled={busy} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{t("save")}</button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input data-testid="teacher-search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder={t("search_teachers")}
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">{t("show_entries")}</span>
        <select data-testid="teacher-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition">
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("gender_short")}</th>
                <th className="px-4 py-3">{t("email")}</th>
                <th className="px-4 py-3">{t("nip")}</th>
                <th className="px-4 py-3">{t("subject")}</th>
                <th className="px-4 py-3">{t("col_class")}</th>
                <th className="px-4 py-3">{t("enroll_face")}</th>
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((tc) => (
                <tr key={tc.id} data-testid={`teacher-row-${tc.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-800">{tc.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${tc.gender === "L" ? "bg-sky-50 text-sky-700 border border-sky-200" : tc.gender === "P" ? "bg-pink-50 text-pink-700 border border-pink-200" : "text-slate-400"}`}>
                      {tc.gender === "L" ? t("gender_l") : tc.gender === "P" ? t("gender_p") : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{tc.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{tc.nip}</td>
                  <td className="px-4 py-3">{tc.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{tc.classes || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span data-testid={`enroll-status-${tc.id}`} className={`inline-flex items-center gap-1 text-xs font-bold ${tc.enrolled ? "text-emerald-600" : "text-slate-400"}`}>
                      {tc.enrolled ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {tc.enrolled ? t("enrolled") : t("not_enrolled")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button data-testid={`enroll-btn-${tc.id}`} onClick={() => setEnrollFor(tc)}
                        className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:bg-teal-50 px-2 py-1.5 rounded-lg transition-colors">
                        <ScanFace className="w-4 h-4" /> {t("enroll_face")}
                      </button>
                      <button data-testid={`qr-teacher-${tc.id}`} onClick={() => setQrFor(tc)}
                        className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors">
                        <QrCode className="w-4 h-4" /> {t("qr_code")}
                      </button>
                      <span data-testid={`card-teacher-${tc.id}`} title={tc.card_uid ? `${t("card_registered")}: ${tc.card_uid}` : t("card_not_registered")}
                        className={`flex items-center px-2 py-1.5 ${tc.card_uid ? "text-teal-600" : "text-slate-300"}`}>
                        <Nfc className="w-4 h-4" />
                      </span>
                      <button data-testid={`edit-teacher-${tc.id}`} onClick={() => setEditFor({ ...tc })}
                        className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:bg-sky-50 px-2 py-1.5 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" /> {t("edit")}
                      </button>
                      <button data-testid={`delete-teacher-${tc.id}`} onClick={() => del(tc.id)}
                        className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" /> {t("delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/60">
            <p data-testid="teacher-page-info" className="text-xs text-slate-500">
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} {t("of")} {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button data-testid="teacher-prev-page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <span data-testid="teacher-page-num" className="text-xs font-bold text-slate-700 px-1">{safePage}/{totalPages}</span>
              <button data-testid="teacher-next-page" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {editFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="edit-teacher-modal">
          <form onSubmit={saveEdit} data-testid="edit-teacher-form" className="bg-white rounded-2xl w-full max-w-md p-5 grid sm:grid-cols-2 gap-4">
            <p className="sm:col-span-2 font-bold text-slate-800">{t("edit_teacher")}</p>
            <In label={t("name")} testid="edit-teacher-name" v={editFor.name} set={(v) => setEditFor({ ...editFor, name: v })} req />
            <In label={t("new_password_opt")} testid="edit-teacher-password" v={editFor.new_password || ""} set={(v) => setEditFor({ ...editFor, new_password: v })} />
            <In label={t("nip")} testid="edit-teacher-nip" v={editFor.nip || ""} set={(v) => setEditFor({ ...editFor, nip: v })} />
            <In label={t("card_uid")} testid="edit-teacher-card-uid" v={editFor.card_uid || ""} set={(v) => setEditFor({ ...editFor, card_uid: v })} />
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("gender")}</label>
              <select data-testid="edit-teacher-gender" value={editFor.gender || ""} onChange={(e) => setEditFor({ ...editFor, gender: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition bg-white">
                <option value="">-</option>
                <option value="L">{t("gender_l")}</option>
                <option value="P">{t("gender_p")}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <CheckGroup label={t("subject")} testid="edit-teacher-subject" options={opts.subjects} value={editFor.subject || ""} onChange={(v) => setEditFor({ ...editFor, subject: v })} />
              <input data-testid="edit-teacher-subject-other" value={editFor.subject_other || ""} placeholder={t("subject_other")} onChange={(e) => setEditFor({ ...editFor, subject_other: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            </div>
            <div className="sm:col-span-2">
              <CheckGroup label={t("teacher_classes")} testid="edit-teacher-classes" options={opts.classes} value={editFor.classes || ""} onChange={(v) => setEditFor({ ...editFor, classes: v })} emptyHint={t("classes_empty_hint")} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 self-end pb-2.5">
              <input data-testid="edit-teacher-active" type="checkbox" checked={!!editFor.active} onChange={(e) => setEditFor({ ...editFor, active: e.target.checked })} className="accent-teal-700 w-4 h-4" />
              {t("active")}
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" data-testid="edit-teacher-cancel" onClick={() => setEditFor(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
              <button data-testid="edit-teacher-submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{busy ? t("loading") : t("save")}</button>
            </div>
          </form>
        </div>
      )}

      {enrollFor && <CameraCapture testid="enroll-camera" onDone={enroll} onClose={() => setEnrollFor(null)} />}
      {qrFor && <QrModal person={qrFor} ptype="teacher" onClose={() => setQrFor(null)} />}
    </div>
  );
}

function CheckGroup({ label, options, value, onChange, testid, emptyHint }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const sel = new Set((value || "").split(",").map((s) => s.trim()).filter(Boolean));
  const toggle = (opt) => {
    if (sel.has(opt)) sel.delete(opt); else sel.add(opt);
    onChange([...sel].join(", "));
  };
  const all = [...[...sel].sort(), ...options.filter((o) => !sel.has(o)).sort()];
  const shown = q.trim() ? all.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())) : all;
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      {sel.size > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {[...sel].sort().map((s) => (
            <span key={s} data-testid={`${testid}-chip-${s}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-1">
              {s}
              <button type="button" data-testid={`${testid}-remove-${s}`} onClick={() => toggle(s)}
                className="text-teal-500 hover:text-red-600 font-extrabold leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      {all.length > 6 && (
        <input data-testid={`${testid}-search`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_options")}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-600" />
      )}
      <div data-testid={testid} className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white">
        {shown.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" data-testid={`${testid}-${o}`} checked={sel.has(o)} onChange={() => toggle(o)} className="accent-teal-700 w-4 h-4" />
            {o}
          </label>
        ))}
        {shown.length === 0 && <p className="col-span-full text-xs text-slate-400">{emptyHint || "—"}</p>}
      </div>
    </div>
  );
}


function In({ label, v, set, type = "text", req, testid }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <input data-testid={testid} type={type} required={req} value={v} onChange={(e) => set(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
    </div>
  );
}
