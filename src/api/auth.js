import { http } from './http'

export async function getCaptcha() {
  const { data } = await http.get('/auth/captcha')
  return data
}

export async function verifyCaptcha({ captchaId, offsetX }) {
  const { data } = await http.post('/auth/captcha/verify', { captchaId, offsetX })
  return data
}

export async function login({ username, password, captchaId, captchaTicket }) {
  const { data } = await http.post('/auth/admin-login', {
    username,
    password,
    captchaId,
    captchaTicket,
  })
  return data
}
