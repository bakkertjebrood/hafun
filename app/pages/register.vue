<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const { user, fetchMe } = useAuthUser()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const marinaName = ref('')
const acceptTerms = ref(false)

const error = ref<string | null>(null)
const submitting = ref(false)

const passwordTooShort = computed(() => password.value.length > 0 && password.value.length < 12)
const passwordsDontMatch = computed(() =>
  passwordConfirm.value.length > 0 && password.value !== passwordConfirm.value
)

const canSubmit = computed(() =>
  firstName.value.trim()
  && lastName.value.trim()
  && email.value.trim()
  && password.value.length >= 12
  && password.value === passwordConfirm.value
  && marinaName.value.trim()
  && acceptTerms.value
)

onMounted(async () => {
  if (!user.value) await fetchMe()
  if (user.value) {
    await navigateTo('/dashboard')
  }
})

async function onSubmit() {
  if (submitting.value || !canSubmit.value) return
  error.value = null
  submitting.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        password: password.value,
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        marinaName: marinaName.value.trim()
      }
    })
    await fetchMe()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/onboarding'
    await navigateTo(redirect)
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string }, statusMessage?: string }
    error.value = err?.data?.message || err?.statusMessage || 'Registreren is mislukt'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8] flex items-center justify-center px-4 py-10">
    <div class="w-full max-w-[440px]">
      <div class="flex justify-center mb-8">
        <NuxtLink to="/">
          <NautarLogo :size="22" />
        </NuxtLink>
      </div>
      <div class="bg-white border border-black/[0.08] rounded-[16px] p-6 lg:p-7">
        <h1 class="text-xl font-semibold tracking-tight text-[#0A1520] mb-1">Account aanmaken</h1>
        <p class="text-sm text-[#2D3E4A] mb-6">Start je gratis proefperiode van 30 dagen.</p>

        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-[#2D3E4A]">Voornaam</span>
              <input
                v-model="firstName"
                type="text"
                autocomplete="given-name"
                required
                class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-[#2D3E4A]">Achternaam</span>
              <input
                v-model="lastName"
                type="text"
                autocomplete="family-name"
                required
                class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
            </label>
          </div>

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
            <span class="text-xs font-medium text-[#2D3E4A]">Naam van je haven</span>
            <input
              v-model="marinaName"
              type="text"
              required
              placeholder="bijv. Jachthaven Lands End"
              class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
            <span class="text-[11px] text-[#5A6A78]">Je kunt dit later aanpassen.</span>
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-[#2D3E4A]">Wachtwoord</span>
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              minlength="12"
              class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              :class="passwordTooShort ? 'border-red-400' : ''"
            >
            <span
              class="text-[11px]"
              :class="passwordTooShort ? 'text-red-600' : 'text-[#5A6A78]'"
            >
              Minimaal 12 tekens.
            </span>
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-[#2D3E4A]">Herhaal wachtwoord</span>
            <input
              v-model="passwordConfirm"
              type="password"
              autocomplete="new-password"
              required
              class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              :class="passwordsDontMatch ? 'border-red-400' : ''"
            >
            <span
              v-if="passwordsDontMatch"
              class="text-[11px] text-red-600"
            >
              Wachtwoorden komen niet overeen.
            </span>
          </label>

          <label class="flex items-start gap-2.5 mt-1 cursor-pointer">
            <input
              v-model="acceptTerms"
              type="checkbox"
              required
              class="mt-0.5 size-4 accent-primary-500"
            >
            <span class="text-[12px] text-[#2D3E4A] leading-relaxed">
              Ik ga akkoord met de voorwaarden en het verwerken van mijn gegevens om een Nautar-account aan te maken.
            </span>
          </label>

          <div
            v-if="error"
            class="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-[10px] px-3 py-2"
          >
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="submitting || !canSubmit"
            class="h-11 rounded-[10px] bg-primary-500 text-white text-sm font-semibold tracking-tight hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ submitting ? 'Account wordt aangemaakt...' : 'Maak account aan' }}
          </button>
        </form>

        <div class="mt-5 pt-5 border-t border-black/[0.06] text-center text-sm text-[#2D3E4A]">
          Al een account?
          <NuxtLink to="/login" class="text-primary-600 hover:text-primary-700 font-medium">
            Inloggen
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
