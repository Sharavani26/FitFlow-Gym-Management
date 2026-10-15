import api from './api';

export const getStats = () => api.get('/stats').then((res) => res.data.stats);
export const getMyProgress = () => api.get('/stats/me').then((res) => res.data.progress);