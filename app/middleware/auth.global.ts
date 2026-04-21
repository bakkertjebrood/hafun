const PUBLIC_ROUTES = new Set<string>(['/login'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC_ROUTES.has(to.path)) return

  const { user, fetchMe } = useAuthUser()
  if (!user.value) {
    await fetchMe()
  }

  if (!user.value) {
    return navigateTo({ path: '/login', query: to.path === '/' ? undefined : { redirect: to.fullPath } })
  }
})
