<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const { login, user, fetchMe } = useAuthUser()
const runtime = useRuntimeConfig()
const googleEnabled = computed(() => !!runtime.public.googleEnabled)

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

onMounted(async () => {
  if (typeof route.query.error === 'string' && route.query.error) {
    error.value = route.query.error
  }
  if (!user.value) await fetchMe()
  if (user.value) {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await navigateTo(redirect)
  }
})

const googleHref = computed(() => {
  const params = new URLSearchParams({ intent: 'login' })
  if (typeof route.query.redirect === 'string') params.set('redirect', route.query.redirect)
  return `/api/auth/google/start?${params.toString()}`
})

async function onSubmit() {
  if (submitting.value) return
  error.value = null
  submitting.value = true
  try {
    await login(email.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await navigateTo(redirect)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, statusMessage?: string }
    error.value = err?.data?.message || err?.statusMessage || 'Inloggen mislukt'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8] flex items-center justify-center px-4">
    <div class="w-full max-w-[400px]">
      <div class="flex justify-center mb-8">
        <NuxtLink to="/">
          <NautarLogo :size="22" />
        </NuxtLink>
      </div>
      <div class="bg-white border border-black/[0.08] rounded-[16px] p-6 lg:p-7">
        <h1 class="text-xl font-semibold tracking-tight text-[#0A1520] mb-1">
          Inloggen
        </h1>
        <p class="text-sm text-[#2D3E4A] mb-6">
          Welkom terug bij Nautar.
        </p>

        <a
          v-if="googleEnabled"
          :href="googleHref"
          class="h-11 mb-4 rounded-[10px] border border-black/[0.12] bg-white text-sm font-semibold text-[#0A1520] hover:bg-[#F4F7F8] transition-colors flex items-center justify-center gap-2.5"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            />
          </svg>
          Inloggen met Google
        </a>

        <div
          v-if="googleEnabled"
          class="relative my-2 flex items-center"
        >
          <div class="flex-grow border-t border-black/[0.08]" />
          <span class="mx-3 text-[11px] uppercase tracking-wider text-[#5A6A78]">of</span>
          <div class="flex-grow border-t border-black/[0.08]" />
        </div>

        <form
          class="flex flex-col gap-4"
          @submit.prevent="onSubmit"
        >
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-[#2D3E4A]">E-mail</span>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-[#2D3E4A]">Wachtwoord</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
          </label>

          <div
            v-if="error"
            class="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-[10px] px-3 py-2"
          >
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="h-11 rounded-[10px] bg-primary-500 text-white text-sm font-semibold tracking-tight hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {{ submitting ? 'Bezig...' : 'Inloggen' }}
          </button>
        </form>

        <div class="mt-5 pt-5 border-t border-black/[0.06] text-center text-sm text-[#2D3E4A]">
          Nog geen account?
          <NuxtLink
            to="/register"
            class="text-primary-600 hover:text-primary-700 font-medium"
          >
            Registreer je haven
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
