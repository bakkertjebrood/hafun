// Shared helper for surfacing $fetch errors in a consistent way across pages.
// Pages create one or more refs via this composable and bind the message to a
// banner in the template. Action handlers wrap their $fetch calls with
// `runAction` (or use `messageFor` directly) to capture failures.

export function useFetchError() {
  const errorMessage = ref('')
  const loadError = ref('')

  function messageFor(e: unknown, fallback: string): string {
    const err = e as { data?: { message?: string }, statusMessage?: string, message?: string }
    return err?.data?.message || err?.statusMessage || err?.message || fallback
  }

  async function runAction<T>(fn: () => Promise<T>, fallback: string): Promise<T | undefined> {
    errorMessage.value = ''
    try {
      return await fn()
    }
    catch (e) {
      errorMessage.value = messageFor(e, fallback)
      return undefined
    }
  }

  return { errorMessage, loadError, messageFor, runAction }
}
