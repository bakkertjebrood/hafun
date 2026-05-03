<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const tab = ref<'cashier' | 'products' | 'transactions'>('cashier')
const loading = ref(true)
const products = ref<any[]>([])
const transactions = ref<any[]>([])
const cart = ref<Array<{ productId: string; name: string; quantity: number; unitPrice: number; vatRate: number }>>([])
const method = ref<'cash' | 'pin' | 'creditcard' | 'invoice' | 'online'>('pin')
const saving = ref(false)
const { errorMessage, loadError, messageFor } = useFetchError()

// Nieuw product
const showNewProduct = ref(false)
const newProduct = ref({ name: '', category: '', price: 0, vatRate: 21, stock: null as number | null, barcode: '' })

async function fetchProducts() {
  products.value = await $fetch('/api/pos/products') as any[]
}
async function fetchTransactions() {
  transactions.value = await $fetch('/api/pos/transactions') as any[]
}

async function load() {
  loading.value = true
  loadError.value = ''
  const results = await Promise.allSettled([fetchProducts(), fetchTransactions()])
  const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
  if (failed) loadError.value = messageFor(failed.reason, 'Kon kassa niet laden')
  loading.value = false
}

onMounted(load)

const categories = computed(() => {
  const s = new Set<string>()
  for (const p of products.value) if (p.category) s.add(p.category)
  return Array.from(s)
})

function addToCart(p: any) {
  const existing = cart.value.find(l => l.productId === p.id)
  if (existing) existing.quantity++
  else cart.value.push({ productId: p.id, name: p.name, quantity: 1, unitPrice: p.price, vatRate: p.vatRate })
}
function removeLine(i: number) {
  cart.value.splice(i, 1)
}
function clearCart() {
  cart.value = []
}

const cartTotal = computed(() => cart.value.reduce((s, l) => s + l.quantity * l.unitPrice * (1 + l.vatRate / 100), 0))
const cartSubtotal = computed(() => cart.value.reduce((s, l) => s + l.quantity * l.unitPrice, 0))
const cartVat = computed(() => cartTotal.value - cartSubtotal.value)

async function checkout() {
  if (!cart.value.length) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/pos/transactions', { method: 'POST', body: { lines: cart.value, method: method.value } })
    clearCart()
    await Promise.all([fetchProducts(), fetchTransactions()])
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Afrekenen mislukt')
  }
  finally {
    saving.value = false
  }
}

async function createProduct() {
  if (!newProduct.value.name || !newProduct.value.price) return
  errorMessage.value = ''
  try {
    await $fetch('/api/pos/products', { method: 'POST', body: newProduct.value })
    newProduct.value = { name: '', category: '', price: 0, vatRate: 21, stock: null, barcode: '' }
    showNewProduct.value = false
    await fetchProducts()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Product aanmaken mislukt')
  }
}

async function removeProduct(id: string) {
  if (!confirm('Product deactiveren?')) return
  errorMessage.value = ''
  try {
    await $fetch(`/api/pos/products/${id}`, { method: 'DELETE' })
    await fetchProducts()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Verwijderen mislukt')
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const methodLabels: Record<string, string> = {
  cash: 'Contant', pin: 'PIN', creditcard: 'Creditcard', invoice: 'Op factuur', online: 'Online'
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1400px]">
    <div class="flex items-end justify-between mb-4 lg:mb-6">
      <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Kassa</h1>
      <div class="flex rounded-full bg-white border border-black/[0.08] overflow-hidden">
        <button class="px-4 py-1.5 text-xs font-medium" :class="tab === 'cashier' ? 'bg-primary-500 text-white' : 'text-[#5A6A78]'" @click="tab = 'cashier'">Verkoop</button>
        <button class="px-4 py-1.5 text-xs font-medium" :class="tab === 'products' ? 'bg-primary-500 text-white' : 'text-[#5A6A78]'" @click="tab = 'products'">Producten</button>
        <button class="px-4 py-1.5 text-xs font-medium" :class="tab === 'transactions' ? 'bg-primary-500 text-white' : 'text-[#5A6A78]'" @click="tab = 'transactions'">Transacties</button>
      </div>
    </div>

    <div v-if="loadError" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ loadError }}</div>
      <button class="text-xs text-red-700 font-semibold underline" @click="load()">Opnieuw laden</button>
    </div>
    <div v-if="errorMessage" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ errorMessage }}</div>
      <button class="text-xs text-red-700 underline" @click="errorMessage = ''">Sluiten</button>
    </div>

    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>

    <!-- Cashier -->
    <div v-else-if="tab === 'cashier'" class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      <div>
        <div v-if="!products.length" class="bg-white border border-black/[0.08] rounded-[14px] p-8 text-center text-sm text-[#5A6A78]">
          Nog geen producten — ga naar tab "Producten" om er toe te voegen
        </div>
        <template v-else>
          <div v-for="cat in categories.length ? categories : ['']" :key="cat || 'all'" class="mb-4">
            <div v-if="cat" class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">{{ cat }}</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                v-for="p in products.filter(x => (cat ? x.category === cat : !x.category))"
                :key="p.id"
                class="bg-white border border-black/[0.08] rounded-[10px] p-3 text-left hover:border-primary-500 transition-colors"
                @click="addToCart(p)"
              >
                <div class="text-sm font-semibold text-[#0A1520] truncate">{{ p.name }}</div>
                <div class="text-xs text-primary-500 mt-0.5">{{ formatCurrency(p.price * (1 + p.vatRate / 100)) }}</div>
                <div v-if="p.stock !== null && p.stock !== undefined" class="text-[10px] text-[#5A6A78]">Voorraad {{ p.stock }}</div>
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Cart -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5 flex flex-col h-fit sticky top-4">
        <div class="text-sm font-semibold text-[#0A1520] mb-3">Winkelmandje</div>
        <div v-if="!cart.length" class="text-center text-xs text-[#5A6A78] py-6">Klik op producten om toe te voegen</div>
        <div v-else class="flex-1 mb-3 max-h-[300px] overflow-y-auto">
          <div v-for="(l, i) in cart" :key="i" class="flex items-center gap-2 py-2 border-b border-black/[0.06] last:border-b-0">
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-[#0A1520] truncate">{{ l.name }}</div>
              <div class="text-[11px] text-[#5A6A78]">{{ formatCurrency(l.unitPrice) }} · {{ l.vatRate }}% btw</div>
            </div>
            <input v-model.number="l.quantity" type="number" min="1" step="1" class="w-14 text-xs px-2 py-1 rounded border border-black/[0.1]">
            <button class="text-red-500 text-xs" @click="removeLine(i)">×</button>
          </div>
        </div>
        <div class="text-xs text-[#5A6A78] flex justify-between">
          <span>Subtotaal</span>
          <span>{{ formatCurrency(cartSubtotal) }}</span>
        </div>
        <div class="text-xs text-[#5A6A78] flex justify-between">
          <span>BTW</span>
          <span>{{ formatCurrency(cartVat) }}</span>
        </div>
        <div class="text-base font-semibold text-[#0A1520] flex justify-between mt-2 pt-2 border-t border-black/[0.08]">
          <span>Totaal</span>
          <span>{{ formatCurrency(cartTotal) }}</span>
        </div>
        <div class="mt-3">
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Betaalmethode</label>
          <select v-model="method" class="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
            <option v-for="(label, key) in methodLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <UButton color="primary" class="mt-3 rounded-full" block :loading="saving" :disabled="!cart.length" @click="checkout">
          Afrekenen
        </UButton>
      </div>
    </div>

    <!-- Products -->
    <div v-else-if="tab === 'products'">
      <div class="flex justify-end mb-3">
        <UButton color="primary" class="rounded-full" size="sm" @click="showNewProduct = !showNewProduct">+ Nieuw product</UButton>
      </div>

      <div v-if="showNewProduct" class="bg-white border border-primary-500/30 rounded-[14px] p-5 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input v-model="newProduct.name" placeholder="Naam" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <input v-model="newProduct.category" placeholder="Categorie" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <input v-model.number="newProduct.price" type="number" step="0.01" placeholder="Prijs excl. btw" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <input v-model.number="newProduct.vatRate" type="number" placeholder="BTW %" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <input v-model.number="newProduct.stock" type="number" placeholder="Voorraad (optioneel)" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <input v-model="newProduct.barcode" placeholder="Barcode" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        </div>
        <div class="flex gap-2 mt-3 justify-end">
          <UButton color="neutral" variant="outline" size="sm" @click="showNewProduct = false">Annuleren</UButton>
          <UButton color="primary" size="sm" @click="createProduct">Opslaan</UButton>
        </div>
      </div>

      <div class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
        <div
          v-for="(p, i) in products"
          :key="p.id"
          class="px-5 py-3 flex items-center gap-4"
          :class="i < products.length - 1 ? 'border-b border-black/[0.08]' : ''"
        >
          <div class="flex-1">
            <div class="text-sm font-semibold text-[#0A1520]">{{ p.name }}</div>
            <div class="text-xs text-[#5A6A78]">{{ p.category || '—' }} · {{ formatCurrency(p.price) }} excl. btw · {{ p.vatRate }}%</div>
          </div>
          <div v-if="p.stock !== null" class="text-xs text-[#5A6A78]">Voorraad {{ p.stock }}</div>
          <button class="text-xs text-red-500 hover:text-red-600 p-1.5 rounded hover:bg-red-500/5" @click="removeProduct(p.id)">
            <UIcon name="i-lucide-trash-2" class="size-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Transactions -->
    <div v-else-if="tab === 'transactions'" class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div v-if="!transactions.length" class="p-8 text-center text-sm text-[#5A6A78]">Nog geen transacties</div>
      <div
        v-for="(t, i) in transactions"
        :key="t.id"
        class="px-5 py-3 flex items-center gap-4"
        :class="i < transactions.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <div class="font-mono text-[11px] text-[#5A6A78] shrink-0">{{ formatDateTime(t.createdAt) }}</div>
        <div class="flex-1 text-xs text-[#5A6A78]">
          {{ Array.isArray(t.lines) ? t.lines.length : 0 }} regel{{ (Array.isArray(t.lines) ? t.lines.length : 0) > 1 ? 's' : '' }}
        </div>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 font-semibold shrink-0">{{ methodLabels[t.method] }}</span>
        <div class="text-sm font-semibold text-[#0A1520] shrink-0">{{ formatCurrency(t.total) }}</div>
      </div>
    </div>
  </div>
</template>
