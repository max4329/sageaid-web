import { http } from './http'

export async function getAllyNicks() {
  const { data } = await http.get('/ai/ally-nicks')
  return data
}

export async function addAllyNick(nickname) {
  const { data } = await http.post('/ai/ally-nicks', { nickname })
  return data
}

export async function updateAllyNick(oldNickname, newNickname) {
  const { data } = await http.put('/ai/ally-nicks', { oldNickname, newNickname })
  return data
}

export async function deleteAllyNick(nickname) {
  const key = String(nickname ?? '').trim()
  const { data } = await http.delete(`/ai/ally-nicks/${encodeURIComponent(key)}`)
  return data
}

