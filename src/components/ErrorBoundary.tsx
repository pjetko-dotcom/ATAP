import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { reportText, type ReportLanguage } from "../utils/reportLanguage";

interface Props {
  children: ReactNode;
  language: ReportLanguage;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    const t = (sk: string, en: string) => reportText(this.props.language, sk, en);
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              {t("Nastala neočakávaná chyba zobrazenia", "An unexpected display error occurred")}
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {t("Komponent narazil na problém pri vykresľovaní. Môžete skúsiť obnoviť zobrazenie alebo sa vrátiť na prehľad analýz.", "A component encountered a rendering error. Try reloading or return to the analysis overview.")}
            </p>
            {this.state.error && (
              <div className="bg-slate-100 rounded-lg p-3 text-left mb-6 overflow-auto max-h-32 text-xs font-mono text-slate-700">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>{t("Obnoviť stránku", "Reload page")}</span>
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-slate-200"
              >
                <Home size={16} />
                <span>{t("Prejsť na Dashboard", "Go to Dashboard")}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
