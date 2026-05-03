const PUBLIC_ROUTES = new Set<string>(['/', '/login', '/register', '/privacy', '/voorwaarden'])
const PUBLIC_PREFIXES = ['/h/', '/embed/']
const SETUP_ROUTE = '/onboarding'

export default defineNuxtRouteMiddleware(async (to) => {
  const isPublic = PUBLIC_ROUTES.has(to.path)
    || PUBLIC_PREFIXES.some(p => to.path.startsWith(p))

  const { user, fetchMe } = useAuthUser()
  if (!user.value) {
    await fetchMe()
  }

  // Logged-in users hitting marketing/auth pages → straight to the app
  if (user.value && (to.path === '/' || to.path === '/register' || to.path === '/login')) {
    if (user.value.role === 'PORTAL') return navigateTo('/portal')
    return navigateTo('/dashboard')
  }

  if (isPublic) return

  if (!user.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  // Huurders worden naar het portaal gestuurd (publieke routes hierboven al toegestaan)
  if (user.value.role === 'PORTAL') {
    if (!to.path.startsWith('/portal')) {
      return navigateTo('/portal')
    }
    return
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
