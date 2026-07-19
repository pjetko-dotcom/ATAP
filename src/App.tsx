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
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { Dashboard } from "./components/Dashboard.tsx";
import { AnalysisLayout } from "./components/AnalysisLayout.tsx";
import { ASVSWorkspace } from "./components/ASVSWorkspace.tsx";
import { NewAnalysis } from "./components/NewAnalysis.tsx";
import { ThreatRegister } from "./components/ThreatRegister.tsx";
import { ApplicationContext } from "./components/ApplicationContext.tsx";
import { ArchitectureModel } from "./components/ArchitectureModel.tsx";
import { StrideModel } from "./components/StrideModel.tsx";
import { FindingsAndGaps } from "./components/FindingsAndGaps.tsx";
import { Export } from "./components/Export.tsx";
import { AuditTrail } from "./components/AuditTrail.tsx";

/**
 * Main App Component.
 * Wraps the application in a BrowserRouter and defines all top-level routes.
 * 
 * @returns {JSX.Element} The rendered router component.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="analysis/new" element={<NewAnalysis />} />
          <Route path="analysis/:id" element={<AnalysisLayout />}>
            <Route path="context" element={<ApplicationContext />} />
            <Route path="architecture" element={<ArchitectureModel />} />
            <Route path="stride" element={<StrideModel />} />
            <Route path="asvs" element={<ASVSWorkspace />} />
            <Route path="threats" element={<ThreatRegister />} />
            <Route path="findings" element={<FindingsAndGaps />} />
            <Route path="export" element={<Export />} />
            <Route path="audit" element={<AuditTrail />} />
          </Route>
          <Route path="*" element={<div className="p-8">Work in progress...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
