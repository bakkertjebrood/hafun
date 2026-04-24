<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const logs = ref<any[]>([])
const entityFilter = ref('')
const actionFilter = ref('')

async function fetchLogs() {
  loading.value = true
  const q: Record<string, string> = { limit: '200' }
  if (entityFilter.value) q.entity = entityFilter.value
  if (actionFilter.value) q.action = actionFilter.value
  try {
    logs.value = await $fetch('/api/audit', { query: q }) as any[]
  }
  catch (e: any) {
    if (e.statusCode === 403) logs.value = []
  }
  loading.value = false
}

onMounted(fetchLogs)
watch([entityFilter, actionFilter], fetchLogs)

const entities = computed(() => {
  const s = new Set<string>()
  for (const l of logs.value) s.add(l.entity)
  return Array.from(s).sort()
})

const actionColors: Record<string, string> = {
  create: '#10B981', update: '#3B82F6', delete: '#EF4444', login: '#8B5CF6', reminder: '#F59E0B'
}
const actionLabels: Record<string, string> = {
  create: 'Aangemaakt', update: 'Bijgewerkt', delete: 'Verwijderd', login: 'Ingelogd', reminder: 'Herinnering'
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function userLabel(u: any) {
  if (!u) return 'Systeem'
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1200px]">
    <div class="flex items-end justify-between mb-4 lg:mb-6">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Mutatielog</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">Alle wijzigingen in het systeem</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <select v-model="entityFilter" class="px-3 py-1.5 text-xs rounded-full bg-white border border-black/[0.08]">
        <option value="">Alle objecten</option>
        <option v-for="e in entities" :key="e" :value="e">{{ e }}</option>
      </select>
      <select v-model="actionFilter" class="px-3 py-1.5 text-xs rounded-full bg-white border border-black/[0.08]">
        <option value="">Alle acties</option>
        <option value="create">Aangemaakt</option>
        <option value="update">Bijgewerkt</option>
        <option value="delete">Verwijderd</option>
        <option value="reminder">Herinnering</option>
      </select>
    </div>

    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>
    <div v-else-if="!logs.length" class="bg-white border border-black/[0.08] rounded-[14px] p-8 text-center text-sm text-[#5A6A78]">
      Geen log entries (of geen toegang — alleen beheerders en havenmeesters zien de mutatielog)
    </div>
    <div v-else class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div
        v-for="(l, i) in logs"
        :key="l.id"
        class="px-5 py-3 flex items-center gap-4"
        :class="i < logs.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <div class="font-mono text-[11px] text-[#5A6A78] w-36 shrink-0">{{ formatDateTime(l.createdAt) }}</div>
        <span
          class="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold shrink-0"
          :style="{ background: (actionColors[l.action] || '#5A6A78') + '15', color: actionColors[l.action] || '#5A6A78' }"
        >
          {{ actionLabels[l.action] || l.action }}
        </span>
        <div class="text-xs text-[#0A1520] w-32 shrink-0 font-semibold">{{ l.entity }}</div>
        <div class="text-[11px] text-[#5A6A78] flex-1 truncate font-mono">{{ l.entityId || '—' }}</div>
        <div class="text-xs text-[#5A6A78] shrink-0">{{ userLabel(l.user) }}</div>
      </div>
    </div>
  </div>
</template>
