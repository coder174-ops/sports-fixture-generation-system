import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
};

export const tournamentAPI = {
  getAll: () => API.get('/tournaments'),
  getOne: (id) => API.get(`/tournaments/${id}`),
  create: (data) => API.post('/tournaments', data),
  update: (id, data) => API.put(`/tournaments/${id}`, data),
  delete: (id) => API.delete(`/tournaments/${id}`),
};

export const teamAPI = {
  getByTournament: (tournamentId) => API.get(`/teams/tournament/${tournamentId}`),
  getAll: () => API.get('/teams'),
  register: (data) => API.post('/teams/register', data),
  updateStatus: (id, data) => API.put(`/teams/${id}/status`, data),
  update: (id, data) => API.put(`/teams/${id}`, data),
  delete: (id) => API.delete(`/teams/${id}`),
  getMyTeams: () => API.get('/teams/my/teams'),
};

export const matchAPI = {
  getByTournament: (tournamentId) => API.get(`/matches/tournament/${tournamentId}`),
  generate: (tournamentId) => API.post(`/matches/generate/${tournamentId}`),
  updateScore: (id, data) => API.put(`/matches/${id}/score`, data),
  update: (id, data) => API.put(`/matches/${id}`, data),
};

export default API;
