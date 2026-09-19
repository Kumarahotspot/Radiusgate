import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import CameraCapture from "../../components/CameraCapture";
import { Plus, ScanFace, Trash2, CheckCircle2, Circle, Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function Teachers() {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [enrollFor, setEnrollFor] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", nip: "", subject: "" });
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
        name: editFor.name, nip: editFor.nip, subject: editFor.subject, active: !!editFor.active,
      });
      toast.success(t("save"));
      setEditFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const load = () => api.get("/admin/teachers").then((r) => setTeachers(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/teachers", form);
      toast.success(t("save"));
      setShowForm(false);
      setForm({ name: "", email: "", password: "", nip: "", subject: "" });
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
          <In label={t("subject")} testid="teacher-subject" v={form.subject} set={(v) => setForm({ ...form, subject: v })} />
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
                <th className="px-4 py-3">{t("email")}</th>
                <th className="px-4 py-3">{t("nip")}</th>
                <th className="px-4 py-3">{t("subject")}</th>
                <th className="px-4 py-3">{t("enroll_face")}</th>
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((tc) => (
                <tr key={tc.id} data-testid={`teacher-row-${tc.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-800">{tc.name}</td>
                  <td className="px-4 py-3 text-slate-600">{tc.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{tc.nip}</td>
                  <td className="px-4 py-3">{tc.subject}</td>
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
                      <button data-testid={`edit-teacher-${tc.id}`} onClick={() => setEditFor({ ...tc })} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg" title={t("edit")}><Pencil className="w-4 h-4" /></button>
                      <button data-testid={`delete-teacher-${tc.id}`} onClick={() => del(tc.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title={t("delete")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
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
            <In label={t("nip")} testid="edit-teacher-nip" v={editFor.nip || ""} set={(v) => setEditFor({ ...editFor, nip: v })} />
            <In label={t("subject")} testid="edit-teacher-subject" v={editFor.subject || ""} set={(v) => setEditFor({ ...editFor, subject: v })} />
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
