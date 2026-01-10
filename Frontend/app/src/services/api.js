import axios from 'axios'

// Zentral API konfigurieren
const api = axios.create({
  baseURL: 'http://localhost:4001/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request Interceptor 
api.interceptors.request.use(
  config => {
    // Logging, Token hinzufügen, etc.
    return config
  },
  error => Promise.reject(error)
)

// Response Interceptor für zentrale Error-Behandlung
api.interceptors.response.use(
  response => response.data, // Nur Daten zurückgeben
  error => {
    // Zentrale Error-Behandlung
    if (error.response) {
      // Server hat geantwortet mit Status /2xx
      console.error('API Error:', error.response.status, error.response.data)
    } else if (error.request) {
      // Request wurde gemacht, aber keine Antwort
      console.error('Network Error:', error.request)
    } else {
      // Fehler beim erstellen des Requests
      console.error('Error:', error.message)
    }
    return Promise.reject(error)
  }
)

// API Funktionen exportieren
export const userService = {
  getUsers: (filters = {}, sortBy = 'name', sortOrder = 'asc') => {
    const params = { ...filters, sortBy, sortOrder }
    return api.get('/users', { params })
  },
  
  getUser: (id) => api.get(`/users/${id}`),
  
  createUser: (userData) => api.post('/users', userData),
  
  updateUser: (id, userData) => api.patch(`/users/${id}`, userData),
  
  blockUser: (id) => api.patch(`/users/${id}/block`),
  
  unblockUser: (id) => api.patch(`/users/${id}/unblock`),
  
  importUsers: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/users/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export default api
