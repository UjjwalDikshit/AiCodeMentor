export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export function getAvatarUrl(avatar) {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return `${BACKEND_URL}${avatar}`;
}
