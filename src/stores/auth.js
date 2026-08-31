import { defineStore } from 'pinia'
import { login as apiLogin } from '../api/auth'

const TOKEN_KEY = 'sageaid_admin_token'
const USERNAME_KEY = 'sageaid_admin_username'

function decodeJwtPayload(token) {
  if (!token) return null
  const parts = String(token).split('.')
  if (parts.length < 2) return null
  const payload = parts[1]
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')
  const base = padded.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return JSON.parse(atob(base))
  } catch {
    return null
  }
}

function getRoleFromToken(token) {
  const payload = decodeJwtPayload(token)
  return payload?.role || ''
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    username: localStorage.getItem(USERNAME_KEY) || '',
    role: getRoleFromToken(localStorage.getItem(TOKEN_KEY) || ''),
    loading: false,
  }),
  getters: {
    isAuthed: (s) => !!s.token,
    isAdmin: (s) => s.role === 'admin',
  },
  actions: {
    async login({ username, password, captchaId, captchaTicket }) {
      this.loading = true
      try {
        const res = await apiLogin({ username, password, captchaId, captchaTicket })
        this.token = res.token || ''
        this.username = username
        this.role = getRoleFromToken(this.token)
        localStorage.setItem(TOKEN_KEY, this.token)
        localStorage.setItem(USERNAME_KEY, this.username)
        return res
      } finally {
        this.loading = false
      }
    },
    logout() {
      this.token = ''
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USERNAME_KEY)
      this.role = ''
    },
  },
})


