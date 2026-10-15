import api from './api';

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((res) => res.data);

export const fetchMe = () => api.get('/auth/me').then((res) => res.data.user);
export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password }).then((res) => res.data);