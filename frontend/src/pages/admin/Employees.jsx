import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import CameraCapture from "../../components/CameraCapture";
import QrModal from "../../components/QrModal";
import { Plus, ScanFace, Trash2, CheckCircle2, Circle, Pencil, Search, ChevronLeft, ChevronRight, Nfc, QrCode } from "lucide-react";

const EMPTY = { name: "", email: "", password: "", nip: "", department: "", position: "", overtime_rate: "", base_salary: "", card_uid: "", shift_id: "" };

export default function Employees() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [enrollFor, setEnrollFor] = useState(null);
  const [qrFor, setQrFor] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [opts, setOpts] = useState({ departments: [] });
  const [busy, setBusy] = useState(false);
  const [editFor, setEditFor] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const q = query.trim().toLowerCase();
  const shiftName = (id) => {
    const s = shifts.find((x) => x.id === id);
    return s ? `${s.name} (${s.start}–${s.end})` : <span className="text-slate-300">—</span>;
  };
  const filtered = employees.filter((e) => !q || [e.name, e.email, e.nip, e.department, e.position].some((f) => (f || "").toLowerCase().includes(q)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const load = () => {
    api.get("/admin/employees").then((r) => setEmployees(r.data));
    api.get("/admin/meta/options").then((r) => setOpts(r.data));
    api.get("/admin/shifts").then((r) => setShifts(r.data));
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/employees", {
        ...form,
        overtime_rate: form.overtime_rate === "" ? null : Number(form.overtime_rate),
        base_salary: form.base_salary === "" ? null : Number(form.base_salary),
      });
      toast.success(t("save"));
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/admin/employees/${editFor.id}`, {
        name: editFor.name, nip: editFor.nip, department: editFor.department || "",
        position: editFor.position || "", active: !!editFor.active, card_uid: editFor.card_uid || "",
        shift_id: editFor.shift_id || "",
        overtime_rate: editFor.overtime_rate === null || editFor.overtime_rate === "" ? null : Number(editFor.overtime_rate),
        base_salary: editFor.base_salary === null || editFor.base_salary === "" ? null : Number(editFor.base_salary),
      });
      toast.success(t("save"));
      setEditFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const enroll = async (photo) => {
    try {
      await api.post(`/admin/employees/${enrollFor.id}/enroll`, { photo });
      toast.success(t("enroll_success"));
      setEnrollFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    await api.delete(`/admin/employees/${id}`);
    load();
  };

  return (
    <div data-testid="employees-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{t("employees")}</h2>
        <button data-testid="add-employee-btn" onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> {t("add_employee")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} data-testid="add-employee-form" className="bg-white rounded-2xl border border-slate-200 p-5 grid sm:grid-cols-3 gap-4">
          <In label={t("name")} testid="emp-name" v={form.name} set={(v) => setForm({ ...form, name: v })} req />
          <In label={t("email")} testid="emp-email" type="email" v={form.email} set={(v) => setForm({ ...form, email: v })} req />
          <In label={t("password")} testid="emp-password" v={form.password} set={(v) => setForm({ ...form, password: v })} req />
          <In label={t("nip")} testid="emp-nip" v={form.nip} set={(v) => setForm({ ...form, nip: v })} />
          <In label={t("card_uid")} testid="emp-card-uid" v={form.card_uid} set={(v) => setForm({ ...form, card_uid: v })} />
          <DeptSelect label={t("department")} testid="emp-department" options={opts.departments || []} value={form.department} onChange={(v) => setForm({ ...form, department: v })} t={t} />
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("shifts_menu")}</label>
            <select data-testid="emp-shift" value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
              <option value="">—</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</option>)}
            </select>
          </div>
          <In label={t("position")} testid="emp-position" v={form.position} set={(v) => setForm({ ...form, position: v })} />
          <div>
            <In label={t("overtime_rate")} testid="emp-otrate" type="number" v={form.overtime_rate} set={(v) => setForm({ ...form, overtime_rate: v })} />
            <p className="mt-1 text-[11px] text-slate-400">{t("overtime_rate_hint")}</p>
          </div>
          <In label={t("base_salary")} testid="emp-salary" type="number" v={form.base_salary} set={(v) => setForm({ ...form, base_salary: v })} />
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
            <button data-testid="emp-submit" disabled={busy} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{t("save")}</button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input data-testid="employee-search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder={t("search_employees")}
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">{t("show_entries")}</span>
        <select data-testid="employee-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-teal-600">
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("nip")}</th>
                <th className="px-4 py-3">{t("department")}</th>
                <th className="px-4 py-3">{t("position")}</th>
                <th className="px-4 py-3">{t("shifts_menu")}</th>
                <th className="px-4 py-3">{t("overtime_rate")}</th>
                <th className="px-4 py-3">{t("base_salary")}</th>
                <th className="px-4 py-3">{t("enroll_face")}</th>
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((emp) => (
                <tr key={emp.id} data-testid={`employee-row-${emp.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-800">{emp.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{emp.nip}</td>
                  <td className="px-4 py-3">{emp.department || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">{emp.position || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{shiftName(emp.shift_id)}</td>
                  <td className="px-4 py-3 text-slate-600">{emp.overtime_rate != null ? `Rp ${Number(emp.overtime_rate).toLocaleString("id-ID")}` : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{emp.base_salary != null ? `Rp ${Number(emp.base_salary).toLocaleString("id-ID")}` : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span data-testid={`enroll-status-${emp.id}`} className={`inline-flex items-center gap-1 text-xs font-bold ${emp.enrolled ? "text-emerald-600" : "text-slate-400"}`}>
                      {emp.enrolled ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {emp.enrolled ? t("enrolled") : t("not_enrolled")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button data-testid={`enroll-btn-${emp.id}`} onClick={() => setEnrollFor(emp)}
                        className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:bg-teal-50 px-2 py-1.5 rounded-lg transition-colors">
                        <ScanFace className="w-4 h-4" /> {t("enroll_face")}
                      </button>
                      <span data-testid={`card-employee-${emp.id}`} title={emp.card_uid ? `${t("card_registered")}: ${emp.card_uid}` : t("card_not_registered")}
                        className={`flex items-center px-2 py-1.5 ${emp.card_uid ? "text-teal-600" : "text-slate-300"}`}>
                        <Nfc className="w-4 h-4" />
                      </span>
                      <button data-testid={`qr-employee-${emp.id}`} onClick={() => setQrFor(emp)}
                        className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors">
                        <QrCode className="w-4 h-4" /> {t("qr_code")}
                      </button>
                      <button data-testid={`edit-employee-${emp.id}`} onClick={() => setEditFor({ ...emp, overtime_rate: emp.overtime_rate ?? "", base_salary: emp.base_salary ?? "" })}
                        className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:bg-sky-50 px-2 py-1.5 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" /> {t("edit")}
                      </button>
                      <button data-testid={`delete-employee-${emp.id}`} onClick={() => del(emp.id)}
                        className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" /> {t("delete")}
                      </button>
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
            <p data-testid="employee-page-info" className="text-xs text-slate-500">
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} {t("of")} {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button data-testid="employee-prev-page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold text-slate-700 px-1">{safePage}/{totalPages}</span>
              <button data-testid="employee-next-page" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {editFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="edit-employee-modal">
          <form onSubmit={saveEdit} data-testid="edit-employee-form" className="bg-white rounded-2xl w-full max-w-md p-5 grid sm:grid-cols-2 gap-4">
            <p className="sm:col-span-2 font-bold text-slate-800">{t("edit_employee")}</p>
            <In label={t("name")} testid="edit-emp-name" v={editFor.name} set={(v) => setEditFor({ ...editFor, name: v })} req />
            <In label={t("nip")} testid="edit-emp-nip" v={editFor.nip || ""} set={(v) => setEditFor({ ...editFor, nip: v })} />
            <In label={t("card_uid")} testid="edit-emp-card-uid" v={editFor.card_uid || ""} set={(v) => setEditFor({ ...editFor, card_uid: v })} />
            <DeptSelect label={t("department")} testid="edit-emp-department" options={opts.departments || []} value={editFor.department || ""} onChange={(v) => setEditFor({ ...editFor, department: v })} t={t} />
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("shifts_menu")}</label>
              <select data-testid="edit-emp-shift" value={editFor.shift_id || ""} onChange={(e) => setEditFor({ ...editFor, shift_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                <option value="">—</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</option>)}
              </select>
            </div>
            <In label={t("position")} testid="edit-emp-position" v={editFor.position || ""} set={(v) => setEditFor({ ...editFor, position: v })} />
            <div>
              <In label={t("overtime_rate")} testid="edit-emp-otrate" type="number" v={editFor.overtime_rate} set={(v) => setEditFor({ ...editFor, overtime_rate: v })} />
              <p className="mt-1 text-[11px] text-slate-400">{t("overtime_rate_hint")}</p>
            </div>
            <In label={t("base_salary")} testid="edit-emp-salary" type="number" v={editFor.base_salary} set={(v) => setEditFor({ ...editFor, base_salary: v })} />
            <label className="flex items-center gap-2 text-sm text-slate-600 self-end pb-2.5">
              <input data-testid="edit-emp-active" type="checkbox" checked={!!editFor.active} onChange={(e) => setEditFor({ ...editFor, active: e.target.checked })} className="accent-teal-700 w-4 h-4" />
              {t("active")}
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" data-testid="edit-emp-cancel" onClick={() => setEditFor(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
              <button data-testid="edit-emp-submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{busy ? t("loading") : t("save")}</button>
            </div>
          </form>
        </div>
      )}

      {enrollFor && <CameraCapture testid="enroll-camera" onDone={enroll} onClose={() => setEnrollFor(null)} />}
      {qrFor && <QrModal person={qrFor} ptype="employee" onClose={() => setQrFor(null)} />}
    </div>
  );
}

function DeptSelect({ label, options, value, onChange, testid, t }) {
  const isOther = value && !options.includes(value);
  const [other, setOther] = useState(isOther);
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <select data-testid={testid} value={other ? "__other__" : value}
        onChange={(e) => {
          if (e.target.value === "__other__") { setOther(true); onChange(""); }
          else { setOther(false); onChange(e.target.value); }
        }}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__other__">{t("dept_other")}</option>
      </select>
      {other && (
        <input data-testid={`${testid}-other`} value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
      )}
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
