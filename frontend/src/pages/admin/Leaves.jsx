import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { Check, X, Plus, Pencil, Trash2 } from "lucide-react";

const EMPTY = { teacher_id: "", type: "izin", date_from: "", date_to: "", reason: "" };
const TYPES = ["izin", "sakit", "cuti"];

export default function Leaves() {
  const { t } = useTranslation();
  const [leaves, setLeaves] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editFor, setEditFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get("/admin/leaves").then((r) => setLeaves(r.data));
    api.get("/admin/teachers").then((r) => setTeachers(r.data));
  };
  useEffect(() => { load(); }, []);

  const decide = async (id, status) => {
    try {
      await api.post(`/admin/leaves/${id}/decision`, { status });
      toast.success(t(status));
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/leaves", form);
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
      await api.patch(`/admin/leaves/${editFor.id}`, {
        type: editFor.type, date_from: editFor.date_from, date_to: editFor.date_to, reason: editFor.reason,
      });
      toast.success(t("save"));
      setEditFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try {
      await api.delete(`/admin/leaves/${id}`);
      toast.success(t("deleted_ok"));
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const badge = (s) => s === "approved" ? "bg-emerald-100 text-emerald-700" : s === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700";

  const fieldCls = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition bg-white";

  return (
    <div data-testid="leaves-page" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">{t("leaves")}</h2>
        <button data-testid="add-leave-btn" onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> {t("add_leave")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} data-testid="leave-form" className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="text-xs font-semibold text-slate-500">{t("teachers")}</label>
            <select data-testid="leave-teacher" required value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className={fieldCls}>
              <option value="">—</option>
              {teachers.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("type")}</label>
            <select data-testid="leave-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={fieldCls}>
              {TYPES.map((tp) => <option key={tp} value={tp}>{t(tp)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("from")}</label>
            <input data-testid="leave-date-from" type="date" required value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} className={fieldCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("to")}</label>
            <input data-testid="leave-date-to" type="date" required value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} className={fieldCls} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-slate-500">{t("reason")}</label>
            <input data-testid="leave-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={fieldCls} />
          </div>
          <button data-testid="leave-submit" disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">
            <Plus className="w-4 h-4" /> {busy ? t("loading") : t("save")}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("type")}</th>
                <th className="px-4 py-3">{t("from")}</th>
                <th className="px-4 py-3">{t("to")}</th>
                <th className="px-4 py-3">{t("reason")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} data-testid={`leave-row-${l.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-800">{l.teacher_name}</td>
                  <td className="px-4 py-3">{t(l.type)}</td>
                  <td className="px-4 py-3">{l.date_from}</td>
                  <td className="px-4 py-3">{l.date_to}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">{l.reason}</td>
                  <td className="px-4 py-3"><span data-testid={`leave-status-${l.id}`} className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge(l.status)}`}>{t(l.status)}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {l.status === "pending" && (
                        <>
                          <button data-testid={`leave-approve-${l.id}`} onClick={() => decide(l.id, "approved")} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title={t("approved")}><Check className="w-4 h-4" /></button>
                          <button data-testid={`leave-reject-${l.id}`} onClick={() => decide(l.id, "rejected")} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title={t("rejected")}><X className="w-4 h-4" /></button>
                        </>
                      )}
                      <button data-testid={`leave-edit-${l.id}`} onClick={() => setEditFor({ ...l })} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg" title={t("edit")}><Pencil className="w-4 h-4" /></button>
                      <button data-testid={`leave-delete-${l.id}`} onClick={() => del(l.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title={t("delete")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="edit-leave-modal">
          <form onSubmit={saveEdit} data-testid="edit-leave-form" className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800">{t("edit_leave")} — {editFor.teacher_name}</p>
              <button type="button" data-testid="edit-leave-close" onClick={() => setEditFor(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("type")}</label>
              <select data-testid="edit-leave-type" value={editFor.type} onChange={(e) => setEditFor({ ...editFor, type: e.target.value })} className={fieldCls}>
                {TYPES.map((tp) => <option key={tp} value={tp}>{t(tp)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("from")}</label>
                <input data-testid="edit-leave-from" type="date" required value={editFor.date_from} onChange={(e) => setEditFor({ ...editFor, date_from: e.target.value })} className={fieldCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("to")}</label>
                <input data-testid="edit-leave-to" type="date" required value={editFor.date_to} onChange={(e) => setEditFor({ ...editFor, date_to: e.target.value })} className={fieldCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("reason")}</label>
              <input data-testid="edit-leave-reason" value={editFor.reason || ""} onChange={(e) => setEditFor({ ...editFor, reason: e.target.value })} className={fieldCls} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" data-testid="edit-leave-cancel" onClick={() => setEditFor(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
              <button data-testid="edit-leave-submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{busy ? t("loading") : t("save")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
