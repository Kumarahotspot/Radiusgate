import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { periodLabel } from "../../i18n";
import { CalendarClock, Send, FileText } from "lucide-react";

export default function ParentHome() {
  const { t, i18n } = useTranslation();
  const [me, setMe] = useState(null);
  const [att, setAtt] = useState([]);
  const [spp, setSpp] = useState({ bills: [], payments: [] });
  const [payFor, setPayFor] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [paidReceipt, setPaidReceipt] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = ["spp", "leave", "profile"].includes(tabParam) ? tabParam : "main";
  const setTab = (v) => setSearchParams(v === "main" ? {} : { tab: v });
  const [waPhone, setWaPhone] = useState("");

  useEffect(() => { if (me) setWaPhone(me.parent?.phone || ""); }, [me]);

  const submitProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/parent/profile", { phone: waPhone });
      toast.success(t("save"));
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const today = new Date().toISOString().slice(0, 10);
  const [leave, setLeave] = useState({ status: "sakit", date: today, note: "" });
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get("/parent/me").then((r) => setMe(r.data)).catch(() => {});
    api.get("/parent/attendance").then((r) => setAtt(r.data)).catch(() => {});
    api.get("/parent/spp").then((r) => setSpp(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const rp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

  const dlReceipt = async (p) => {
    try {
      const r = await api.get(`/parent/spp/payments/${p.id}/receipt.pdf`, { responseType: "blob" });
      const u = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = u;
      a.download = `kuitansi-${p.reference || p.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(u);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const submitPay = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post("/parent/spp/pay", { bill_id: payFor.id, amount: Number(payAmount) });
      toast.success(t("spp_pay_done"));
      setPaidReceipt(r.data);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const cancelLeave = async (date) => {
    setBusy(true);
    try {
      await api.delete(`/parent/leave/${date}`);
      toast.success(t("cancelled_ok"));
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/parent/leave", leave);
      toast.success(t("save"));
      setLeave({ status: "sakit", date: today, note: "" });
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const byDate = {};
  att.forEach((a) => { (byDate[a.date] = byDate[a.date] || {})[a.type] = a; });
  const days = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 60);
  const sumStatus = (d) => {
    const st = d.in?.att_status;
    if (st === "sakit" || st === "izin" || st === "alpa") return st;
    if (!d.in) return null;
    return d.in.status === "late" ? "late" : "ok";
  };
  const sumBadge = { ok: "bg-emerald-100 text-emerald-700", late: "bg-amber-100 text-amber-700", sakit: "bg-red-100 text-red-600", izin: "bg-sky-100 text-sky-700", alpa: "bg-slate-200 text-slate-600" };
  const sumLabel = { ok: t("present"), late: t("late_short"), sakit: t("att_sakit"), izin: t("att_izin"), alpa: t("att_alpha") };
  const unpaidBills = spp.bills.filter((b) => b.status !== "paid");
  const totalUnpaid = unpaidBills.reduce((s, b) => s + (b.remaining ?? 0), 0);
  const nearestDue = unpaidBills.map((b) => b.due_date).filter(Boolean).sort()[0];
  const leaveHistory = att.filter((a) => a.att_status === "sakit" || a.att_status === "izin")
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  const thisMonth = today.slice(0, 7);
  const [recapMonth, setRecapMonth] = useState(thisMonth);
  const shiftMonth = (delta) => {
    const [y, m] = recapMonth.split("-").map(Number);
    setRecapMonth(new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7));
  };
  const recap = { ok: 0, late: 0, sakit: 0, izin: 0, alpa: 0 };
  days.forEach(([date, d]) => {
    if (!date.startsWith(recapMonth)) return;
    const s = sumStatus(d);
    if (s) recap[s] += 1;
  });

  return (
    <div data-testid="parent-home" className="space-y-6">
      {me && (
        <div className="bg-teal-800 text-white rounded-2xl p-5 flex flex-wrap items-center gap-4">
          {me.child.photo && <img src={me.child.photo} alt="" className="w-14 h-14 rounded-2xl object-cover bg-white/20" />}
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-teal-200">{t("child_activity")}</p>
            <p data-testid="child-name" className="font-bold text-lg truncate">{me.child.name}</p>
            <p className="text-xs text-teal-200">{[me.child.class, me.child.nis && `NIS ${me.child.nis}`].filter(Boolean).join(" · ")} · {me.school_name}</p>
          </div>
        </div>
      )}

      {tab === "spp" && (<>
      <div data-testid="spp-summary" className="bg-teal-800 text-white rounded-2xl p-5 flex flex-wrap items-center gap-x-10 gap-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-teal-200">{t("spp_total_unpaid")}</p>
          <p data-testid="spp-summary-total" className="font-bold text-lg">{rp(totalUnpaid)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-teal-200">{t("spp_nearest_due")}</p>
          <p data-testid="spp-summary-due" className="font-bold text-lg">{nearestDue || "—"}</p>
        </div>
        {unpaidBills.length === 0 && <p data-testid="spp-summary-paid" className="text-sm text-teal-100 font-semibold">{t("spp_all_paid")}</p>}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="spp-section">
        <p className="px-4 pt-4 font-bold text-slate-800">{t("spp_my_bills")}</p>
        <p className="px-4 text-[11px] text-slate-400">{t("spp_demo_note")}</p>
        <div className="p-4 space-y-3">
          {spp.bills.map((b) => (
            <div key={b.id} data-testid={`spp-bill-${b.id}`} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{b.title}</p>
                  <p className="text-xs text-slate-400">{b.category} · {t("due_date")}: {b.due_date}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${b.status === "paid" ? "bg-emerald-100 text-emerald-700" : b.status === "partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                  {t(`status_${b.status}`)}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-teal-600 rounded-full" style={{ width: `${Math.min(100, (b.paid_amount / b.amount) * 100)}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">{rp(b.paid_amount)} / <strong className="text-slate-700">{rp(b.amount)}</strong>{b.remaining > 0 && <span className="text-amber-600"> · {t("remaining")} {rp(b.remaining)}</span>}</p>
                {b.status !== "paid" && (
                  <button data-testid={`spp-pay-${b.id}`} onClick={() => { setPaidReceipt(null); setPayFor(b); setPayAmount(String(b.remaining)); }}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors">
                    {t("spp_pay")}
                  </button>
                )}
              </div>
            </div>
          ))}
          {spp.bills.length === 0 && <p className="text-center text-slate-400 text-sm py-4">{t("no_data")}</p>}
        </div>
        {spp.payments.length > 0 && (
          <div className="border-t px-4 py-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{t("spp_history")}</p>
            {spp.payments.slice(0, 5).map((p) => (
              <div key={p.id} className="flex justify-between items-center gap-2 text-xs py-1.5 border-b last:border-0 border-slate-100">
                <span className="text-slate-600">{p.bill_title} · <span className="font-mono text-slate-400">{p.reference}</span></span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-teal-700">{rp(p.amount)}</span>
                  <button data-testid={`parent-receipt-${p.id}`} onClick={() => dlReceipt(p)}
                    className="flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:bg-teal-50 px-2 py-1 rounded-lg transition-colors"
                    title={t("download_receipt")}>
                    <FileText className="w-3.5 h-3.5" /> {t("download_receipt")}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      </>)}

      {tab === "leave" && (<>
      <div>
        <form onSubmit={submitLeave} data-testid="parent-leave-form" className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-teal-700" /> {t("leave_title")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("status")}</label>
              <select data-testid="leave-status" value={leave.status} onChange={(e) => setLeave({ ...leave, status: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                <option value="sakit">{t("att_sakit")}</option>
                <option value="izin">{t("att_izin")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("ot_date")}</label>
              <input data-testid="leave-date" type="date" required value={leave.date} onChange={(e) => setLeave({ ...leave, date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500">{t("note")}</label>
              <input data-testid="leave-note" value={leave.note} onChange={(e) => setLeave({ ...leave, note: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
          </div>
          <button data-testid="leave-submit" disabled={busy}
            className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> {t("leave_title")}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="leave-history">
        <p className="px-4 pt-4 font-bold text-slate-800">{t("leave_history")}</p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("date")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("note")}</th>
                <th className="px-4 py-3">{t("recorded_by")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leaveHistory.map((a) => (
                <tr key={a.id || `${a.date}-${a.att_status}`} data-testid={`leave-row-${a.date}`} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{a.date}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${sumBadge[a.att_status]}`}>{sumLabel[a.att_status]}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{a.note || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{a.recorded_by_name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {a.date === today && (
                      <button data-testid={`leave-cancel-${a.date}`} disabled={busy} onClick={() => cancelLeave(a.date)}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                        {t("cancel")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {leaveHistory.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {payFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="spp-pay-modal">
          {paidReceipt ? (
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 text-center" data-testid="spp-pay-success">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <FileText className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{t("pay_success")}</p>
                <p className="text-sm text-slate-600 mt-1">{payFor.title} · <strong>{rp(Number(payAmount))}</strong></p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">Ref: {paidReceipt.reference}</p>
              </div>
              <div className="flex justify-center gap-2">
                <button data-testid="parent-pay-receipt" onClick={() => dlReceipt(paidReceipt)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors">
                  <FileText className="w-4 h-4" /> {t("download_receipt")}
                </button>
                <button data-testid="parent-pay-close" onClick={() => { setPayFor(null); setPaidReceipt(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">{t("close")}</button>
              </div>
            </div>
          ) : (
          <form onSubmit={submitPay} className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <p className="font-bold text-slate-800">{t("spp_pay")} — {payFor.title}</p>
            <p className="text-xs text-slate-500">{t("remaining")}: <strong>{rp(payFor.remaining)}</strong></p>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("amount")}</label>
              <input data-testid="spp-pay-amount" type="number" min={1} max={payFor.remaining} required value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">{t("spp_demo_note")}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPayFor(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
              <button data-testid="spp-pay-submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{t("spp_pay")}</button>
            </div>
          </form>
          )}
        </div>
      )}

      {tab === "main" && (<>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("monthly_recap")}</p>
          <div className="flex items-center gap-1" data-testid="recap-nav">
            <button data-testid="recap-prev" onClick={() => shiftMonth(-1)}
              className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-teal-700 font-bold transition-colors">‹</button>
            <span data-testid="recap-month" className="text-xs font-bold text-slate-600 min-w-[110px] text-center">{periodLabel(recapMonth, i18n.language)}</span>
            <button data-testid="recap-next" onClick={() => shiftMonth(1)} disabled={recapMonth >= thisMonth}
              className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-teal-700 font-bold transition-colors disabled:opacity-30 disabled:hover:bg-transparent">›</button>
          </div>
        </div>
        <div data-testid="att-recap" className="grid grid-cols-5 gap-2">
          {[["ok", "present", "text-emerald-600"], ["late", "late_short", "text-amber-600"], ["sakit", "att_sakit", "text-red-600"], ["izin", "att_izin", "text-sky-600"], ["alpa", "att_alpha", "text-slate-500"]].map(([k, label, color]) => (
            <div key={k} data-testid={`recap-${k}`} className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
              <p className={`text-xl font-extrabold ${color}`}>{recap[k]}</p>
              <p className="text-[11px] font-semibold text-slate-500">{t(label)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <p className="px-4 pt-4 font-bold text-slate-800">{t("child_activity")}</p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("date")}</th>
                <th className="px-4 py-3">{t("check_in")}</th>
                <th className="px-4 py-3">{t("check_out")}</th>
                <th className="px-4 py-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {days.map(([date, d]) => {
                const s = sumStatus(d);
                return (
                  <tr key={date} data-testid={`att-day-${date}`} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{date}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.in?.time_local || "—"}{d.in?.late_minutes > 0 && <span className="text-amber-600 font-sans"> (+{d.in.late_minutes}m)</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.out?.time_local || "—"}</td>
                    <td className="px-4 py-3">
                      {s ? <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${sumBadge[s]}`}>{sumLabel[s]}</span> : <span className="text-slate-300">—</span>}
                      {(d.in?.note || d.out?.note) && <span className="ml-1.5 text-[11px] text-slate-400">{d.in?.note || d.out?.note}</span>}
                    </td>
                  </tr>
                );
              })}
              {days.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {tab === "profile" && (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <form onSubmit={submitProfile} data-testid="parent-profile-form" className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="font-bold text-slate-800 mb-4">{t("profile")}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("name")}</label>
                <input data-testid="profile-name" value={me?.parent?.name || ""} disabled
                  className="mt-1 w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("email")}</label>
                <input data-testid="profile-email" value={me?.parent?.email || ""} disabled
                  className="mt-1 w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">{t("phone")}</label>
                <input data-testid="profile-phone" required value={waPhone} onChange={(e) => setWaPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
                <p className="text-[11px] text-slate-400 mt-1">{t("profile_phone_hint")}</p>
              </div>
            </div>
            <button data-testid="profile-save" disabled={busy}
              className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{t("save")}</button>
          </form>
        </div>
      )}
    </div>
  );
}
