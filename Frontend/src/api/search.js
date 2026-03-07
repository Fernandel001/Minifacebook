import api from './axios';

export const search = (q, filter) => api.get('/search', { params: { q, filter } });