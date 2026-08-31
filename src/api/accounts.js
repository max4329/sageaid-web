import { http } from './http'

export async function getAccounts(kind) {
  const { data } = await http.get('/accounts', {
    params: kind ? { kind } : undefined,
  })
  return data
}

export async function createAccount(payload) {
  const { data } = await http.post('/accounts', payload)
  return data
}

export async function deleteAccount(id) {
  const { data } = await http.delete(`/accounts/${id}`)
  return data
}
