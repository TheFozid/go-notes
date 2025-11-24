import axios from 'axios';

// Detect base path from <base> tag injected by backend
function getBasePath(): string {
  const baseTag = document.querySelector('base');
  if (baseTag && baseTag.href) {
    const url = new URL(baseTag.href);
    return url.pathname.replace(/\/$/, ''); // Remove trailing slash
  }
  return '';
}

const basePath = getBasePath();

const apiClient = axios.create({
  baseURL: basePath,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and reload page to redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = basePath + '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
