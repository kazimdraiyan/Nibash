export interface StoredApplication {
  listingId: number | string;
  listingTitle?: string;
  appliedAt: string;
  status: string; // e.g. "pending", "approved", "rejected"
  monthlyIncome?: number | string;
  emergencyContact?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
}

export function getApplicationsKey(userId: number | string): string {
  return `nibash_apps_${userId}`;
}

export function getUserApplications(userId: number | string): Record<string, StoredApplication> {
  try {
    const raw = localStorage.getItem(getApplicationsKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function hasUserApplied(
  userId: number | string | undefined | null,
  listingId: number | string | undefined | null,
): boolean {
  if (!userId || !listingId) return false;
  const apps = getUserApplications(userId);
  return Boolean(apps[String(listingId)]);
}

export function getUserApplication(
  userId: number | string | undefined | null,
  listingId: number | string | undefined | null,
): StoredApplication | null {
  if (!userId || !listingId) return null;
  const apps = getUserApplications(userId);
  return apps[String(listingId)] || null;
}

export function saveUserApplication(
  userId: number | string,
  app: StoredApplication,
): void {
  try {
    const apps = getUserApplications(userId);
    apps[String(app.listingId)] = {
      ...apps[String(app.listingId)],
      ...app,
    };
    localStorage.setItem(getApplicationsKey(userId), JSON.stringify(apps));
  } catch (err) {
    console.error("Failed to save application to localStorage", err);
  }
}
