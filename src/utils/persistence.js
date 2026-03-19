// ============================================================
// Data Persistence Utility (LocalStorage)
// ============================================================

const STORAGE_KEY = 'medfocus_user_data';

/**
 * Save current state to localStorage
 */
export function saveToStorage(data) {
  try {
    const currentState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const newState = { ...currentState, ...data, lastUpdated: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

/**
 * Load state from localStorage
 */
export function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return null;
  }
}

/**
 * Initialize mockData arrays with persisted data if available
 */
export function initializeData(mockData) {
  const persisted = loadFromStorage();
  if (!persisted) return;

  if (persisted.userChecklistProgress) {
    mockData.userChecklistProgress.splice(0, mockData.userChecklistProgress.length, ...persisted.userChecklistProgress);
  }
  if (persisted.studyLogs) {
    // We only persist user-added logs, but for demo we can replace all if they exist
    mockData.studyLogs.splice(0, mockData.studyLogs.length, ...persisted.studyLogs);
  }
  if (persisted.posts) {
    mockData.posts.splice(0, mockData.posts.length, ...persisted.posts);
  }
  if (persisted.currentUser) {
    Object.assign(mockData.currentUser, persisted.currentUser);
  }
}
