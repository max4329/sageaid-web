import { http } from './http'

export async function queryPlayers(body) {
  const { data } = await http.post('/players/query', body)
  return data
}

export async function savePlayer(body) {
  const { data } = await http.post('/players', body)
  return data
}

export async function getPlayerProfile(nickname) {
  const key = String(nickname ?? '').trim()
  const { data } = await http.get(`/players/${encodeURIComponent(key)}`)
  return data
}

export async function getPlayerPoolRate(nickname) {
  return await getPlayerProfile(nickname)
}

export async function deletePlayer(nickname) {
  const key = String(nickname ?? '').trim()
  const { data } = await http.delete(`/players/${encodeURIComponent(key)}`)
  return data
}


