<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const { user, fetchMe } = useAuthUser()
const runtime = useRuntimeConfig()
const googleEnabled = computed(() => !!runtime.public.googleEnabled)

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
  if (typeof route.query.error === 'string' && route.query.error) {
    error.value = route.query.error
  }
  if (!user.value) await fetchMe()
  if (user.value) {
    await navigateTo('/dashboard')
  }
})

const canStartGoogle = computed(() => marinaName.value.trim().length > 0 && acceptTerms.value)

function startGoogle() {
  if (!canStartGoogle.value) {
    error.value = 'Vul de naam van je haven in en accepteer de voorwaarden om door te gaan met Google'
    return
  }
  const params = new URLSearchParams({
    intent: 'register',
    marinaName: marinaName.value.trim()
  })
  window.location.href = `/api/auth/google/start?${params.toString()}`
}

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
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, statusMessage?: string }
    error.value = err?.data?.message || err?.statusMessage || 'Registreren is mislukt'
  } finally {
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
        <h1 class="text-xl font-semibold tracking-tight text-[#0A1520] mb-1">
          Account aanmaken
        </h1>
        <p class="text-sm text-[#2D3E4A] mb-6">
          Start je gratis proefperiode van 30 dagen.
        </p>

        <form
          class="flex flex-col gap-4"
          @submit.prevent="onSubmit"
        >
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-[#2D3E4A]">Naam van je haven</span>
            <input
              v-model="marinaName"
              type="text"
              required
              placeholder="bijv. Jachthaven Lands End"
              class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
          </label>

          <label class="flex items-start gap-2.5 cursor-pointer">
            <input
              v-model="acceptTerms"
              type="checkbox"
              required
              class="mt-0.5 size-4 accent-primary-500"
            >
            <span class="text-[12px] text-[#2D3E4A] leading-relaxed">
              Ik ga akkoord met de
              <NuxtLink
                to="/voorwaarden"
                target="_blank"
                class="text-primary-600 hover:text-primary-700 underline"
              >voorwaarden</NuxtLink>
              en het
              <NuxtLink
                to="/privacy"
                target="_blank"
                class="text-primary-600 hover:text-primary-700 underline"
              >privacybeleid</NuxtLink>.
            </span>
          </label>

          <button
            v-if="googleEnabled"
            type="button"
            :disabled="!canStartGoogle"
            class="h-11 rounded-[10px] border border-black/[0.12] bg-white text-sm font-semibold text-[#0A1520] hover:bg-[#F4F7F8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2.5"
            @click="startGoogle"
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
            Doorgaan met Google
          </button>

          <div
            v-if="googleEnabled"
            class="relative my-1 flex items-center"
          >
            <div class="flex-grow border-t border-black/[0.08]" />
            <span class="mx-3 text-[11px] uppercase tracking-wider text-[#5A6A78]">of met e-mail</span>
            <div class="flex-grow border-t border-black/[0.08]" />
          </div>

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
          <NuxtLink
            to="/login"
            class="text-primary-600 hover:text-primary-700 font-medium"
          >
            Inloggen
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
