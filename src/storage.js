import { CASES } from './cases.js';
import { restoreState } from './campaign.js';

export const LIBRARY_KEY = 'rental-novice-library-v1';
const LEGACY_KEY = 'rental-novice-case-v3';
const categories = new Set(['whole-long', 'whole-short', 'shared-long', 'shared-short']);
const validCase = id => CASES.some(item => item.id === id);

export function createLibrary() {
  return { schemaVersion: 1, categoryId: 'whole-long', activeCaseId: null, saves: {}, preferences: {crouchKey:'c', reduceMotion:'system'} };
}

export function restoreLibrary(input) {
  const result = createLibrary();
  if (!input || input.schemaVersion !== 1 || !input.saves || typeof input.saves !== 'object' || Array.isArray(input.saves)) return result;
  if (categories.has(input.categoryId)) result.categoryId = input.categoryId;
  if (['c','q','v'].includes(input.preferences?.crouchKey)) result.preferences.crouchKey = input.preferences.crouchKey;
  if (['system','reduce'].includes(input.preferences?.reduceMotion)) result.preferences.reduceMotion = input.preferences.reduceMotion;
  for (const [id, value] of Object.entries(input.saves)) {
    // A room's save can only be restored to that same room, even if a payload
    // happens to contain some of the same evidence field names.
    if (!validCase(id) || !value || value.caseId !== id) continue;
    const state = restoreState(value);
    if (state.caseId === id) result.saves[id] = state;
  }
  if (validCase(input.activeCaseId) && result.saves[input.activeCaseId]) result.activeCaseId = input.activeCaseId;
  return result;
}

export function readLibrary(storage) {
  let library = createLibrary();
  try {
    const raw = storage.getItem(LIBRARY_KEY);
    if (raw) return { library: restoreLibrary(JSON.parse(raw)), available: true };
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy) {
      const value = JSON.parse(legacy);
      if (value?.schemaVersion === 3) {
        library.saves.sunny = restoreState({ ...value, schemaVersion: 4, caseId: 'sunny' });
        library.activeCaseId = 'sunny';
      }
    }
    return { library, available: true };
  } catch {
    // Keep the game playable when browser storage is denied or damaged.
    return { library, available: false };
  }
}

export function writeLibrary(storage, library) {
  try { storage.setItem(LIBRARY_KEY, JSON.stringify(library)); return true; }
  catch { return false; }
}
