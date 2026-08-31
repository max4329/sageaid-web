import { http } from './http'

export async function listPreflopRanges() {
  const { data } = await http.get('/preflop-ranges')
  return data
}

export async function importPreflopRange(payload) {
  const { data } = await http.post('/preflop-ranges/import', payload)
  return data
}

export async function activatePreflopRange(id) {
  const { data } = await http.post(`/preflop-ranges/${id}/activate`)
  return data
}

export async function queryPreflopRanges(params) {
  const { data } = await http.post('/preflop-ranges/query', params)
  return data
}
