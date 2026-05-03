import { prisma } from '../utils/prisma'

/**
 * For /embed/* and /api/public/* requests:
 *  - look up the marina by slug from the URL,
 *  - set CSP frame-ancestors to its allowedEmbedOrigins,
 *  - set CORS to echo the Origin header iff it's allowed.
 *
 * Default-deny: a marina without configured origins cannot be iframed at all,
 * but deep-links (top-level navigation to /h/[slug]) keep working.
 */
export default defineEventHandler(async (event) => {
  const path = event.path || ''
  const isEmbed = path.startsWith('/embed/')
  const isPublicApi = path.startsWith('/api/public/')
  if (!isEmbed && !isPublicApi) return

  const match = path.match(/^\/(?:embed|api\/public)\/([^/?#]+)/)
  const slug = match?.[1]
  if (!slug) return

  let allowed: string[] = []
  try {
    const marina = await prisma.marina.findUnique({
      where: { slug },
      select: { allowedEmbedOrigins: true }
    })
    allowed = marina?.allowedEmbedOrigins ?? []
  } catch {
    // DB hiccup — be safe, deny embedding.
    allowed = []
  }

  if (isEmbed) {
    const ancestors = allowed.length ? allowed.join(' ') : "'none'"
    setHeader(event, 'Content-Security-Policy', `frame-ancestors ${ancestors}`)
  }

  if (isPublicApi) {
    const origin = getHeader(event, 'origin')
    if (origin && allowed.includes(origin)) {
      setHeader(event, 'Access-Control-Allow-Origin', origin)
      setHeader(event, 'Vary', 'Origin')
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
      if (event.method === 'OPTIONS') {
        event.node.res.statusCode = 204
        event.node.res.end()
      }
    }
  }
})
