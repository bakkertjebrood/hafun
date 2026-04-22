const PUBLIC_ROUTES = new Set<string>(['/login'])
const SETUP_ROUTE = '/onboarding'

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC_ROUTES.has(to.path)) return

  const { user, fetchMe } = useAuthUser()
  if (!user.value) {
    await fetchMe()
  }

  if (!user.value) {
    return navigateTo({ path: '/login', query: to.path === '/' ? undefined : { redirect: to.fullPath } })
  }

  const needsSetup = !user.value.marina.setupComplete
  const canSetup = user.value.role === 'HARBORMASTER' || user.value.role === 'ADMIN'

  if (needsSetup && canSetup && to.path !== SETUP_ROUTE) {
    return navigateTo(SETUP_ROUTE)
  }

  if (!needsSetup && to.path === SETUP_ROUTE) {
    return navigateTo('/dashboard/map')
  }
})
