import api from './api';

export const listTrainers = () => api.get('/trainers').then((res) => res.data.trainers);
export const createTrainer = (data) => api.post('/trainers', data).then((res) => res.data.trainer);
export const updateTrainer = (id, data) => api.put(`/trainers/${id}`, data).then((res) => res.data.trainer);