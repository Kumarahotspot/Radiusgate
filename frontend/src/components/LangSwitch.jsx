import { useTranslation } from "react-i18next";

export default function LangSwitch({ dark = false }) {
  const { i18n } = useTranslation();
  const setLang = (l) => {
    i18n.changeLanguage(l);
    localStorage.setItem("lang", l);
  };
  return (
    <div data-testid="lang-switch" className={`flex rounded-full p-0.5 text-xs font-semibold ${dark ? "bg-white/10" : "bg-slate-100"}`}>
      {["id", "en"].map((l) => (
        <button
          key={l}
          data-testid={`lang-${l}`}
          onClick={() => setLang(l)}
          className={`px-3 py-1 rounded-full transition-colors ${
            i18n.language === l
              ? "bg-teal-700 text-white"
              : dark ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
