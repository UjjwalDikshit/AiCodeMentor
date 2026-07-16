const ACCESS_TOKEN_KEY = 'cm_access_token';

let memoryToken = null;

export function getAccessToken() {
  return memoryToken || localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token) {
  memoryToken = token;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function clearAccessToken() {
  memoryToken = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
