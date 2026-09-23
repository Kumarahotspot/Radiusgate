import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MONTHS_ID, MONTHS_EN } from "../i18n";

export default function MonthYearPicker({ testid, value, onChange, allowEmpty = true }) {
  const { t, i18n } = useTranslation();
  const names = String(i18n.language).startsWith("en") ? MONTHS_EN : MONTHS_ID;
  const [sel, setSel] = useState(value ? value.split("-") : ["", ""]);
  const [y, m] = sel;
  const now = new Date().getFullYear();
  const years = [];
  for (let yy = now - 3; yy <= now + 1; yy++) years.push(String(yy));
  const set = (yy, mm) => {
    setSel([yy, mm]);
    if (yy && mm) onChange(`${yy}-${mm}`);
    else if (allowEmpty) onChange("");
  };
  const cls = "mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-teal-600";
  return (
    <div className="flex gap-2">
      <select data-testid={`${testid}-month`} value={m} onChange={(e) => set(y, e.target.value)} className={cls}>
        {allowEmpty && <option value="">{t("all_months")}</option>}
        {names.slice(1).map((n, i) => <option key={n} value={String(i + 1).padStart(2, "0")}>{n}</option>)}
      </select>
      <select data-testid={`${testid}-year`} value={y} onChange={(e) => set(e.target.value, m)} className={cls}>
        {allowEmpty && <option value="">{t("all_years")}</option>}
        {years.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
      </select>
    </div>
  );
}
