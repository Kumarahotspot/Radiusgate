import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import CameraCapture from "../../components/CameraCapture";
import QrModal from "../../components/QrModal";
import { Plus, Upload, Download, Trash2, X, Pencil, ScanFace, CheckCircle2, Circle, Search, ChevronLeft, ChevronRight, GraduationCap, FileDown, MessageCircle, QrCode } from "lucide-react";

function ClassSelect({ testid, value, onChange, options, t, req }) {
  const [isNew, setIsNew] = useState(false);
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500">{t("class")}</label>
      <select data-testid={testid} required={req} value={isNew ? "__new__" : value}
        onChange={(e) => { if (e.target.value === "__new__") { setIsNew(true); onChange(""); } else { setIsNew(false); onChange(e.target.value); } }}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
        <option value="">—</option>
        {options.map((c) => <option key={c} value={c}>{c}</option>)}
        <option value="__new__">{t("new_class_option")}</option>
      </select>
      {isNew && (
        <input data-testid={`${testid}-new`} autoFocus value={value} placeholder={t("new_class_placeholder")}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-teal-300 px-3 py-2 text-sm outline-none focus:border-teal-600" />
      )}
    </div>
  );
}

export default function Students() {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ name: "", nis: "", nisn: "", gender: "", class_name: "", parent_phone: "", parent_name: "", parent_email: "", address: "", card_uid: "" });
  const [metaClasses, setMetaClasses] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editFor, setEditFor] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const PHONE_RE = /^(\+?62|0)8\d{7,12}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validContacts = (phone, email) => {
    if (phone && !PHONE_RE.test(phone.replace(/[\s.\-]/g, ""))) { toast.error(t("invalid_phone")); return false; }
    if (email && !EMAIL_RE.test(email)) { toast.error(t("invalid_email")); return false; }
    return true;
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editFor.gender || !editFor.class) { toast.error(t("required_gender_class")); return; }
    if (!validContacts(editFor.parent_phone, editFor.parent_email)) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/students/${editFor.id}`, { name: editFor.name, nis: editFor.nis, nisn: editFor.nisn, gender: editFor.gender, class_name: editFor.class, parent_phone: editFor.parent_phone || "", parent_name: editFor.parent_name || "", parent_email: editFor.parent_email || "", address: editFor.address || "", card_uid: editFor.card_uid || "" });
      if (data.parent_account === "created") toast.success(t("parent_account_created"));
      if (data.parent_account === "phone_used") toast.error(t("parent_phone_used"));
      toast.success(t("save"));
      setEditFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const [enrollFor, setEnrollFor] = useState(null);
  const [qrFor, setQrFor] = useState(null);
  const [query, setQuery] = useState("");

  // dukung lompat dari kartu kelengkapan data di Dasbor: /admin/students?q=<kelas>
  useEffect(() => {
    const q0 = new URLSearchParams(window.location.search).get("q");
    if (q0) setQuery(q0);
  }, []);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [showGrad, setShowGrad] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ from_class: "", to_class: "" });
  const [pageSize, setPageSize] = useState(10);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [zipFile, setZipFile] = useState(null);
  const [mapFile, setMapFile] = useState(null);
  const [bulkReport, setBulkReport] = useState(null);
  const q = query.trim().toLowerCase();
  const filtered = students.filter((s) => (showGrad || s.status !== "lulus") && (!q || [s.name, s.nis, s.nisn, s.class, s.parent_phone].some((f) => (f || "").toLowerCase().includes(q))));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const classes = metaClasses ?? [...new Set(students.filter((s) => s.status !== "lulus").map((s) => s.class).filter(Boolean))].sort();

  const enroll = async (photo) => {
    try {
      await api.post(`/admin/students/${enrollFor.id}/enroll`, { photo });
      toast.success(t("enroll_success"));
      setEnrollFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const fileRef = useRef(null);

  const load = () => {
    api.get("/admin/students").then((r) => setStudents(r.data));
    api.get("/admin/meta/options").then((r) => setMetaClasses(r.data.classes));
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.gender || !form.class_name) { toast.error(t("required_gender_class")); return; }
    if (!validContacts(form.parent_phone, form.parent_email)) return;
    try {
      const { data } = await api.post("/admin/students", form);
      if (data.parent_account === "created") toast.success(t("parent_account_created"));
      if (data.parent_account === "phone_used") toast.error(t("parent_phone_used"));
      setForm({ name: "", nis: "", nisn: "", gender: "", class_name: "", parent_phone: "", parent_name: "", parent_email: "", address: "" });
      toast.success(t("save"));
      setShowForm(false);
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

  const doPromote = async () => {
    if (!promoteForm.from_class || !promoteForm.to_class.trim()) return;
    if (!window.confirm(t("confirm_promote", { from: promoteForm.from_class, to: promoteForm.to_class.trim() }))) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin/students/promote", { from_class: promoteForm.from_class, to_class: promoteForm.to_class.trim() });
      toast.success(t("promoted_ok", { count: data.updated }));
      setPromoteOpen(false);
      setPromoteForm({ from_class: "", to_class: "" });
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const doGraduate = async () => {
    if (!promoteForm.from_class) return;
    if (!window.confirm(t("confirm_graduate", { cls: promoteForm.from_class }))) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin/students/graduate", { class_name: promoteForm.from_class });
      toast.success(t("graduated_ok", { count: data.updated }));
      setPromoteOpen(false);
      setPromoteForm({ from_class: "", to_class: "" });
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const [yearMode, setYearMode] = useState(false);
  const [yearMap, setYearMap] = useState([]);

  const suggestTarget = (cls) => {
    const m = cls.match(/^(XII|XI|X)(.*)$/i);
    if (!m) return "";
    const head = m[1].toUpperCase();
    if (head === "XII") return null; // default lulus
    return (head === "XI" ? "XII" : "XI") + m[2];
  };

  const openYearMode = () => {
    setYearMap(classes.map((c) => {
      const s = suggestTarget(c);
      return { from: c, to: s ?? "", graduate: s === null };
    }));
    setYearMode(true);
  };

  const doYearPromote = async () => {
    const promote = yearMap.filter((r) => !r.graduate && r.to.trim()).map((r) => ({ from_class: r.from, to_class: r.to.trim() }));
    const graduate = yearMap.filter((r) => r.graduate).map((r) => r.from);
    if (!promote.length && !graduate.length) return;
    if (!window.confirm(t("confirm_year"))) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin/students/promote-year", { promote, graduate });
      toast.success(t("year_ok", { promoted: data.promoted, graduated: data.graduated }));
      setPromoteOpen(false);
      setYearMode(false);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    const csv = "nama,nis,nisn,jk,kelas,hp_ortu,nama_ortu,email_ortu,alamat\nAhmad Contoh,1001,0012345678,L,X-1,081234567890,Budi Contoh,budi@mail.com,Jl. Merdeka 1\nSiti Contoh,1002,0012345679,P,X-1,,,,\n";
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-siswa.csv";
    a.click();
    URL.revokeObjectURL(url);
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

  const doBulkEnroll = async () => {
    if (!zipFile) { toast.error(t("zip_required")); return; }
    const fd = new FormData();
    fd.append("file", zipFile);
    if (mapFile) fd.append("mapping", mapFile);
    setBusy(true);
    try {
      const { data } = await api.post("/admin/students/enroll-zip", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setBulkReport(data);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const downloadBulkReport = () => {
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = ["file,nis,nama,status,keterangan", ...bulkReport.results.map((r) => [r.file, r.nis, r.name, r.status, r.reason].map(esc).join(","))];
    const url = URL.createObjectURL(new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan-enroll.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendLogin = async (s) => {
    if (!window.confirm(t("send_parent_login_confirm"))) return;
    try {
      const { data } = await api.post(`/admin/students/${s.id}/send-parent-login`);
      if (data.sent) {
        toast.success(t("parent_login_sent"));
      } else if (data.wa_link && window.confirm(t("parent_login_not_sent"))) {
        window.open(data.wa_link, "_blank");
      } else if (!data.wa_link) {
        toast.error(t("parent_login_not_sent"));
      }
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const createParents = async () => {
    if (!window.confirm(t("parent_accounts_info"))) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin/students/create-parent-accounts");
      toast.success(t("parent_accounts_done", { created: data.created }) + (data.skipped.length ? ` · ${t("skipped")}: ${data.skipped.length}` : ""));
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div data-testid="students-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">{t("students")} <span data-testid="student-total" className="text-teal-700">({students.length})</span></h2>
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center">
          {selected.size > 0 && (
            <button data-testid="bulk-delete-btn" onClick={bulkDelete}
              className="col-span-2 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors w-full sm:w-auto">
              <Trash2 className="w-4 h-4" /> {t("delete_selected")} ({selected.size})
            </button>
          )}
          <button data-testid="add-student-btn" onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors w-full sm:w-auto">
            <Plus className="w-4 h-4" /> {t("add_student")}
          </button>
          <button data-testid="promote-btn" onClick={() => setPromoteOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-white border border-teal-700 text-teal-700 hover:bg-teal-50 text-xs font-bold px-4 py-2 rounded-xl transition-colors w-full sm:w-auto">
            <GraduationCap className="w-4 h-4" /> {t("promote_class")}
          </button>
          <button data-testid="export-btn" onClick={doExport}
            className="flex items-center justify-center gap-1.5 bg-white border border-teal-700 text-teal-700 hover:bg-teal-50 text-xs font-bold px-4 py-2 rounded-xl transition-colors w-full sm:w-auto">
            <Download className="w-4 h-4" /> {t("export_file")}
          </button>
          <button data-testid="bulk-enroll-btn" onClick={() => { setBulkOpen(true); setBulkReport(null); setZipFile(null); setMapFile(null); }}
            className="flex items-center justify-center gap-1.5 bg-white border border-teal-700 text-teal-700 hover:bg-teal-50 text-xs font-bold px-4 py-2 rounded-xl transition-colors w-full sm:w-auto">
            <ScanFace className="w-4 h-4" /> {t("bulk_enroll")}
          </button>
          <button data-testid="parent-accounts-btn" onClick={createParents} disabled={busy}
            className="flex items-center justify-center gap-1.5 bg-white border border-teal-700 text-teal-700 hover:bg-teal-50 text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> {t("create_parent_accounts")}
          </button>
          <button data-testid="import-btn" onClick={() => fileRef.current?.click()} disabled={busy}
            className="flex items-center justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 w-full sm:w-auto">
            <Upload className="w-4 h-4" /> {busy ? t("loading") : t("import_file")}
          </button>
        </div>
        <input ref={fileRef} data-testid="import-file-input" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={pickFile} />
      </div>
      <div className="flex justify-end -mt-1">
        <button data-testid="template-btn" onClick={downloadTemplate}
          className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
          <FileDown className="w-3.5 h-3.5" /> {t("template_download")}
        </button>
      </div>

      {showForm && (
      <form onSubmit={add} data-testid="add-student-form" className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
        <In label={t("name")} testid="student-name" v={form.name} set={(v) => setForm({ ...form, name: v })} req grow />
        <In label={t("nis")} testid="student-nis" v={form.nis} set={(v) => setForm({ ...form, nis: v })} />
        <In label={t("nisn")} testid="student-nisn" v={form.nisn} set={(v) => setForm({ ...form, nisn: v })} />
        <In label={t("card_uid")} testid="student-card-uid" v={form.card_uid} set={(v) => setForm({ ...form, card_uid: v })} />
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("gender")}</label>
          <select data-testid="student-gender" required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition bg-white">
            <option value="">-</option>
            <option value="L">{t("gender_l")}</option>
            <option value="P">{t("gender_p")}</option>
          </select>
        </div>
        <ClassSelect testid="student-class" value={form.class_name} onChange={(v) => setForm({ ...form, class_name: v })} options={classes} t={t} req />
        <In label={t("parent_phone")} testid="student-parent-phone" v={form.parent_phone} set={(v) => setForm({ ...form, parent_phone: v })} />
        <In label={t("parent_name")} testid="student-parent-name" v={form.parent_name} set={(v) => setForm({ ...form, parent_name: v })} />
        <In label={t("parent_email")} testid="student-parent-email" type="email" v={form.parent_email} set={(v) => setForm({ ...form, parent_email: v })} />
        <div className="w-full">
          <label className="text-xs font-semibold text-slate-500">{t("address")}</label>
          <textarea data-testid="student-address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
        </div>
        <button data-testid="student-submit" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800">
          <Plus className="w-4 h-4" /> {t("add_student")}
        </button>
      </form>
      )}

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
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 cursor-pointer">
          <input type="checkbox" data-testid="show-graduated" checked={showGrad} onChange={(e) => { setShowGrad(e.target.checked); setPage(1); }} className="accent-teal-700 w-4 h-4" />
          {t("show_graduated")}
        </label>
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
                <th className="px-4 py-3">{t("parent_phone")}</th>
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
                  <td className="px-4 py-2.5 font-semibold text-slate-800">
                    {s.name}
                    {s.status === "lulus" && <span className="ml-2 text-[10px] font-bold bg-slate-200 text-slate-500 rounded-full px-2 py-0.5">{t("status_lulus")}</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.nis}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.nisn || "-"}</td>
                  <td className="px-4 py-2.5" data-testid={`student-gender-cell-${s.id}`}>{s.gender || "-"}</td>
                  <td className="px-4 py-2.5">{s.class}</td>
                  <td className="px-4 py-2.5">
                    {s.parent_phone ? (
                      <>
                        {s.parent_name && <p className="text-xs font-semibold text-slate-700 font-sans">{s.parent_name}</p>}
                        <p className="font-mono text-xs">{s.parent_phone}</p>
                        <span data-testid={`parent-account-${s.id}`} className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${s.has_parent_account ? "text-emerald-600" : "text-slate-400"}`}>
                          {s.has_parent_account ? <><CheckCircle2 className="w-3 h-3" /> {t("parent_account_active")}</> : <><Circle className="w-3 h-3" /> {t("parent_account_none")}</>}
                        </span>
                      </>
                    ) : <span className="font-mono text-xs">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span data-testid={`student-enroll-status-${s.id}`} className={`inline-flex items-center gap-1 text-xs font-bold ${s.enrolled ? "text-emerald-600" : "text-slate-400"}`}>
                      {s.enrolled ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {s.enrolled ? t("enrolled") : t("not_enrolled")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button data-testid={`enroll-student-${s.id}`} onClick={() => setEnrollFor(s)} className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg" title={t("enroll_face")}><ScanFace className="w-4 h-4" /></button>
                      <button data-testid={`qr-student-${s.id}`} onClick={() => setQrFor(s)} className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg" title={t("qr_code")}><QrCode className="w-4 h-4" /></button>
                      <button data-testid={`edit-student-${s.id}`} onClick={() => setEditFor({ ...s })} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg" title={t("edit")}><Pencil className="w-4 h-4" /></button>
                      {s.parent_phone && <button data-testid={`send-login-${s.id}`} onClick={() => sendLogin(s)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title={t("send_parent_login")}><MessageCircle className="w-4 h-4" /></button>}
                      <button data-testid={`delete-student-${s.id}`} onClick={() => del(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title={t("delete")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
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

      {promoteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="promote-modal">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800">{t("promote_class")}</p>
              <button data-testid="promote-close" onClick={() => setPromoteOpen(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              <button data-testid="mode-per-class" onClick={() => setYearMode(false)}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${!yearMode ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}>
                {t("per_class_mode")}
              </button>
              <button data-testid="mode-year" onClick={openYearMode}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${yearMode ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}>
                {t("year_mode")}
              </button>
            </div>
            {!yearMode && (
            <>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("from_class")}</label>
              <select data-testid="promote-from" value={promoteForm.from_class} onChange={(e) => setPromoteForm({ ...promoteForm, from_class: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition">
                <option value="">-</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("to_class")}</label>
              <input data-testid="promote-to" value={promoteForm.to_class} onChange={(e) => setPromoteForm({ ...promoteForm, to_class: e.target.value })}
                placeholder="contoh: XI-1"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
            </div>
            <button data-testid="promote-submit" onClick={doPromote} disabled={busy}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
              {t("promote_action")}
            </button>
            <div className="border-t pt-4">
              <button data-testid="graduate-submit" onClick={doGraduate} disabled={busy || !promoteForm.from_class}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
                {t("graduate_action")} {promoteForm.from_class ? `(${promoteForm.from_class})` : ""}
              </button>
              <p className="mt-2 text-[11px] text-slate-400">{t("graduate_hint")}</p>
            </div>
            </>
            )}
            {yearMode && (
            <>
            <p className="text-[11px] text-slate-400">{t("year_hint")}</p>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-slate-500 border-b bg-slate-50">
                    <th className="px-3 py-2 text-left">{t("from_class")}</th>
                    <th className="px-3 py-2 text-left">{t("col_new_class")}</th>
                    <th className="px-3 py-2 text-center">{t("col_graduate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {yearMap.map((r, i) => (
                    <tr key={r.from} className="border-b last:border-0">
                      <td className="px-3 py-2 font-semibold text-slate-700">{r.from}</td>
                      <td className="px-3 py-2">
                        <input data-testid={`year-to-${r.from}`} value={r.to} disabled={r.graduate}
                          onChange={(e) => setYearMap(yearMap.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-400 transition" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" data-testid={`year-grad-${r.from}`} checked={r.graduate}
                          onChange={(e) => setYearMap(yearMap.map((x, j) => (j === i ? { ...x, graduate: e.target.checked } : x)))}
                          className="accent-red-600 w-4 h-4 cursor-pointer" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button data-testid="year-submit" onClick={doYearPromote} disabled={busy}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
              {busy ? t("loading") : t("apply_year")}
            </button>
            </>
            )}
          </div>
        </div>
      )}

      {enrollFor && <CameraCapture testid="enroll-student-camera" onDone={enroll} onClose={() => setEnrollFor(null)} />}
      {qrFor && <QrModal person={qrFor} ptype="student" onClose={() => setQrFor(null)} />}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="bulk-enroll-modal">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <p className="font-bold text-slate-800">{t("bulk_enroll_title")}</p>
              <button data-testid="bulk-enroll-close" onClick={() => setBulkOpen(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-auto flex-1 px-5 py-4 space-y-4">
              <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">{t("bulk_enroll_hint")}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">{t("zip_photos")}</label>
                  <input data-testid="bulk-enroll-zip-input" type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:text-white file:text-xs file:font-bold file:px-3 file:py-1.5" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">{t("mapping_optional")}</label>
                  <input data-testid="bulk-enroll-mapping-input" type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setMapFile(e.target.files?.[0] || null)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:text-slate-700 file:text-xs file:font-bold file:px-3 file:py-1.5" />
                </div>
              </div>
              <button data-testid="bulk-enroll-process-btn" onClick={doBulkEnroll} disabled={busy || !zipFile}
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
                {busy ? t("loading") : t("process_enroll")}
              </button>
              {bulkReport && (
                <div data-testid="bulk-enroll-report" className="space-y-3">
                  <div className="flex flex-wrap items-center gap-4 text-sm border-y bg-slate-50 -mx-5 px-5 py-3">
                    <span data-testid="bulk-enroll-success-count" className="font-bold text-emerald-600">{t("success")}: {bulkReport.success}</span>
                    <span data-testid="bulk-enroll-failed-count" className="font-bold text-red-500">{t("failed")}: {bulkReport.failed}</span>
                    <button data-testid="bulk-enroll-download-btn" onClick={downloadBulkReport}
                      className="ml-auto flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline">
                      <FileDown className="w-3.5 h-3.5" /> {t("download_report")}
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase text-slate-500 border-b">
                      <th className="py-2 pr-3">{t("result_file")}</th><th className="py-2 pr-3">{t("nis")}</th><th className="py-2 pr-3">{t("name")}</th><th className="py-2 pr-3">{t("result_status")}</th><th className="py-2">{t("result_reason")}</th>
                    </tr></thead>
                    <tbody>
                      {bulkReport.results.slice(0, 200).map((r, i) => (
                        <tr key={i} className="border-b last:border-0" data-testid={`bulk-enroll-row-${i}`}>
                          <td className="py-1.5 pr-3 font-mono text-xs">{r.file}</td>
                          <td className="py-1.5 pr-3 font-mono text-xs">{r.nis || "-"}</td>
                          <td className="py-1.5 pr-3">{r.name || "-"}</td>
                          <td className={`py-1.5 pr-3 text-xs font-bold ${r.status === "sukses" ? "text-emerald-600" : "text-red-500"}`}>{r.status === "sukses" ? t("success") : t("failed")}</td>
                          <td className="py-1.5 text-xs text-slate-500">{r.reason || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bulkReport.results.length > 200 && <p className="text-xs text-slate-400">+{bulkReport.results.length - 200}...</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="edit-student-modal">
          <form onSubmit={saveEdit} data-testid="edit-student-form" className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <p className="font-bold text-slate-800">{t("edit_student")}</p>
            <In label={t("name")} testid="edit-student-name" v={editFor.name} set={(v) => setEditFor({ ...editFor, name: v })} req grow />
            <div className="grid grid-cols-2 gap-3">
              <In label={t("nis")} testid="edit-student-nis" v={editFor.nis || ""} set={(v) => setEditFor({ ...editFor, nis: v })} grow />
              <In label={t("nisn")} testid="edit-student-nisn" v={editFor.nisn || ""} set={(v) => setEditFor({ ...editFor, nisn: v })} grow />
              <In label={t("card_uid")} testid="edit-student-card-uid" v={editFor.card_uid || ""} set={(v) => setEditFor({ ...editFor, card_uid: v })} grow />
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("gender")}</label>
                <select data-testid="edit-student-gender" required value={editFor.gender || ""} onChange={(e) => setEditFor({ ...editFor, gender: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition bg-white">
                  <option value="">-</option>
                  <option value="L">{t("gender_l")}</option>
                  <option value="P">{t("gender_p")}</option>
                </select>
              </div>
              <ClassSelect testid="edit-student-class" value={editFor.class || ""} onChange={(v) => setEditFor({ ...editFor, class: v })} options={classes} t={t} req />
              <In label={t("parent_phone")} testid="edit-student-parent-phone" v={editFor.parent_phone || ""} set={(v) => setEditFor({ ...editFor, parent_phone: v })} grow />
              <In label={t("parent_name")} testid="edit-student-parent-name" v={editFor.parent_name || ""} set={(v) => setEditFor({ ...editFor, parent_name: v })} grow />
              <In label={t("parent_email")} testid="edit-student-parent-email" type="email" v={editFor.parent_email || ""} set={(v) => setEditFor({ ...editFor, parent_email: v })} grow />
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500">{t("address")}</label>
                <textarea data-testid="edit-student-address" rows={2} value={editFor.address || ""} onChange={(e) => setEditFor({ ...editFor, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
              </div>
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
                <thead><tr className="text-left text-xs uppercase text-slate-500 border-b"><th className="py-2 pr-3">{t("name")}</th><th className="py-2 pr-3">{t("nis")}</th><th className="py-2 pr-3">{t("nisn")}</th><th className="py-2 pr-3">{t("gender_short")}</th><th className="py-2 pr-3">{t("class")}</th><th className="py-2 pr-3">{t("parent_phone")}</th><th className="py-2">{t("parent_name")}</th></tr></thead>
                <tbody>
                  {preview.valid.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-b last:border-0"><td className="py-1.5 pr-3">{r.name}</td><td className="py-1.5 pr-3 font-mono text-xs">{r.nis}</td><td className="py-1.5 pr-3 font-mono text-xs">{r.nisn || "-"}</td><td className="py-1.5 pr-3">{r.gender || "-"}</td><td className="py-1.5 pr-3">{r.class}</td><td className="py-1.5 pr-3 font-mono text-xs">{r.parent_phone || "-"}</td><td className="py-1.5">{r.parent_name || "-"}</td></tr>
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
