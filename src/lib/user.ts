const NAMES = [
  'Alex', 'Blake', 'Casey', 'Dana', 'Ellis',
  'Francis', 'Grey', 'Harper', 'Indira', 'Jordan',
];
const COLORS = [
  '#F59E0B', '#10B981', '#EF4444', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface MyUser {
  userId: string;
  userName: string;
  color: string;
}

/** Returns a stable identity for this browser tab (persists across refreshes). */
export function getMyUser(): MyUser {
  const stored = sessionStorage.getItem('collabboard-user');
  if (stored) {
    try { return JSON.parse(stored) as MyUser; } catch { /* fall through */ }
  }
  const user: MyUser = {
    userId: Math.random().toString(36).slice(2, 10),
    userName: rand(NAMES),
    color: rand(COLORS),
  };
  sessionStorage.setItem('collabboard-user', JSON.stringify(user));
  return user;
}

/**
 * Reads (or creates) the board ID from the URL query string.
 * If none exists, generates one and updates the URL without a page reload.
 */
export function getBoardId(): string {
  const params = new URLSearchParams(window.location.search);
  let boardId = params.get('board');
  if (!boardId) {
    boardId = Math.random().toString(36).slice(2, 10);
    const url = new URL(window.location.href);
    url.searchParams.set('board', boardId);
    window.history.replaceState({}, '', url.toString());
  }
  return boardId;
}
