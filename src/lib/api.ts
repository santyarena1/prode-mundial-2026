/** Fetch con cookies de sesión incluidas (mismo origen) */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
  });
}
