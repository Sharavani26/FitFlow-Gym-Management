import api from './api';

export const listAttendance = (date) => api.get('/attendance', { params: { date } }).then((res) => res.data.records);
export const checkIn = (userId) => api.post('/attendance/check-in', { userId }).then((res) => res.data.record);
export const checkOut = (id) => api.patch(`/attendance/${id}/check-out`).then((res) => res.data.record);
export const checkInMyself = () => api.post('/attendance/mine/check-in').then((res) => res.data.record);
export const checkOutMyself = () => api.patch('/attendance/mine/check-out').then((res) => res.data.record);
export const listMyAttendance = () => api.get('/attendance/mine').then((res) => res.data);