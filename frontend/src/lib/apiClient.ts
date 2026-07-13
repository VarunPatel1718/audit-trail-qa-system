import axios from 'axios'

export const AUTH_TOKEN_KEY = 'atqa_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function storeToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}

export function clearStoredToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
})

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const AUTH_UNAUTHORIZED_EVENT = 'atqa:unauthorized'

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredToken()
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)
