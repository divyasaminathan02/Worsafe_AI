import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000, // 10s timeout — prevents hanging forever if server is down
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Centralised error handling with meaningful messages
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // No response at all — server is down or network issue
    if (!err.response) {
      const msg = err.code === 'ECONNABORTED'
        ? 'Request timed out — server may be slow or unreachable'
        : 'Cannot connect to server. Make sure the backend is running on port 5000.';
      return Promise.reject({ ...err, response: { data: { message: msg } } });
    }

    const { status, data } = err.response;

    // 401 — token expired or invalid, force logout
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // 502 / 503 / 504 — proxy/gateway errors (backend not running)
    if (status === 502 || status === 503 || status === 504) {
      err.response.data = {
        message: `Server unavailable (${status}). Please start the backend with: cd server && npm run dev`,
      };
    }

    // 500 — internal server error
    if (status === 500 && !data?.message) {
      err.response.data = { message: 'Internal server error. Check backend console for details.' };
    }

    return Promise.reject(err);
  }
);

export default api;
