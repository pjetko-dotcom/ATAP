import type { ReportLanguage } from "../utils/reportLanguage";

export function LanguageFlag({ language }: { language: ReportLanguage }) {
  return language === "sk" ? (
    <svg aria-hidden="true" width="28" height="19" viewBox="0 0 30 20">
      <path fill="#fff" d="M0 0h30v20H0z"/><path fill="#0b4ea2" d="M0 6.67h30v6.66H0z"/><path fill="#ee1c25" d="M0 13.33h30V20H0z"/>
      <path d="M6 4h7v7c0 3-3.5 4.5-3.5 4.5S6 14 6 11z" fill="#ee1c25" stroke="#fff" strokeWidth=".7"/>
      <path d="M9.5 6v6M7.5 8h4M8 10h3" stroke="#fff" strokeWidth=".8"/>
      <path d="M6.5 12.5c1-1 2-1 3-.1 1-1 2-1 3 .1v.5c-1 1.2-3 2-3 2s-2-.8-3-2z" fill="#0b4ea2"/>
    </svg>
  ) : (
    <svg aria-hidden="true" width="28" height="19" viewBox="0 0 60 40">
      <path fill="#012169" d="M0 0h60v40H0z"/>
      <path d="M0 0l60 40M60 0 0 40" stroke="#fff" strokeWidth="8"/>
      <path d="M0 0l60 40M60 0 0 40" stroke="#c8102e" strokeWidth="3"/>
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="12"/>
      <path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="7"/>
    </svg>
  );
}
