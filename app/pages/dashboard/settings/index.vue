<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { user: authUser } = useAuthUser()
const canManageUsers = computed(() => authUser.value?.role === 'ADMIN' || authUser.value?.role === 'HARBORMASTER')

const loading = ref(true)
const marina = ref<any>(null)
const users = ref<any[]>([])
const piers = ref<any[]>([])
const tariffs = ref<any[]>([])
const accountingConfig = ref<any>(null)
const activeTab = ref<'marina' | 'users' | 'piers' | 'tariffs' | 'integrations'>('marina')
const saving = ref(false)
const marinaId = ref('')

// New user form
const showNewUser = ref(false)
const newUser = ref({ email: '', password: '', firstName: '', lastName: '', role: 'STAFF' })

// Edit user form
const editingUserId = ref<string | null>(null)
const editUser = ref({ email: '', password: '', firstName: '', lastName: '', role: 'STAFF' })

// New tariff form
const showNewTariff = ref(false)
const newTariff = ref({ name: '', type: 'YEAR', pricePerMeter: 0, vatRate: 21, touristTax: 0 })

// Edit tariff form
const editingTariffId = ref<string | null>(null)
const editTariff = ref({ name: '', type: 'YEAR', pricePerMeter: 0, vatRate: 21, touristTax: 0, active: true })

const tariffTypeLabels: Record<string, string> = {
  YEAR: 'Jaarplaats',
  SUMMER: 'Seizoenplaats',
  WINTER: 'Winterstalling',
  GUEST: 'Gastligplaats',
  PASSANT: 'Passant per nacht'
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  HARBORMASTER: 'Havenmeester',
  STAFF: 'Medewerker',
  PORTAL: 'Huurder (portaal)'
}

onMounted(async () => {
  const discovered = await $fetch('/api/berths/discover') as any
  marinaId.value = discovered.marinaId
  await Promise.all([fetchMarina(), fetchUsers(), fetchPiers(), fetchTariffs(), fetchAccounting()])
  loading.value = false
})

async function fetchMarina() {
  const data = await $fetch('/api/marina/me') as any
  if (!data.settings) data.settings = { email: '', address: '' }
  marina.value = data
}

async function fetchUsers() {
  users.value = await $fetch('/api/marina/users') as any[]
}

async function fetchPiers() {
  piers.value = await $fetch('/api/piers', { query: { marinaId: marinaId.value } }) as any[]
}

async function fetchTariffs() {
  tariffs.value = await $fetch('/api/tariffs') as any[]
}

async function createTariff() {
  if (!newTariff.value.name || !newTariff.value.pricePerMeter) return
  saving.value = true
  try {
    await $fetch('/api/tariffs', { method: 'POST', body: newTariff.value })
    newTariff.value = { name: '', type: 'YEAR', pricePerMeter: 0, vatRate: 21, touristTax: 0 }
    showNewTariff.value = false
    await fetchTariffs()
  } catch (e: any) {
    alert(e.data?.message || 'Fout')
  } finally { saving.value = false }
}

async function deleteTariff(id: string) {
  if (!confirm('Tarief verwijderen?')) return
  try {
    await $fetch(`/api/tariffs/${id}`, { method: 'DELETE' })
    await fetchTariffs()
  } catch (e: any) { alert(e.data?.message || 'Fout bij verwijderen') }
}

function startEditTariff(tariff: any) {
  editingTariffId.value = tariff.id
  editTariff.value = {
    name: tariff.name,
    type: tariff.type,
    pricePerMeter: tariff.pricePerMeter,
    vatRate: tariff.vatRate,
    touristTax: tariff.touristTax ?? 0,
    active: tariff.active
  }
}

function cancelEditTariff() {
  editingTariffId.value = null
}

async function saveEditTariff() {
  if (!editingTariffId.value) return
  saving.value = true
  try {
    await $fetch(`/api/tariffs/${editingTariffId.value}`, {
      method: 'PUT',
      body: editTariff.value
    })
    editingTariffId.value = null
    await fetchTariffs()
  } catch (e: any) {
    alert(e.data?.message || 'Fout bij opslaan')
  } finally { saving.value = false }
}

// Accounting integration
const accountingForm = ref({ provider: 'moneybird', apiToken: '', administrationId: '' })
const accountingSaving = ref(false)
const accountingTestResult = ref<string | null>(null)

async function fetchAccounting() {
  accountingConfig.value = await $fetch('/api/accounting/config')
  if (accountingConfig.value?.integration) {
    accountingForm.value.provider = accountingConfig.value.integration.provider
    accountingForm.value.administrationId = accountingConfig.value.integration.administrationId || ''
  }
}

async function saveAccounting() {
  if (!accountingForm.value.apiToken || !accountingForm.value.administrationId) return
  accountingSaving.value = true
  accountingTestResult.value = null
  try {
    await $fetch('/api/accounting/config', {
      method: 'POST',
      body: accountingForm.value
    })
    accountingTestResult.value = 'Verbinding geslaagd!'
    accountingForm.value.apiToken = ''
    await fetchAccounting()
  } catch (e: any) {
    accountingTestResult.value = e.data?.message || 'Verbinding mislukt'
  } finally { accountingSaving.value = false }
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
  } finally { saving.value = false }
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
  } catch (e: any) {
    alert(e.data?.message || 'Fout bij aanmaken')
  } finally { saving.value = false }
}

function startEditUser(user: any) {
  editingUserId.value = user.id
  editUser.value = {
    email: user.email,
    password: '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    role: user.role
  }
}

function cancelEditUser() {
  editingUserId.value = null
}

async function saveEditUser() {
  if (!editingUserId.value) return
  saving.value = true
  try {
    const body: Record<string, unknown> = {
      email: editUser.value.email,
      firstName: editUser.value.firstName,
      lastName: editUser.value.lastName,
      role: editUser.value.role
    }
    if (editUser.value.password) body.password = editUser.value.password
    await $fetch(`/api/marina/users/${editingUserId.value}`, { method: 'PUT', body })
    editingUserId.value = null
    await fetchUsers()
  } catch (e: any) {
    alert(e.data?.message || 'Fout bij opslaan')
  } finally { saving.value = false }
}

async function deleteUser(id: string) {
  if (!confirm('Gebruiker verwijderen? Deze actie kan niet ongedaan gemaakt worden.')) return
  try {
    await $fetch(`/api/marina/users/${id}`, { method: 'DELETE' })
    await fetchUsers()
  } catch (e: any) { alert(e.data?.message || 'Fout bij verwijderen') }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1000px]">
    <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight mb-5">
      Beheer
    </h1>

    <!-- Tabs -->
    <div class="flex gap-1 mb-5">
      <button
        v-for="tab in ([
          { key: 'marina', label: 'Haven' },
          { key: 'users', label: 'Gebruikers' },
          { key: 'piers', label: 'Steigers' },
          { key: 'tariffs', label: 'Tarieven' },
          { key: 'integrations', label: 'Koppelingen' }
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
    <div
      v-if="activeTab === 'marina' && marina"
      class="bg-white border border-black/[0.08] rounded-[14px] p-5"
    >
      <div class="text-sm font-semibold text-[#0A1520] mb-4">
        Haven instellingen
      </div>

      <div class="flex flex-col gap-3 max-w-lg">
        <div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Haven naam</label>
          <input
            v-model="marina.name"
            type="text"
            class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500"
          >
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">GPS Latitude</label>
            <input
              v-model.number="marina.gpsLat"
              type="number"
              step="0.000001"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500"
            >
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">GPS Longitude</label>
            <input
              v-model.number="marina.gpsLng"
              type="number"
              step="0.000001"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500"
            >
          </div>
        </div>

        <div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Email</label>
          <input
            v-model="marina.settings.email"
            type="email"
            class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500"
          >
        </div>

        <div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Adres</label>
          <input
            v-model="marina.settings.address"
            type="text"
            class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500"
          >
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
        <div class="text-sm font-semibold text-[#0A1520]">
          Gebruikers ({{ users.length }})
        </div>
        <button
          v-if="canManageUsers"
          class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
          @click="showNewUser = !showNewUser"
        >
          + Gebruiker
        </button>
      </div>

      <!-- New user form -->
      <div
        v-if="showNewUser"
        class="bg-white border border-black/[0.08] rounded-[14px] p-5 mb-4"
      >
        <div class="text-sm font-semibold text-[#0A1520] mb-3">
          Nieuwe gebruiker
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Voornaam *</label>
            <input
              v-model="newUser.firstName"
              type="text"
              class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Achternaam</label>
            <input
              v-model="newUser.lastName"
              type="text"
              class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Email *</label>
            <input
              v-model="newUser.email"
              type="email"
              class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Wachtwoord *</label>
            <input
              v-model="newUser.password"
              type="password"
              class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Rol</label>
            <select
              v-model="newUser.role"
              class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
              <option value="STAFF">
                Medewerker
              </option>
              <option value="HARBORMASTER">
                Havenmeester
              </option>
              <option value="ADMIN">
                Administrator
              </option>
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
        <template
          v-for="(user, i) in users"
          :key="user.id"
        >
          <div
            v-if="editingUserId !== user.id"
            class="flex items-center gap-3 px-5 py-3.5"
            :class="i < users.length - 1 ? 'border-b border-black/[0.08]' : ''"
          >
            <div class="w-10 h-10 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm font-semibold shrink-0">
              {{ (user.firstName?.[0] || '') + (user.lastName?.[0] || '') }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-[#0A1520]">
                {{ user.firstName }} {{ user.lastName }}
              </div>
              <div class="text-xs text-[#5A6A78]">
                {{ user.email }}
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F4F7F8] text-[#5A6A78]">
              {{ roleLabels[user.role] }}
            </span>
            <span class="text-[10px] text-[#5A6A78] hidden sm:inline">{{ formatDate(user.createdAt) }}</span>
            <button
              v-if="canManageUsers"
              class="text-xs text-[#5A6A78] hover:text-[#0A1520]"
              @click="startEditUser(user)"
            >
              Bewerk
            </button>
            <button
              v-if="canManageUsers && user.id !== authUser?.id"
              class="text-xs text-red-400 hover:text-red-600"
              @click="deleteUser(user.id)"
            >
              Verwijder
            </button>
          </div>

          <!-- Inline edit form -->
          <div
            v-else
            class="px-5 py-4 bg-[#F9FBFC]"
            :class="i < users.length - 1 ? 'border-b border-black/[0.08]' : ''"
          >
            <div class="text-sm font-semibold text-[#0A1520] mb-3">
              Gebruiker bewerken
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Voornaam</label>
                <input
                  v-model="editUser.firstName"
                  type="text"
                  class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Achternaam</label>
                <input
                  v-model="editUser.lastName"
                  type="text"
                  class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Email</label>
                <input
                  v-model="editUser.email"
                  type="email"
                  class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Nieuw wachtwoord (optioneel)</label>
                <input
                  v-model="editUser.password"
                  type="password"
                  placeholder="Laat leeg om niet te wijzigen"
                  class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Rol</label>
                <select
                  v-model="editUser.role"
                  class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
                  <option value="STAFF">
                    Medewerker
                  </option>
                  <option value="HARBORMASTER">
                    Havenmeester
                  </option>
                  <option value="ADMIN">
                    Administrator
                  </option>
                </select>
              </div>
            </div>
            <div class="flex gap-2 mt-3">
              <button
                class="px-5 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
                :disabled="saving"
                @click="saveEditUser"
              >
                Opslaan
              </button>
              <button
                class="px-5 py-2 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-sm font-semibold"
                @click="cancelEditUser"
              >
                Annuleer
              </button>
            </div>
          </div>
        </template>
        <div
          v-if="!users.length"
          class="px-5 py-8 text-center text-sm text-[#5A6A78]"
        >
          Nog geen gebruikers.
        </div>
      </div>
    </div>

    <!-- Piers overview -->
    <div v-if="activeTab === 'piers'">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-[#0A1520]">
          Steigers ({{ piers.length }})
        </div>
        <NuxtLink
          to="/dashboard/map"
          class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
        >
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
            <div class="text-sm font-semibold text-[#0A1520]">
              Steiger {{ pier.name }}
            </div>
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
        <div
          v-if="!piers.length"
          class="px-5 py-8 text-center text-sm text-[#5A6A78]"
        >
          Geen steigers. Ga naar de kaart om steigers te tekenen.
        </div>
      </div>
    </div>

    <!-- Tariffs management -->
    <div v-if="activeTab === 'tariffs'">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-[#0A1520]">
          Tarieven ({{ tariffs.length }})
        </div>
        <button
          class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
          @click="showNewTariff = !showNewTariff"
        >
          + Tarief
        </button>
      </div>

      <!-- New tariff form -->
      <div
        v-if="showNewTariff"
        class="bg-white border border-black/[0.08] rounded-[14px] p-5 mb-4"
      >
        <div class="text-sm font-semibold text-[#0A1520] mb-3">
          Nieuw tarief
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Naam *</label>
            <input
              v-model="newTariff.name"
              type="text"
              placeholder="bijv. Jaarplaats"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Type *</label>
            <select
              v-model="newTariff.type"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
              <option
                v-for="(label, key) in tariffTypeLabels"
                :key="key"
                :value="key"
              >
                {{ label }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Prijs per meter (€) *</label>
            <input
              v-model.number="newTariff.pricePerMeter"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">BTW %</label>
            <select
              v-model.number="newTariff.vatRate"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
              <option :value="21">
                21%
              </option>
              <option :value="9">
                9%
              </option>
              <option :value="0">
                0%
              </option>
            </select>
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Toeristenbelasting (€/pers/nacht)</label>
            <input
              v-model.number="newTariff.touristTax"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
          </div>
        </div>
        <button
          class="px-5 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold mt-3 disabled:opacity-50"
          :disabled="saving"
          @click="createTariff"
        >
          Aanmaken
        </button>
      </div>

      <!-- Tariffs list -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
        <template
          v-for="(tariff, i) in tariffs"
          :key="tariff.id"
        >
          <div
            v-if="editingTariffId !== tariff.id"
            class="flex items-center gap-3 px-5 py-3.5"
            :class="i < tariffs.length - 1 ? 'border-b border-black/[0.08]' : ''"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-[#0A1520]">
                {{ tariff.name }}
              </div>
              <div class="text-xs text-[#5A6A78]">
                {{ tariffTypeLabels[tariff.type] || tariff.type }}
                · €{{ tariff.pricePerMeter.toFixed(2) }}/m
                · {{ tariff.vatRate }}% BTW
                <span v-if="tariff.touristTax > 0"> · €{{ tariff.touristTax.toFixed(2) }} toeristenbelasting</span>
              </div>
            </div>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              :class="tariff.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[#F4F7F8] text-[#5A6A78]'"
            >
              {{ tariff.active ? 'Actief' : 'Inactief' }}
            </span>
            <button
              class="text-xs text-[#5A6A78] hover:text-[#0A1520]"
              @click="startEditTariff(tariff)"
            >
              Bewerk
            </button>
            <button
              class="text-xs text-red-400 hover:text-red-600"
              @click="deleteTariff(tariff.id)"
            >
              Verwijder
            </button>
          </div>

          <!-- Inline edit form -->
          <div
            v-else
            class="px-5 py-4 bg-[#F9FBFC]"
            :class="i < tariffs.length - 1 ? 'border-b border-black/[0.08]' : ''"
          >
            <div class="text-sm font-semibold text-[#0A1520] mb-3">
              Tarief bewerken
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Naam</label>
                <input
                  v-model="editTariff.name"
                  type="text"
                  class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Type</label>
                <select
                  v-model="editTariff.type"
                  class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
                  <option
                    v-for="(label, key) in tariffTypeLabels"
                    :key="key"
                    :value="key"
                  >
                    {{ label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Prijs per meter (€)</label>
                <input
                  v-model.number="editTariff.pricePerMeter"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">BTW %</label>
                <select
                  v-model.number="editTariff.vatRate"
                  class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
                  <option :value="21">
                    21%
                  </option>
                  <option :value="9">
                    9%
                  </option>
                  <option :value="0">
                    0%
                  </option>
                </select>
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Toeristenbelasting (€/pers/nacht)</label>
                <input
                  v-model.number="editTariff.touristTax"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-white"
                >
              </div>
              <div class="flex items-end">
                <label class="flex items-center gap-2 text-sm text-[#0A1520]">
                  <input
                    v-model="editTariff.active"
                    type="checkbox"
                    class="size-4"
                  >
                  Actief
                </label>
              </div>
            </div>
            <div class="flex gap-2 mt-3">
              <button
                class="px-5 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
                :disabled="saving"
                @click="saveEditTariff"
              >
                Opslaan
              </button>
              <button
                class="px-5 py-2 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-sm font-semibold"
                @click="cancelEditTariff"
              >
                Annuleer
              </button>
            </div>
          </div>
        </template>
        <div
          v-if="!tariffs.length"
          class="px-5 py-8 text-center text-sm text-[#5A6A78]"
        >
          Nog geen tarieven. Voeg er een toe om automatisch facturen te berekenen.
        </div>
      </div>
    </div>

    <!-- Integrations -->
    <div v-if="activeTab === 'integrations'">
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="text-sm font-semibold text-[#0A1520] mb-1">
          Boekhouding koppeling
        </div>
        <div class="text-xs text-[#5A6A78] mb-5">
          Koppel je boekhoudsoftware om facturen direct te versturen.
        </div>

        <!-- Current status -->
        <div
          v-if="accountingConfig?.hasToken"
          class="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-[10px] mb-5"
        >
          <div class="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <UIcon
              name="i-lucide-check"
              class="size-4"
            />
          </div>
          <div>
            <div class="text-sm font-semibold text-emerald-800 capitalize">
              {{ accountingConfig.integration?.provider }} verbonden
            </div>
            <div class="text-xs text-emerald-600">
              Facturen worden naar je boekhouding gestuurd
            </div>
          </div>
        </div>

        <!-- Config form -->
        <div class="flex flex-col gap-3 max-w-lg">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Provider</label>
            <select
              v-model="accountingForm.provider"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
              <option value="moneybird">
                Moneybird
              </option>
              <option
                value="exact"
                disabled
              >
                Exact Online (binnenkort)
              </option>
              <option
                value="visma"
                disabled
              >
                Visma eAccounting (binnenkort)
              </option>
            </select>
          </div>

          <div v-if="accountingForm.provider === 'moneybird'">
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">
              API Token
              <a
                href="https://moneybird.com/user/applications/new"
                target="_blank"
                class="text-primary-500 normal-case tracking-normal"
              >(ophalen)</a>
            </label>
            <input
              v-model="accountingForm.apiToken"
              type="password"
              placeholder="Plak je Moneybird API token"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
          </div>

          <div v-if="accountingForm.provider === 'moneybird'">
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">
              Administratie ID
              <span class="text-[#5A6A78]/60 normal-case tracking-normal">(staat in je Moneybird URL)</span>
            </label>
            <input
              v-model="accountingForm.administrationId"
              type="text"
              placeholder="123456789"
              class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]"
            >
          </div>

          <!-- Result message -->
          <div
            v-if="accountingTestResult"
            class="text-sm font-medium"
            :class="accountingTestResult.includes('geslaagd') ? 'text-emerald-500' : 'text-red-500'"
          >
            {{ accountingTestResult }}
          </div>

          <button
            class="px-6 py-2.5 rounded-full bg-primary-500 text-white text-sm font-semibold self-start disabled:opacity-50"
            :disabled="accountingSaving || !accountingForm.apiToken"
            @click="saveAccounting"
          >
            {{ accountingSaving ? 'Verbinden...' : 'Test & verbind' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
