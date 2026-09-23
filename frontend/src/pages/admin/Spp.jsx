import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import MonthYearPicker from "../../components/MonthYearPicker";
import { Plus, Layers, Tags, Banknote, Trash2, FileDown, Wallet, AlertTriangle, TrendingUp, Receipt, X } from "lucide-react";

const rp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function Spp() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("bills");
  const [stats, setStats] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cats, setCats] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [flt, setFlt] = useState({ month: "", class_name: "", status: "", q: "" });
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // create | bulk | cats | pay
  const [billForm, setBillForm] = useState({ student_id: "", title: "", category: "SPP", amount: "", due_date: "" });
  const [bulkForm, setBulkForm] = useState({ title: "", category: "SPP", amount: "", due_date: "", class_name: "" });
  const [payForm, setPayForm] = useState({ bill: null, amount: "", method: "Tunai", note: "" });
  const [newCat, setNewCat] = useState("");

  const load = () => {
    api.get("/admin/spp/stats").then((r) => setStats(r.data));
    api.get("/admin/spp/categories").then((r) => setCats(r.data));
    api.get("/admin/students").then((r) => setStudents(r.data.filter((s) => s.status !== "lulus")));
    api.get("/admin/meta/options").then((r) => setClasses(r.data.classes || []));
  };
  const loadBills = () => {
    const params = Object.fromEntries(Object.entries(flt).filter(([, v]) => v));
    api.get("/admin/spp/bills", { params }).then((r) => setBills(r.data));
  };
  const loadPayments = () => api.get("/admin/spp/payments", { params: payMonth ? { month: payMonth } : {} }).then((r) => setPayments(r.data));
  useEffect(() => { load(); }, []);
  useEffect(() => { loadBills(); }, [flt]); // eslint-disable-line
  useEffect(() => { if (tab === "payments") loadPayments(); }, [tab, payMonth]); // eslint-disable-line

  const reloadAll = () => { load(); loadBills(); if (tab === "payments") loadPayments(); };

  const submitBill = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/spp/bills", { ...billForm, amount: Number(billForm.amount) });
      toast.success(t("save"));
      setModal(null);
      setBillForm({ student_id: "", title: "", category: "SPP", amount: "", due_date: "" });
      reloadAll();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/admin/spp/bills/bulk", { ...bulkForm, amount: Number(bulkForm.amount), class_name: bulkForm.class_name || null });
      toast.success(`${t("save")}: ${data.created} · ${t("skipped")}: ${data.skipped}`);
      setModal(null);
      reloadAll();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const submitPay = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/spp/payments", { bill_id: payForm.bill.id, amount: Number(payForm.amount), method: payForm.method, note: payForm.note });
      toast.success(t("spp_pay_done"));
      setModal(null);
      reloadAll();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const delBill = async (b) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try {
      await api.delete(`/admin/spp/bills/${b.id}`);
      loadBills();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const addCat = async () => {
    if (!newCat.trim()) return;
    try {
      await api.post("/admin/spp/categories", { name: newCat.trim() });
      setNewCat("");
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const delCat = async (c) => {
    try {
      await api.delete(`/admin/spp/categories/${c.id}`);
      load();
    } catch (err) {
      const d = err.response?.data?.detail || "";
      if (d.startsWith("category_in_use")) toast.error(t("category_in_use", { count: d.split(":")[1] }));
      else toast.error(errMsg(err));
    }
  };

  const exportXlsx = async () => {
    const res = await api.get("/admin/spp/export", { params: payMonth ? { month: payMonth } : {}, responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaksi-spp-${payMonth || "semua"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stBadge = (s) => s === "paid" ? "bg-emerald-100 text-emerald-700" : s === "partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
  const overdue = (b) => b.status !== "paid" && b.due_date < new Date().toISOString().slice(0, 10);

  return (
    <div data-testid="spp-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">{t("spp")}</h2>
        <div className="flex flex-wrap gap-2">
          <button data-testid="spp-create-btn" onClick={() => setModal("create")}
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> {t("create_bill")}
          </button>
          <button data-testid="spp-bulk-btn" onClick={() => setModal("bulk")}
            className="flex items-center gap-1.5 bg-white border border-teal-700 text-teal-700 hover:bg-teal-50 text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            <Layers className="w-4 h-4" /> {t("bulk_bills")}
          </button>
          <button data-testid="spp-cats-btn" onClick={() => setModal("cats")}
            className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            <Tags className="w-4 h-4" /> {t("manage_categories")}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Wallet} label={t("spp_stats_billed")} val={rp(stats.total_billed)} testid="stat-billed" />
          <Stat icon={TrendingUp} label={t("spp_collected_month")} val={rp(stats.collected_this_month)} testid="stat-collected" />
          <Stat icon={Receipt} label={t("spp_stats_outstanding")} val={rp(stats.outstanding)} testid="stat-outstanding" amber />
          <Stat icon={AlertTriangle} label={t("spp_stats_overdue")} val={stats.overdue_count} testid="stat-overdue" red />
        </div>
      )}

      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        <button data-testid="spp-tab-bills" onClick={() => setTab("bills")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "bills" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t("spp_bills_tab")}</button>
        <button data-testid="spp-tab-payments" onClick={() => setTab("payments")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "payments" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t("spp_payments_tab")}</button>
      </div>

      {tab === "bills" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("period_filter")}</label>
              <MonthYearPicker testid="flt-month" value={flt.month} onChange={(v) => setFlt({ ...flt, month: v })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("class")}</label>
              <select data-testid="flt-class" value={flt.class_name} onChange={(e) => setFlt({ ...flt, class_name: e.target.value })}
                className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-teal-600">
                <option value="">{t("all_classes")}</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("status")}</label>
              <select data-testid="flt-status" value={flt.status} onChange={(e) => setFlt({ ...flt, status: e.target.value })}
                className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-teal-600">
                <option value="">{t("all_status")}</option>
                <option value="unpaid">{t("status_unpaid")}</option>
                <option value="partial">{t("status_partial")}</option>
                <option value="paid">{t("status_paid")}</option>
              </select>
            </div>
            <input data-testid="flt-q" value={flt.q} onChange={(e) => setFlt({ ...flt, q: e.target.value })} placeholder={t("search_students")}
              className="flex-1 min-w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                    <th className="px-4 py-3">{t("students")}</th>
                    <th className="px-4 py-3">{t("bill_title")}</th>
                    <th className="px-4 py-3">{t("category")}</th>
                    <th className="px-4 py-3">{t("amount")}</th>
                    <th className="px-4 py-3">{t("remaining")}</th>
                    <th className="px-4 py-3">{t("due_date")}</th>
                    <th className="px-4 py-3">{t("payment_date")}</th>
                    <th className="px-4 py-3">{t("status")}</th>
                    <th className="px-4 py-3">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id} data-testid={`bill-row-${b.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3"><p className="font-semibold text-slate-800">{b.student_name}</p><p className="text-xs text-slate-400">{b.class}</p></td>
                      <td className="px-4 py-3">{b.title}</td>
                      <td className="px-4 py-3 text-slate-600">{b.category}</td>
                      <td className="px-4 py-3">{rp(b.amount)}</td>
                      <td className="px-4 py-3 font-semibold text-amber-600">{b.remaining > 0 ? rp(b.remaining) : "—"}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${overdue(b) ? "text-red-600 font-bold" : ""}`}>{b.due_date}</td>
                      <td className="px-4 py-3 font-mono text-xs" data-testid={`bill-paid-at-${b.id}`}>{b.last_paid_at ? b.last_paid_at.slice(0, 10) : "—"}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${stBadge(b.status)}`}>{t(`status_${b.status}`)}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {b.status !== "paid" && (
                            <button data-testid={`pay-bill-${b.id}`} onClick={() => { setPayForm({ bill: b, amount: String(b.remaining), method: "Tunai", note: "" }); setModal("pay"); }}
                              className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1.5 rounded-lg transition-colors">
                              <Banknote className="w-4 h-4" /> {t("pay_manual")}
                            </button>
                          )}
                          {b.paid_amount === 0 && (
                            <button data-testid={`del-bill-${b.id}`} onClick={() => delBill(b)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bills.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "payments" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("period_filter")}</label>
              <MonthYearPicker testid="pay-flt-month" value={payMonth} onChange={setPayMonth} />
            </div>
            <button data-testid="pay-export" onClick={exportXlsx}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100">
              <FileDown className="w-4 h-4" /> {t("export_file")}
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                    <th className="px-4 py-3">{t("date")}</th>
                    <th className="px-4 py-3">{t("students")}</th>
                    <th className="px-4 py-3">{t("bill_title")}</th>
                    <th className="px-4 py-3">{t("method")}</th>
                    <th className="px-4 py-3">{t("amount")}</th>
                    <th className="px-4 py-3">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs">{p.paid_at?.slice(0, 10)}</td>
                      <td className="px-4 py-3"><p className="font-semibold text-slate-800">{p.student_name}</p><p className="text-xs text-slate-400">{p.class}</p></td>
                      <td className="px-4 py-3">{p.bill_title}</td>
                      <td className="px-4 py-3 text-slate-600">{p.method}</td>
                      <td className="px-4 py-3 font-semibold text-teal-700">{rp(p.amount)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.reference}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {modal === "create" && (
        <Modal title={t("create_bill")} onClose={() => setModal(null)} testid="bill-modal">
          <form onSubmit={submitBill} className="grid gap-4" data-testid="bill-form">
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("select_student")}</label>
              <select data-testid="bill-student" required value={billForm.student_id} onChange={(e) => setBillForm({ ...billForm, student_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                <option value="">—</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.class}</option>)}
              </select>
            </div>
            <In label={t("bill_title")} testid="bill-title" v={billForm.title} set={(v) => setBillForm({ ...billForm, title: v })} req />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("category")}</label>
                <select data-testid="bill-category" value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                  {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <In label={t("amount")} testid="bill-amount" type="number" v={billForm.amount} set={(v) => setBillForm({ ...billForm, amount: v })} req />
            </div>
            <In label={t("due_date")} testid="bill-due" type="date" v={billForm.due_date} set={(v) => setBillForm({ ...billForm, due_date: v })} req />
            <ModalButtons busy={busy} onClose={() => setModal(null)} t={t} testid="bill-submit" />
          </form>
        </Modal>
      )}

      {modal === "bulk" && (
        <Modal title={t("bulk_bills")} onClose={() => setModal(null)} testid="bulk-modal">
          <form onSubmit={submitBulk} className="grid gap-4" data-testid="bulk-form">
            <In label={t("bill_title")} testid="bulk-title" v={bulkForm.title} set={(v) => setBulkForm({ ...bulkForm, title: v })} req />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("category")}</label>
                <select data-testid="bulk-category" value={bulkForm.category} onChange={(e) => setBulkForm({ ...bulkForm, category: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                  {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <In label={t("amount")} testid="bulk-amount" type="number" v={bulkForm.amount} set={(v) => setBulkForm({ ...bulkForm, amount: v })} req />
            </div>
            <In label={t("due_date")} testid="bulk-due" type="date" v={bulkForm.due_date} set={(v) => setBulkForm({ ...bulkForm, due_date: v })} req />
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("class")}</label>
              <select data-testid="bulk-class" value={bulkForm.class_name} onChange={(e) => setBulkForm({ ...bulkForm, class_name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                <option value="">{t("all_students")}</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <ModalButtons busy={busy} onClose={() => setModal(null)} t={t} testid="bulk-submit" />
          </form>
        </Modal>
      )}

      {modal === "pay" && payForm.bill && (
        <Modal title={`${t("pay_manual")} — ${payForm.bill.student_name}`} onClose={() => setModal(null)} testid="pay-modal">
          <form onSubmit={submitPay} className="grid gap-4" data-testid="pay-form">
            <p className="text-sm text-slate-600">{payForm.bill.title} · {t("remaining")}: <strong>{rp(payForm.bill.remaining)}</strong></p>
            <In label={t("amount")} testid="pay-amount" type="number" v={payForm.amount} set={(v) => setPayForm({ ...payForm, amount: v })} req />
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("method")}</label>
              <select data-testid="pay-method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                <option>Tunai</option><option>Transfer Bank</option><option>Lainnya</option>
              </select>
            </div>
            <In label={t("note")} testid="pay-note" v={payForm.note} set={(v) => setPayForm({ ...payForm, note: v })} />
            <ModalButtons busy={busy} onClose={() => setModal(null)} t={t} testid="pay-submit" />
          </form>
        </Modal>
      )}

      {modal === "cats" && (
        <Modal title={t("manage_categories")} onClose={() => setModal(null)} testid="cats-modal">
          <div className="flex flex-wrap gap-2 mb-4" data-testid="cats-list">
            {cats.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700">
                {c.name}
                <button data-testid={`cat-del-${c.id}`} onClick={() => delCat(c)} className="text-red-400 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input data-testid="cat-add-input" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder={t("category")}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            <button data-testid="cat-add-btn" onClick={addCat}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800">{t("add")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, val, testid, amber, red }) {
  const cls = red ? "text-red-600 bg-red-50" : amber ? "text-amber-600 bg-amber-50" : "text-teal-700 bg-teal-50";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${cls}`}><Icon className="w-4 h-4" /></div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p data-testid={testid} className="text-lg font-extrabold text-slate-800 mt-0.5">{val}</p>
    </div>
  );
}

function Modal({ title, onClose, children, testid }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid={testid}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="font-bold text-slate-800">{title}</p>
          <button type="button" data-testid={`${testid}-close`} onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalButtons({ busy, onClose, t, testid }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
      <button data-testid={testid} disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{busy ? t("loading") : t("save")}</button>
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
