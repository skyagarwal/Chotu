import axios, { AxiosInstance, AxiosError } from 'axios';

type JsonRecord = Record<string, unknown>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          const token = state?.token;
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Failed to parse auth token:', error);
        }
      }

      // Zone ID
      const zoneId = localStorage.getItem('mangwale-user-zone-id');
      if (zoneId && config.headers) {
        config.headers['X-Zone-Id'] = zoneId;
        // Also add zoneId header as expected by some endpoints
        config.headers['zoneId'] = JSON.stringify([parseInt(zoneId)]);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth
  auth: {
    sendOtp: (phone: string) =>
      apiClient.post('/v1/auth/send-otp', { phone }),
    
    verifyOtp: (phone: string, otp: string) =>
      apiClient.post('/v1/auth/verify-otp', { phone, otp }),
    
    updateUserInfo: (data: { phone: string; f_name: string; l_name: string; email: string }) =>
      apiClient.post('/v1/auth/update-info', data),
    
    getProfile: () =>
      apiClient.get('/v1/auth/profile'),
    
    updateProfile: (data: JsonRecord) =>
      apiClient.put('/v1/auth/profile', data),
    
    logout: () =>
      apiClient.post('/v1/auth/logout'),

    login: (data: { phone: string; password: string }) =>
      apiClient.post('/v1/auth/login', data),

    socialLogin: (data: { token: string; unique_id: string; email: string; medium: string }) =>
      apiClient.post('/v1/auth/social-login', data),
  },

  // Orders
  orders: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/v1/orders', { params }),
    
    get: (id: string | number) =>
      apiClient.get(`/v1/orders/${id}`),
    
    create: (data: JsonRecord) =>
      apiClient.post('/v1/orders', data),
    
    track: (id: string | number) =>
      apiClient.get(`/v1/orders/${id}/track`),
    
    cancel: (id: string | number, reason?: string) =>
      apiClient.put(`/v1/orders/${id}/cancel`, { reason }),
  },

  // Addresses
  addresses: {
    list: () =>
      apiClient.get('/v1/addresses'),
    
    get: (id: string | number) =>
      apiClient.get(`/v1/addresses/${id}`),
    
    create: (data: JsonRecord) =>
      apiClient.post('/v1/addresses', data),
    
    update: (id: string | number, data: JsonRecord) =>
      apiClient.put(`/v1/addresses/${id}`, data),
    
    delete: (id: string | number) =>
      apiClient.delete(`/v1/addresses/${id}`),
  },

  // Payments
  payments: {
    methods: () =>
      apiClient.get('/v1/payments/methods'),
    
    initiate: (data: JsonRecord) =>
      apiClient.post('/v1/payments/initiate', data),
    
    verify: (data: JsonRecord) =>
      apiClient.post('/v1/payments/verify', data),
  },

  // Parcel Module
  parcel: {
    getVehicles: () =>
      apiClient.get('/v1/parcel/vehicles'),
    
    calculateDistance: (data: JsonRecord) =>
      apiClient.post('/v1/parcel/calculate-distance', data),
    
    getCharges: (params?: Record<string, unknown>) =>
      apiClient.get('/v1/parcel/vehicle-charges', { params }),
    
    createOrder: (data: JsonRecord) =>
      apiClient.post('/v1/parcel/orders', data),
    
    trackOrder: (orderId: string) =>
      apiClient.get(`/v1/parcel/orders/${orderId}/track`),
  },

  // Health
  health: () =>
    apiClient.get('/health'),
};

export default apiClient;
