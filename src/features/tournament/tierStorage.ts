const TIER_STORAGE_KEY_PREFIX = 'tm_active_tier_';

function getSessionStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { sessionStorage?: Storage }).sessionStorage) {
    return (globalThis as unknown as { sessionStorage: Storage }).sessionStorage;
  }
  return null;
}

/**
 * Retrieves the last active tier slug for a given tournament from sessionStorage.
 */
export function getStoredTierSlug(tournamentSlug?: string): string | null {
  if (!tournamentSlug) return null;
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    return storage.getItem(`${TIER_STORAGE_KEY_PREFIX}${tournamentSlug}`);
  } catch {
    return null;
  }
}

/**
 * Persists the active tier slug for a given tournament to sessionStorage.
 */
export function setStoredTierSlug(tournamentSlug?: string, tierSlug?: string): void {
  if (!tournamentSlug || !tierSlug) return;
  const storage = getSessionStorage();
  if (!storage) return null as unknown as void;
  try {
    storage.setItem(`${TIER_STORAGE_KEY_PREFIX}${tournamentSlug}`, tierSlug);
  } catch {
    // Ignore storage quota or access errors
  }
}
