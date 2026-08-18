import axios from "axios";

const baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  withCredentials: true,
});

// Automatically attach JWT tokens from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    try { localStorage.setItem("token", token); } catch {}
  } else {
    delete api.defaults.headers.common["Authorization"];
    try { localStorage.removeItem("token"); } catch {}
  }
}

export function getStoredToken() {
  try { return localStorage.getItem("token"); } catch { return null; }
}

// hydrate on module load
const t = getStoredToken();
if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;

// Billing endpoints
export async function startCheckout(packageId) {
  const { data } = await api.post('/billing/checkout', {
    package_id: packageId,
    origin_url: window.location.origin
  });
  return data.checkout_url || data.url;
}

export async function getPaymentStatus(sessionId) {
  const { data } = await api.get(`/billing/status/${sessionId}`);
  return data;
}

export async function openCustomerPortal() {
  const { data } = await api.post('/billing/portal', {
    return_url: `${window.location.origin}/settings`
  });
  return data.portal_url;
}

// Progress Altar endpoint
export async function getProgressAltar() {
  const { data } = await api.get('/progress/altar');
  const total = data.total_lessons_catalog || 0;
  const completed = data.total_completed_unique || 0;
  return {
    summary: data.summary || { 
      total_lessons: total, 
      completed: completed,
      total: total,
      completion_rate: total ? Math.round((completed / total) * 100) : 0
    },
    by_category: data.by_category || data.categories || {},
    timeline: data.timeline || data.timeline_14d || [],
    lessons: data.lessons || []
  };
}
