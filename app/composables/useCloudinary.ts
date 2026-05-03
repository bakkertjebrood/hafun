/**
 * Bouwt Cloudinary delivery-URLs voor opgeslagen publicIds.
 * Transformaties (size, gravity, formaat, kwaliteit) worden via path-segments
 * meegegeven zodat een afbeelding voor avatar én voor hero zonder extra
 * server-call gerenderd kan worden.
 */
export function useCloudinary() {
  const config = useRuntimeConfig()
  const cloudName = config.public.cloudinaryCloudName as string

  function buildUrl(publicId: string, transformations: string[] = []): string {
    if (!publicId || !cloudName) return ''
    if (publicId.startsWith('http')) return publicId
    const tx = transformations.length ? transformations.join(',') + '/' : ''
    return `https://res.cloudinary.com/${cloudName}/image/upload/${tx}${publicId}`
  }

  function avatar(publicId: string | null | undefined, size = 96): string {
    if (!publicId) return ''
    return buildUrl(publicId, [
      `w_${size}`,
      `h_${size}`,
      'c_fill',
      'g_auto',
      'q_auto',
      'f_auto'
    ])
  }

  function hero(publicId: string | null | undefined, width = 800): string {
    if (!publicId) return ''
    return buildUrl(publicId, [
      `w_${width}`,
      'c_fill',
      'ar_4:3',
      'g_auto',
      'q_auto',
      'f_auto'
    ])
  }

  return {
    cloudName,
    isConfigured: !!cloudName,
    buildUrl,
    avatar,
    hero
  }
}
