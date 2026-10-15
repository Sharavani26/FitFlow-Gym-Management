import api from './api';

export const listPlans = () => api.get('/plans').then((res) => res.data.plans);
export const createPlan = (data) => api.post('/plans', data).then((res) => res.data.plan);
export const updatePlan = (id, data) => api.put(`/plans/${id}`, data).then((res) => res.data.plan);