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
            <Route path="context" element={<div className="p-8">Application Context (Work in progress)</div>} />
            <Route path="architecture" element={<div className="p-8">Architecture Model (Work in progress)</div>} />
            <Route path="asvs" element={<ASVSWorkspace />} />
            <Route path="threats" element={<div className="p-8">Threat Register (Work in progress)</div>} />
            <Route path="findings" element={<div className="p-8">Findings & Gaps (Work in progress)</div>} />
            <Route path="export" element={<div className="p-8">XLSX Export (Work in progress)</div>} />
            <Route path="audit" element={<div className="p-8">Audit Trail (Work in progress)</div>} />
          </Route>
          <Route path="*" element={<div className="p-8">Work in progress...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
