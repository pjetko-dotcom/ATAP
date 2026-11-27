export type ReportLanguage = "sk" | "en";

export function reportText(language: ReportLanguage, sk: string, en: string): string {
  return language === "en" ? en : sk;
}
