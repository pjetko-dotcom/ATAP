export const LOCAL_ACTIVITY_ACTOR = "Local user";
const CURRENT_USER_NAME_KEY = "atap_local_profile_name";

export function getCurrentUserName(): string {
  if (typeof localStorage === "undefined") return LOCAL_ACTIVITY_ACTOR;

  try {
    const storedName = localStorage.getItem(CURRENT_USER_NAME_KEY)?.trim();
    return storedName || LOCAL_ACTIVITY_ACTOR;
  } catch {
    return LOCAL_ACTIVITY_ACTOR;
  }
}

export function setCurrentUserName(name: string): void {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("User name cannot be empty.");
  }

  localStorage.setItem(CURRENT_USER_NAME_KEY, trimmedName);
}

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
