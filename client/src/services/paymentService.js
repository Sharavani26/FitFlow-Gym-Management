import api from './api';

export const listPayments = (params) => api.get('/payments', { params }).then((res) => res.data);
export const createPayment = (data) => api.post('/payments', data).then((res) => res.data.payment);
export const requestPlanPayment = (data) => api.post('/payments/request', data).then((res) => res.data);
export const verifyPayment = (id) => api.post(`/payments/${id}/verify`).then((res) => res.data);
export const rejectPayment = (id) => api.post(`/payments/${id}/reject`).then((res) => res.data.payment);