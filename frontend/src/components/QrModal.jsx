import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import QRCode from "qrcode";
import api, { errMsg } from "../api";
import { X, Download } from "lucide-react";

export default function QrModal({ person, ptype, onClose }) {
  const { t } = useTranslation();
  const [img, setImg] = useState("");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/admin/qrcodes/${ptype}/${person.id}`);
        setInfo(data);
        setImg(await QRCode.toDataURL(data.qr, { width: 360, margin: 1 }));
      } catch (e) {
        toast.error(errMsg(e));
        onClose();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, ptype]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="qr-modal">
      <div className="bg-white rounded-2xl w-full max-w-xs p-5 text-center">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-slate-800 text-sm">{t("qr_code")}</p>
          <button data-testid="qr-close" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        {img ? (
          <img src={img} alt="QR" data-testid="qr-image" className="w-full rounded-xl border border-slate-200" />
        ) : (
          <div className="w-full aspect-square rounded-xl bg-slate-100 animate-pulse" />
        )}
        <p className="mt-3 font-bold text-slate-800" data-testid="qr-name">{info?.name || person.name}</p>
        <p className="text-xs font-mono text-slate-500" data-testid="qr-nis">{info?.nis || person.nis || person.nip || ""}</p>
        {img && (
          <a data-testid="qr-download" href={img} download={`QR-${(info?.name || person.name || "kode").replace(/\s+/g, "-")}.png`}
            className="mt-4 flex items-center justify-center gap-2 w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl py-2.5 transition-colors">
            <Download className="w-4 h-4" /> {t("qr_download")}
          </a>
        )}
      </div>
    </div>
  );
}
