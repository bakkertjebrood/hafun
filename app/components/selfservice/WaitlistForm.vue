<script setup lang="ts">
import { ref, computed } from 'vue'
import WaitlistSignup from '../illustrations/WaitlistSignup.vue'

const props = defineProps<{
  slug: string
  marina: {
    name: string
    accentColor?: string | null
    selfService: {
      waitlist: { enabled: boolean; applicationFee?: number | null; requireConsent: boolean }
    }
  }
}>()

const submitting = ref(false)
const error = ref<string | null>(null)
const done = ref(false)
const form = ref({
  name: '',
  email: '',
  phone: '',
  boatLength: 0,
  boatWidth: 0,
  boatType: '',
  preferredPier: '',
  notes: '',
  consent: false
})

const fee = computed(() => props.marina.selfService.waitlist.applicationFee || 0)
const accentStyle = computed(() => props.marina.accentColor
  ? { '--ss-accent': props.marina.accentColor } as Record<string, string>
  : {})

async function submit() {
  if (props.marina.selfService.waitlist.requireConsent && !form.value.consent) {
    error.value = 'Toestemming voor verwerking is vereist'
    return
  }
  submitting.value = true
  error.value = null
  try {
    await $fetch(`/api/public/${props.slug}/waitlist`, {
      method: 'POST',
      body: { ...form.value }
    })
    done.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message || err?.message || 'Er ging iets mis'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div :style="accentStyle" class="space-y-6">
    <div class="flex items-center gap-4">
      <WaitlistSignup class="size-16 text-[var(--ss-accent,#00A9A5)] shrink-0" />
      <div>
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight">Schrijf je in voor de wachtlijst</h1>
        <p class="text-sm text-[#2D3E4A]">{{ marina.name }}</p>
      </div>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3">
      {{ error }}
    </div>

    <div v-if="done" class="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
      <div class="font-semibold">Inschrijving ontvangen</div>
      <div class="mt-1">We nemen contact op zodra er een ligplaats vrijkomt. Bewaar je bevestigingsmail.</div>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <label class="block">
        <span class="text-sm font-medium">Naam</span>
        <input v-model="form.name" required class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium">E-mail</span>
          <input v-model="form.email" type="email" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Telefoon</span>
          <input v-model="form.phone" type="tel" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
        </label>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium">Bootlengte (m)</span>
          <input v-model.number="form.boatLength" type="number" step="0.1" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Bootbreedte (m)</span>
          <input v-model.number="form.boatWidth" type="number" step="0.1" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
        </label>
      </div>
      <label class="block">
        <span class="text-sm font-medium">Type boot</span>
        <input v-model="form.boatType" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
      </label>
      <label class="block">
        <span class="text-sm font-medium">Opmerkingen</span>
        <textarea v-model="form.notes" rows="3" class="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" />
      </label>

      <label v-if="marina.selfService.waitlist.requireConsent" class="flex items-start gap-2 text-sm">
        <input v-model="form.consent" type="checkbox" class="mt-1" />
        <span>Ik ga akkoord dat mijn gegevens worden opgeslagen voor de wachtlijst.</span>
      </label>

      <p v-if="fee > 0" class="text-xs text-[#5A6A78]">
        Eenmalige aanmeldfee: € {{ fee.toFixed(2) }} — afgerekend na bevestiging.
      </p>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full h-11 rounded-full text-sm font-semibold text-white bg-[var(--ss-accent,#00A9A5)] hover:opacity-90 disabled:opacity-60"
      >
        {{ submitting ? 'Bezig…' : 'Inschrijven' }}
      </button>
    </form>
  </div>
</template>
