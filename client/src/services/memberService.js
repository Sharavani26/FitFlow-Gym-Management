import api from './api';

export const listMembers = (params) => api.get('/members', { params }).then((res) => res.data);
export const assignPlan = (memberId, data) =>
  api.post(`/members/${memberId}/membership`, data).then((res) => res.data.membership);