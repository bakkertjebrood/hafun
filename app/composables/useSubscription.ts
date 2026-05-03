export function useSubscription() {
  const { data, refresh, status } = useFetch('/api/stripe/subscription', {
    key: 'subscription'
  })

  const isActive = computed(() => data.value?.active ?? false)
  const plan = computed(() => data.value?.plan ?? null)
  const berthCount = computed(() => data.value?.berthCount ?? 0)
  const maxBerths = computed(() => data.value?.maxBerths ?? 0)
  const isAtLimit = computed(() => maxBerths.value > 0 && berthCount.value >= maxBerths.value)

  async function startCheckout(priceId: string) {
    const { data: session } = await useFetch('/api/stripe/checkout', {
      method: 'POST',
      body: { priceId }
    })
    if (session.value?.url) {
      navigateTo(session.value.url, { external: true })
    }
  }

  async function openPortal() {
    const { data: session } = await useFetch('/api/stripe/portal', {
      method: 'POST'
    })
    if (session.value?.url) {
      navigateTo(session.value.url, { external: true })
    }
  }

  return {
    data,
    refresh,
    status,
    isActive,
    plan,
    berthCount,
    maxBerths,
    isAtLimit,
    startCheckout,
    openPortal
  }
}
