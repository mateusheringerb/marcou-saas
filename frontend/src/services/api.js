import axios from 'axios';

// Detecta se deve usar o link local ou o da nuvem
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL: apiUrl });

api.interceptors.request.use(async config => {
    const token = localStorage.getItem('marcou_token') || sessionStorage.getItem('marcou_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;