/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Main application entry point providing routing configuration.
 * Sets up the React Router for navigation between the Dashboard, New Analysis wizard,
 * and the specific Analysis lifecycle views.
 * 
 * @module App
 */
import { Suspense, lazy } from "react";
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const Dashboard = lazy(() => import("./components/Dashboard.tsx").then(module => ({ default: module.Dashboard })));
const AnalysisLayout = lazy(() => import("./components/AnalysisLayout.tsx").then(module => ({ default: module.AnalysisLayout })));
const ASVSWorkspace = lazy(() => import("./components/ASVSWorkspace.tsx").then(module => ({ default: module.ASVSWorkspace })));
const NewAnalysis = lazy(() => import("./components/NewAnalysis.tsx").then(module => ({ default: module.NewAnalysis })));
const ThreatRegister = lazy(() => import("./components/ThreatRegister.tsx").then(module => ({ default: module.ThreatRegister })));
const ApplicationContext = lazy(() => import("./components/ApplicationContext.tsx").then(module => ({ default: module.ApplicationContext })));
const ArchitectureModel = lazy(() => import("./components/ArchitectureModel.tsx").then(module => ({ default: module.ArchitectureModel })));
const StrideModel = lazy(() => import("./components/StrideModel.tsx").then(module => ({ default: module.StrideModel })));
const FindingsAndGaps = lazy(() => import("./components/FindingsAndGaps.tsx").then(module => ({ default: module.FindingsAndGaps })));
const Export = lazy(() => import("./components/Export.tsx").then(module => ({ default: module.Export })));
const AuditTrail = lazy(() => import("./components/AuditTrail.tsx").then(module => ({ default: module.AuditTrail })));

/**
 * Main App Component.
 * Supports both web HTTP server and Electron file:// offline desktop mode.
 */
export default function App() {
  const isFileProtocol = typeof window !== 'undefined' && (window.location.protocol === 'file:' || navigator.userAgent.includes('Electron'));
  const RouterComponent = isFileProtocol ? HashRouter : BrowserRouter;

  return (
    <ErrorBoundary>
      <RouterComponent>
        <Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">Načítavam stránku...</div>}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="analysis/new" element={<NewAnalysis />} />
              <Route path="analysis/:id" element={<AnalysisLayout />}>
                <Route index element={<Navigate to="asvs" replace />} />
                <Route path="context" element={<ApplicationContext />} />
                <Route path="architecture" element={<ArchitectureModel />} />
                <Route path="stride" element={<StrideModel />} />
                <Route path="asvs" element={<ASVSWorkspace />} />
                <Route path="threats" element={<ThreatRegister />} />
                <Route path="findings" element={<FindingsAndGaps />} />
                <Route path="export" element={<Export />} />
                <Route path="audit" element={<AuditTrail />} />
                <Route path="*" element={<Navigate to="asvs" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </RouterComponent>
    </ErrorBoundary>
  );
}
