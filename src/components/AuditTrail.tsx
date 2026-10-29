import React, { useCallback, useEffect, useState } from "react";
import { Clock, User, FileEdit } from "lucide-react";
import { useParams } from "react-router-dom";
import { parseActivityLogs, type ActivityLogEntry } from "../utils/activityLog";

export function AuditTrail() {
  const { id } = useParams<{ id: string }>();
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);

  const loadLogs = useCallback(() => {
    if (!id) {
      setActivityLogs([]);
      return;
    }

    setActivityLogs(parseActivityLogs(localStorage.getItem(`atap_logs_v5_${id}`)));
  }, [id]);

  useEffect(() => {
    loadLogs();
    window.addEventListener("storage", loadLogs);
    window.addEventListener("storage_workspace_update", loadLogs);
    return () => {
      window.removeEventListener("storage", loadLogs);
      window.removeEventListener("storage_workspace_update", loadLogs);
    };
  }, [loadLogs]);

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Activity log</h2>
        <p className="text-sm text-amber-800 mt-1" role="note">
          Stored locally and editable; this is not an authenticated or tamper-proof audit record.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1 overflow-auto">
        <div className="space-y-6">
          {activityLogs.map(log => (
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
          {activityLogs.length === 0 && (
            <p className="text-sm text-slate-500">No activity has been recorded for this workspace.</p>
          )}
        </div>
      </div>
    </div>
  );
}
