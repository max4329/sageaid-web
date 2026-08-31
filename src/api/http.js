import axios from 'axios'

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD ? '/sageaid-server/api' : '/api')
const TOKEN_KEY = 'sageaid_admin_token'

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      const redirect = encodeURIComponent(location.pathname + location.search + location.hash)
      const loginPath = `${import.meta.env.BASE_URL}login`
      if (!location.pathname.startsWith(loginPath)) {
        location.href = `${loginPath}?redirect=${redirect}`
      }
    }
    return Promise.reject(err)
  },
)


