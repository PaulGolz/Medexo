import axios from 'axios'

// Separate axios instance für Blob-Responses (Export)
const axiosRaw = axios.create({
  baseURL: 'http://localhost:4001/v1',
  timeout: 10000
})

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
  config => config,
  error => Promise.reject(error)
)

// Response Interceptor für zentrale Error-Behandlung
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response) {
      const errorData = error.response.data || {}
      error.responseData = errorData
    } else if (error.request) {
      error.responseData = { message: 'Network Error: No response from server' }
    } else {
      error.responseData = { message: error.message || 'Request failed' }
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
  
  deleteUser: (id) => api.delete(`/users/${id}`),
  
  exportUsers: (filters = {}, sortBy = 'name', sortOrder = 'asc') => {
    const params = { ...filters, sortBy, sortOrder }
    return axiosRaw.get('/users/export', {
      params,
      responseType: 'blob'
    }).then(response => {
      const contentType = response.headers['content-type'] || ''
      if (contentType.includes('application/json')) {
        return response.data.text().then(text => {
          try {
            const errorData = JSON.parse(text)
            return Promise.reject(new Error(errorData.message || errorData.error || 'Export failed'))
          } catch (e) {
            return Promise.reject(new Error('Export failed'))
          }
        })
      }
      return response
    }).catch(error => {
      if (error.response && error.response.data instanceof Blob) {
        const contentType = error.response.headers['content-type'] || ''
        if (contentType.includes('application/json')) {
          return error.response.data.text().then(text => {
            try {
              const errorData = JSON.parse(text)
              return Promise.reject(new Error(errorData.message || errorData.error || 'Export failed'))
            } catch (e) {
              return Promise.reject(new Error('Export failed'))
            }
          })
        }
      }
      return Promise.reject(error)
    })
  },
  
  deleteUsers: (userIds) => {
    return api.post('/users/bulk-delete', { userIds })
  },
  
  importUsers: (file, duplicateStrategy = 'skip') => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/users/import?duplicateStrategy=${duplicateStrategy}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  processDuplicates: (duplicates) => {
    return api.post('/users/import/process-duplicates', { duplicates })
  }
}

export default api
