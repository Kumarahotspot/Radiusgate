import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import CameraCapture from "../../components/CameraCapture";
import { Plus, Upload, Download, Trash2, X, Pencil, ScanFace, CheckCircle2, Circle, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function Students() {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ name: "", nis: "", nisn: "", gender: "", class_name: "" });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editFor, setEditFor] = useState(null);

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/admin/students/${editFor.id}`, { name: editFor.name, nis: editFor.nis, nisn: editFor.nisn, gender: editFor.gender, class_name: editFor.class });
      toast.success(t("save"));
      setEditFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const [enrollFor, setEnrollFor] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [pageSize, setPageSize] = useState(10);
  const q = query.trim().toLowerCase();
  const filtered = students.filter((s) => !q || [s.name, s.nis, s.nisn, s.class].some((f) => (f || "").toLowerCase().includes(q)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const enroll = async (photo) => {
    try {
      await api.post(`/admin/students/${enrollFor.id}/enroll`, { photo });
      toast.success(t("enroll_success"));
      setEnrollFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const fileRef = useRef(null);

  const load = () => api.get("/admin/students").then((r) => setStudents(r.data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/students", form);
      setForm({ name: "", nis: "", nisn: "", gender: "", class_name: "" });
      toast.success(t("save"));
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    await api.delete(`/admin/students/${id}`);
    load();
  };

  const toggleAll = () => {
    const next = new Set(selected);
    const allSel = paged.length > 0 && paged.every((s) => selected.has(s.id));
    paged.forEach((s) => (allSel ? next.delete(s.id) : next.add(s.id)));
    setSelected(next);
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const bulkDelete = async () => {
    if (!selected.size || !window.confirm(t("confirm_delete_many", { count: selected.size }))) return;
    try {
      await api.post("/admin/students/bulk-delete", { ids: [...selected] });
      toast.success(t("deleted_ok"));
      setSelected(new Set());
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    setBusy(true);
    try {
      const { data } = await api.post("/admin/students/import/preview", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setPreview(data);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); e.target.value = ""; }
  };

  const doExport = async () => {
    try {
      const res = await api.get("/admin/students/export", { params: { format: "xlsx" }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "siswa.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/admin/students/import/commit", { rows: preview.valid });
      toast.success(`${t("commit_import")}: ${data.inserted}`);
      setPreview(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div data-testid="students-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">{t("students")} <span data-testid="student-total" className="text-teal-700">({students.length})</span></h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button data-testid="bulk-delete-btn" onClick={bulkDelete}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
              <Trash2 className="w-4 h-4" /> {t("delete_selected")} ({selected.size})
            </button>
          )}
          <button data-testid="export-btn" onClick={doExport}
            className="flex items-center gap-1.5 bg-white border border-teal-700 text-teal-700 hover:bg-teal-50 text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            <Download className="w-4 h-4" /> {t("export_file")}
          </button>
          <button data-testid="import-btn" onClick={() => fileRef.current?.click()} disabled={busy}
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
            <Upload className="w-4 h-4" /> {busy ? t("loading") : t("import_file")}
          </button>
        </div>
        <input ref={fileRef} data-testid="import-file-input" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={pickFile} />
      </div>

      <form onSubmit={add} data-testid="add-student-form" className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
        <In label={t("name")} testid="student-name" v={form.name} set={(v) => setForm({ ...form, name: v })} req grow />
        <In label={t("nis")} testid="student-nis" v={form.nis} set={(v) => setForm({ ...form, nis: v })} />
        <In label={t("nisn")} testid="student-nisn" v={form.nisn} set={(v) => setForm({ ...form, nisn: v })} />
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("gender")}</label>
          <select data-testid="student-gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition bg-white">
            <option value="">-</option>
            <option value="L">{t("gender_l")}</option>
            <option value="P">{t("gender_p")}</option>
          </select>
        </div>
        <In label={t("class")} testid="student-class" v={form.class_name} set={(v) => setForm({ ...form, class_name: v })} />
        <button data-testid="student-submit" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800">
          <Plus className="w-4 h-4" /> {t("add_student")}
        </button>
      </form>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input data-testid="student-search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder={t("search_students")}
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">{t("show_entries")}</span>
        <select data-testid="student-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition">
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" data-testid="select-all-students" className="accent-teal-700 w-4 h-4 cursor-pointer"
                    checked={paged.length > 0 && paged.every((s) => selected.has(s.id))} onChange={toggleAll} />
                </th>
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("nis")}</th>
                <th className="px-4 py-3">{t("nisn")}</th>
                <th className="px-4 py-3">{t("gender_short")}</th>
                <th className="px-4 py-3">{t("class")}</th>
                <th className="px-4 py-3">{t("enroll_face")}</th>
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => (
                <tr key={s.id} className={`border-b last:border-0 hover:bg-slate-50/60 ${selected.has(s.id) ? "bg-teal-50/60" : ""}`}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" data-testid={`select-student-${s.id}`} className="accent-teal-700 w-4 h-4 cursor-pointer"
                      checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} />
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.nis}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.nisn || "-"}</td>
                  <td className="px-4 py-2.5" data-testid={`student-gender-cell-${s.id}`}>{s.gender || "-"}</td>
                  <td className="px-4 py-2.5">{s.class}</td>
                  <td className="px-4 py-2.5">
                    <span data-testid={`student-enroll-status-${s.id}`} className={`inline-flex items-center gap-1 text-xs font-bold ${s.enrolled ? "text-emerald-600" : "text-slate-400"}`}>
                      {s.enrolled ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {s.enrolled ? t("enrolled") : t("not_enrolled")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button data-testid={`enroll-student-${s.id}`} onClick={() => setEnrollFor(s)} className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg" title={t("enroll_face")}><ScanFace className="w-4 h-4" /></button>
                      <button data-testid={`edit-student-${s.id}`} onClick={() => setEditFor({ ...s })} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg" title={t("edit")}><Pencil className="w-4 h-4" /></button>
                      <button data-testid={`delete-student-${s.id}`} onClick={() => del(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title={t("delete")}><Trash2 className="w-4 h-4" /></button>
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
            <p data-testid="student-page-info" className="text-xs text-slate-500">
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} {t("of")} {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button data-testid="student-prev-page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <span data-testid="student-page-num" className="text-xs font-bold text-slate-700 px-1">{safePage}/{totalPages}</span>
              <button data-testid="student-next-page" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {enrollFor && <CameraCapture testid="enroll-student-camera" onDone={enroll} onClose={() => setEnrollFor(null)} />}

      {editFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="edit-student-modal">
          <form onSubmit={saveEdit} data-testid="edit-student-form" className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <p className="font-bold text-slate-800">{t("edit_student")}</p>
            <In label={t("name")} testid="edit-student-name" v={editFor.name} set={(v) => setEditFor({ ...editFor, name: v })} req grow />
            <div className="grid grid-cols-2 gap-3">
              <In label={t("nis")} testid="edit-student-nis" v={editFor.nis || ""} set={(v) => setEditFor({ ...editFor, nis: v })} grow />
              <In label={t("nisn")} testid="edit-student-nisn" v={editFor.nisn || ""} set={(v) => setEditFor({ ...editFor, nisn: v })} grow />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("gender")}</label>
                <select data-testid="edit-student-gender" value={editFor.gender || ""} onChange={(e) => setEditFor({ ...editFor, gender: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition bg-white">
                  <option value="">-</option>
                  <option value="L">{t("gender_l")}</option>
                  <option value="P">{t("gender_p")}</option>
                </select>
              </div>
              <In label={t("class")} testid="edit-student-class" v={editFor.class || ""} set={(v) => setEditFor({ ...editFor, class: v })} grow />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" data-testid="edit-student-cancel" onClick={() => setEditFor(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
              <button data-testid="edit-student-submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{busy ? t("loading") : t("save")}</button>
            </div>
          </form>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="import-preview-modal">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <p className="font-bold text-slate-800">{t("import_preview")}</p>
              <button data-testid="import-preview-close" onClick={() => setPreview(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-3 flex gap-4 text-sm border-b bg-slate-50">
              <span data-testid="preview-valid-count" className="font-bold text-emerald-600">{t("valid_rows")}: {preview.valid.length}</span>
              <span data-testid="preview-error-count" className="font-bold text-red-500">{t("error_rows")}: {preview.errors.length}</span>
            </div>
            <div className="overflow-auto flex-1 px-5 py-3">
              {preview.errors.length > 0 && (
                <div className="mb-3 text-xs text-red-600 space-y-0.5">
                  {preview.errors.slice(0, 20).map((er, i) => <p key={i}>{t("row")} {er.row}: {er.message}</p>)}
                </div>
              )}
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-slate-500 border-b"><th className="py-2 pr-3">{t("name")}</th><th className="py-2 pr-3">{t("nis")}</th><th className="py-2 pr-3">{t("nisn")}</th><th className="py-2 pr-3">{t("gender_short")}</th><th className="py-2">{t("class")}</th></tr></thead>
                <tbody>
                  {preview.valid.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-b last:border-0"><td className="py-1.5 pr-3">{r.name}</td><td className="py-1.5 pr-3 font-mono text-xs">{r.nis}</td><td className="py-1.5 pr-3 font-mono text-xs">{r.nisn || "-"}</td><td className="py-1.5 pr-3">{r.gender || "-"}</td><td className="py-1.5">{r.class}</td></tr>
                  ))}
                </tbody>
              </table>
              {preview.valid.length > 100 && <p className="text-xs text-slate-400 mt-2">+{preview.valid.length - 100}...</p>}
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setPreview(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
              <button data-testid="import-commit-btn" onClick={commit} disabled={busy || preview.valid.length === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">
                {t("commit_import")} ({preview.valid.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function In({ label, v, set, req, grow, testid }) {
  return (
    <div className={grow ? "flex-1 min-w-[180px]" : ""}>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <input data-testid={testid} required={req} value={v} onChange={(e) => set(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
    </div>
  );
}
