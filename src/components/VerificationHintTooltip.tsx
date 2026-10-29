import React, { useState } from "react";
import { Lightbulb, CheckCircle2, Search, ExternalLink, HelpCircle } from "lucide-react";
import { getVerificationGuide, VerificationGuide } from "../utils/verificationGuide";

interface VerificationHintTooltipProps {
  req: {
    id: string;
    title: string;
    description: string;
    chapterId?: number;
  };
  children?: React.ReactNode;
}

export function VerificationHintTooltip({ req, children }: VerificationHintTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const guide: VerificationGuide = getVerificationGuide(req);

  return (
    <div 
      className="relative inline-block group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children || (
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded transition-colors cursor-pointer ml-2 shrink-0"
          title="Zobraziť pomôcku na overenie požiadavky"
        >
          <Lightbulb size={12} className="text-amber-500 fill-amber-400" />
          <span>Pomôcka k overeniu</span>
        </button>
      )}

      {isOpen && (
        <div 
          className="absolute left-0 top-full mt-1.5 z-50 w-96 p-4 bg-white border border-amber-200 rounded-xl shadow-2xl text-left pointer-events-auto transition-all animate-in fade-in duration-150"
          style={{ minWidth: "340px", maxWidth: "420px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="p-1 bg-amber-100 text-amber-800 rounded-md">
                <Lightbulb size={15} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Ako overiť požiadavku {req.id}?</h4>
                <p className="text-[10px] text-amber-700 font-medium">{guide.method}</p>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
              ASVS 5.0
            </span>
          </div>

          {/* Key Question */}
          <div className="mb-3 p-2 bg-amber-50/60 border border-amber-100 rounded-lg">
            <p className="text-xs font-semibold text-amber-900 flex items-start gap-1.5">
              <HelpCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <span>{guide.keyQuestion}</span>
            </p>
          </div>

          {/* What to Inspect */}
          <div className="mb-3">
            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Search size={12} className="text-blue-500" />
              Čo kontrolovať v kóde / konfigurácii:
            </h5>
            <ul className="space-y-1">
              {guide.whatToInspect.map((step, idx) => (
                <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-blue-500 font-bold shrink-0">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Example Test */}
          <div className="mb-2">
            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <CheckCircle2 size={12} className="text-green-600" />
              Príklad overenia / testu:
            </h5>
            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
              {guide.exampleTest}
            </p>
          </div>

          {/* Footer Reference */}
          {guide.owaspReference && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Referencia: {guide.owaspReference}</span>
              <ExternalLink size={10} className="text-slate-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
