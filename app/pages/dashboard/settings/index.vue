<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const marina = ref<any>(null)
const users = ref<any[]>([])
const piers = ref<any[]>([])
const activeTab = ref<'marina' | 'users' | 'piers'>('marina')
const saving = ref(false)
const marinaId = ref('')

// New user form
const showNewUser = ref(false)
const newUser = ref({ email: '', password: '', firstName: '', lastName: '', role: 'STAFF' })

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  HARBORMASTER: 'Havenmeester',
  STAFF: 'Medewerker',
  PORTAL: 'Huurder (portaal)'
}

onMounted(async () => {
  const discovered = await $fetch('/api/berths/discover') as any
  marinaId.value = discovered.marinaId
  await Promise.all([fetchMarina(), fetchUsers(), fetchPiers()])
  loading.value = false
})

async function fetchMarina() {
  marina.value = await $fetch('/api/marina/me')
}

async function fetchUsers() {
  users.value = await $fetch('/api/marina/users') as any[]
}

async function fetchPiers() {
  piers.value = await $fetch('/api/piers', { query: { marinaId: marinaId.value } }) as any[]
}

async function saveMarina() {
  if (!marina.value) return
  saving.value = true
  try {
    await $fetch('/api/marina/update', {
      method: 'PUT',
      body: {
        name: marina.value.name,
        gpsLat: marina.value.gpsLat,
        gpsLng: marina.value.gpsLng,
        settings: marina.value.settings
      }
    })
  }
  finally { saving.value = false }
}

async function createUser() {
  if (!newUser.value.email || !newUser.value.password || !newUser.value.firstName) return
  saving.value = true
  try {
    await $fetch('/api/marina/users', {
      method: 'POST',
      body: newUser.value
    })
    newUser.value = { email: '', password: '', firstName: '', lastName: '', role: 'STAFF' }
    showNewUser.value = false
    await fetchUsers()
  }
  catch (e: any) {
    alert(e.data?.message || 'Fout bij aanmaken')
  }
  finally { saving.value = false }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1000px]">
    <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight mb-5">Beheer</h1>

    <!-- Tabs -->
    <div class="flex gap-1 mb-5">
      <button
        v-for="tab in ([
          { key: 'marina', label: 'Haven' },
          { key: 'users', label: 'Gebruikers' },
          { key: 'piers', label: 'Steigers' }
        ] as const)"
        :key="tab.key"
        class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
        :class="activeTab === tab.key ? 'bg-[#0A1520] text-white' : 'bg-[#F4F7F8] text-[#5A6A78]'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Marina settings -->
    <div v-if="activeTab === 'marina' && marina" class="bg-white border border-black/[0.08] rounded-[14px] p-5">
      <div class="text-sm font-semibold text-[#0A1520] mb-4">Haven instellingen</div>

      <div class="flex flex-col gap-3 max-w-lg">
        <div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Haven naam</label>
          <input v-model="marina.name" type="text" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">GPS Latitude</label>
            <input v-model.number="marina.gpsLat" type="number" step="0.000001" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">GPS Longitude</label>
            <input v-model.number="marina.gpsLng" type="number" step="0.000001" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
          </div>
        </div>

        <div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Email</label>
          <input v-model="marina.settings.email" type="email" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
        </div>

        <div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Adres</label>
          <input v-model="marina.settings.address" type="text" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
        </div>

        <button
          class="px-6 py-2.5 rounded-full bg-primary-500 text-white text-sm font-semibold self-start disabled:opacity-50 mt-2"
          :disabled="saving"
          @click="saveMarina"
        >
          {{ saving ? 'Opslaan...' : 'Opslaan' }}
        </button>
      </div>
    </div>

    <!-- Users management -->
    <div v-if="activeTab === 'users'">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-[#0A1520]">Gebruikers ({{ users.length }})</div>
        <button
          class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
          @click="showNewUser = !showNewUser"
        >
          + Gebruiker
        </button>
      </div>

      <!-- New user form -->
      <div v-if="showNewUser" class="bg-white border border-black/[0.08] rounded-[14px] p-5 mb-4">
        <div class="text-sm font-semibold text-[#0A1520] mb-3">Nieuwe gebruiker</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Voornaam *</label>
            <input v-model="newUser.firstName" type="text" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Achternaam</label>
            <input v-model="newUser.lastName" type="text" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Email *</label>
            <input v-model="newUser.email" type="email" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Wachtwoord *</label>
            <input v-model="newUser.password" type="password" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Rol</label>
            <select v-model="newUser.role" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
              <option value="STAFF">Medewerker</option>
              <option value="HARBORMASTER">Havenmeester</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
        </div>
        <button
          class="px-5 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold mt-3 disabled:opacity-50"
          :disabled="saving"
          @click="createUser"
        >
          Aanmaken
        </button>
      </div>

      <!-- Users list -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
        <div
          v-for="(user, i) in users"
          :key="user.id"
          class="flex items-center gap-3 px-5 py-3.5"
          :class="i < users.length - 1 ? 'border-b border-black/[0.08]' : ''"
        >
          <div class="w-10 h-10 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm font-semibold shrink-0">
            {{ (user.firstName?.[0] || '') + (user.lastName?.[0] || '') }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-[#0A1520]">{{ user.firstName }} {{ user.lastName }}</div>
            <div class="text-xs text-[#5A6A78]">{{ user.email }}</div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F4F7F8] text-[#5A6A78]">
            {{ roleLabels[user.role] }}
          </span>
          <span class="text-[10px] text-[#5A6A78] hidden sm:inline">{{ formatDate(user.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Piers overview -->
    <div v-if="activeTab === 'piers'">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-[#0A1520]">Steigers ({{ piers.length }})</div>
        <NuxtLink to="/dashboard/map" class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold">
          Bewerk op kaart
        </NuxtLink>
      </div>

      <div class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
        <div
          v-for="(pier, i) in piers"
          :key="pier.id"
          class="flex items-center gap-3 px-5 py-3.5"
          :class="i < piers.length - 1 ? 'border-b border-black/[0.08]' : ''"
        >
          <div class="w-10 h-10 rounded-[10px] bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm font-bold shrink-0">
            {{ pier.name }}
          </div>
          <div class="flex-1">
            <div class="text-sm font-semibold text-[#0A1520]">Steiger {{ pier.name }}</div>
            <div class="text-xs text-[#5A6A78]">
              {{ pier.headPoints ? 'T-steiger' : 'Rechte steiger' }}
              · Offset: {{ pier.berthOffset }}m
            </div>
          </div>
          <span
            class="px-2.5 py-1 rounded-full text-[10px] font-semibold"
            :class="pier.points?.length >= 2 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'"
          >
            {{ pier.points?.length >= 2 ? 'Getekend' : 'Niet getekend' }}
          </span>
        </div>
        <div v-if="!piers.length" class="px-5 py-8 text-center text-sm text-[#5A6A78]">
          Geen steigers. Ga naar de kaart om steigers te tekenen.
        </div>
      </div>
    </div>
  </div>
</template>
