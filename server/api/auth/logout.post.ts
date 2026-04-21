export default defineEventHandler((event) => {
  deleteCookie(event, 'nautar-token', { path: '/' })
  return { ok: true }
})
