export interface AuthUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  marina: {
    id: string
    name: string
    slug: string
  }
}

export function useAuthUser() {
  const user = useState<AuthUser | null>('auth-user', () => null)

  async function fetchMe() {
    try {
      user.value = await $fetch<AuthUser>('/api/auth/me')
    }
    catch {
      user.value = null
    }
    return user.value
  }

  async function login(email: string, password: string) {
    const res = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    user.value = res.user
    return res.user
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    }
    finally {
      user.value = null
      await navigateTo('/login')
    }
  }

  const initials = computed(() => {
    if (!user.value) return ''
    const first = user.value.firstName?.[0] ?? user.value.email[0] ?? ''
    const last = user.value.lastName?.[0] ?? ''
    return `${first}${last}`.toUpperCase()
  })

  const fullName = computed(() => {
    if (!user.value) return ''
    const name = `${user.value.firstName ?? ''} ${user.value.lastName ?? ''}`.trim()
    return name || user.value.email
  })

  const roleLabel = computed(() => {
    const map: Record<string, string> = {
      ADMIN: 'Beheerder',
      HARBORMASTER: 'Havenmeester',
      STAFF: 'Medewerker',
      PORTAL: 'Portaal'
    }
    return user.value ? (map[user.value.role] ?? user.value.role) : ''
  })

  return { user, fetchMe, login, logout, initials, fullName, roleLabel }
}
