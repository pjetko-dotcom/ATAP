export const LOCAL_ACTIVITY_ACTOR = "Local user";

export interface ActivityLogEntry {
  id: string;
  action: string;
  user: string;
  time: string;
}

export function parseActivityLogs(value: string | null): ActivityLogEntry[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is ActivityLogEntry =>
      typeof entry === "object" &&
      entry !== null &&
      typeof entry.id === "string" &&
      typeof entry.action === "string" &&
      typeof entry.user === "string" &&
      typeof entry.time === "string"
    );
  } catch {
    return [];
  }
}
