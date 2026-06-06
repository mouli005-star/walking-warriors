import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
})

// Auto-attach JWT token
API.interceptors.request.use(config => {
  const token = localStorage.getItem('bb_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const auth = {
  login: (email, password) =>
    API.post('/auth/login', { email, password }),
  me: () => API.get('/auth/me'),
}

export const patients = {
  list: (params) => API.get('/patients/', { params }),
  get: (id) => API.get(`/patients/${id}`),
  bloodFamily: (id) => API.get(`/patients/${id}/blood-family`),
  cascades: (id) => API.get(`/patients/${id}/cascades`),
  register: (data) => API.post('/patients/register', data),
}

export const donors = {
  list: (params) => API.get('/donors/', { params }),
  get: (id) => API.get(`/donors/${id}`),
  churn: () => API.get('/donors/analytics/churn'),
  byRole: () => API.get('/donors/analytics/by-role'),
  ranked: (params) => API.get('/donors/score/ranked', { params }),
  register: (data) => API.post('/donors/register', data),
}

export const cascade = {
  trigger: (data) => API.post('/cascade/trigger', data),
  runs: (params) => API.get('/cascade/runs', { params }),
  detail: (id) => API.get(`/cascade/runs/${id}`),
  advance: (id) => API.post(`/cascade/runs/${id}/advance`),
  donorReply: (data) => API.post('/cascade/donor-reply', data),
}

export const ai = {
  ngoChat: (question) => API.post('/ai/ngo-chat', { question }),
  chat: (data) => API.post('/ai/chat', data),
  parseIntent: (raw_reply, donor_name) =>
    API.post(`/ai/parse-intent?raw_reply=${encodeURIComponent(raw_reply)}&donor_name=${encodeURIComponent(donor_name)}`),
}

export const dashboard = {
  scarcity: () => API.get('/dashboard/scarcity'),
  auditLog: (params) => API.get('/dashboard/audit-log', { params }),
}

export default API
