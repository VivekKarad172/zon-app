import axios from 'axios';

import { Capacitor } from '@capacitor/core';

// Determine the base URL based on platform
// If VITE_API_URL is set, use it.
// Otherwise, if we are in Production (Cloud), use relative path '/api' (Same Domain).
// If in Development (Local), use localhost.
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
    baseURL: baseURL,
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
