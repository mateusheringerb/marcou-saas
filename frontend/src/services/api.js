import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL: apiUrl });

api.interceptors.request.use(async config => {
    // Garante leitura segura do storage
    const token = localStorage.getItem('marcou_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para não deslogar com erros simples, apenas se for 401 real
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            // Só desloga se o token for realmente inválido
            localStorage.removeItem('marcou_token');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;