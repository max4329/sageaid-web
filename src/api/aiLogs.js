import { http } from './http'

export async function queryAiLogs(body) {
  const { data } = await http.post('/ai/logs/query', body)
  return data
}

export async function getAiLogById(id) {
  const { data } = await http.get(`/ai/logs/by-id/${encodeURIComponent(id)}`)
  return data
}

export async function deleteAiLog(id) {
  const { data } = await http.post('/ai/logs/delete', { id })
  return data
}

export async function clearAiLogs(body) {
  const { data } = await http.post('/ai/logs/clear', body || {})
  return data
}


