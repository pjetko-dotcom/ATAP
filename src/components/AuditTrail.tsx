import React from "react";
import { Clock, User, FileEdit } from "lucide-react";

const auditLogs = [
  { id: 1, action: "Updated ASVS Requirement V4.1.1 status to Implemented", user: "Erik Novák", time: "2 hours ago" },
  { id: 2, action: "Added new threat TR-004 to Threat Register", user: "Erik Novák", time: "5 hours ago" },
  { id: 3, action: "Created Analysis Workspace", user: "Erik Novák", time: "1 day ago" },
];

export function AuditTrail() {
  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Audit Trail</h2>
        <p className="text-sm text-slate-500 mt-1">Activity log for this analysis workspace.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1 overflow-auto">
        <div className="space-y-6">
          {auditLogs.map(log => (
            <div key={log.id} className="flex gap-4">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <FileEdit size={14} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{log.action}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><User size={12} /> {log.user}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {log.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
