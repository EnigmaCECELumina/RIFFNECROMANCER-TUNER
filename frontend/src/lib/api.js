import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    try { localStorage.setItem("riff_token", token); } catch {}
  } else {
    delete api.defaults.headers.common["Authorization"];
    try { localStorage.removeItem("riff_token"); } catch {}
  }
}

export function getStoredToken() {
  try { return localStorage.getItem("riff_token"); } catch { return null; }
}

// hydrate on module load
const t = getStoredToken();
if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
