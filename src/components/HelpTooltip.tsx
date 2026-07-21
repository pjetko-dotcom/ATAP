import React from "react";
import { HelpCircle } from "lucide-react";

export function HelpTooltip({ text, position = "top" }: { text: string, position?: "top" | "bottom" | "left" | "right" }) {
  return (
    <div className="group relative inline-flex items-center justify-center">
      <HelpCircle size={14} className="text-slate-400 hover:text-blue-500 cursor-help ml-1.5" />
      <div className={`absolute hidden group-hover:block w-56 p-2.5 bg-slate-800 text-slate-100 text-[11px] leading-relaxed rounded shadow-xl z-[100] font-normal normal-case tracking-normal
        ${position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : ''}
        ${position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : ''}
        ${position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : ''}
        ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''}
      `}>
        {text}
        <div className={`absolute w-0 h-0 border-4 border-transparent
          ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-800' : ''}
          ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800' : ''}
          ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 border-l-slate-800' : ''}
          ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 border-r-slate-800' : ''}
        `}></div>
      </div>
    </div>
  );
}
