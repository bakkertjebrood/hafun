<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const { login, user, fetchMe } = useAuthUser()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

onMounted(async () => {
  if (!user.value) await fetchMe()
  if (user.value) {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await navigateTo(redirect)
  }
})

async function onSubmit() {
  if (submitting.value) return
  error.value = null
  submitting.value = true
  try {
    await login(email.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await navigateTo(redirect)
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string }, statusMessage?: string }
    error.value = err?.data?.message || err?.statusMessage || 'Inloggen mislukt'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8] flex items-center justify-center px-4">
    <div class="w-full max-w-[400px]">
      <div class="flex justify-center mb-8">
        <NautarLogo :size="22" />
      </div>
      <div class="bg-white border border-black/[0.08] rounded-[16px] p-6 lg:p-7">
        <h1 class="text-xl font-semibold tracking-tight text-[#0A1520] mb-1">Inloggen</h1>
        <p class="text-sm text-[#2D3E4A] mb-6">Welkom terug bij Nautar.</p>

        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
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
      </div>
    </div>
  </div>
</template>
