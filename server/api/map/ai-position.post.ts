import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const marinaId = body.marinaId

  if (!marinaId) {
    throw createError({ statusCode: 400, message: 'marinaId is verplicht' })
  }

  if (!config.claudeApiKey) {
    throw createError({ statusCode: 500, message: 'Claude API key niet geconfigureerd' })
  }

  const marina = await prisma.marina.findUnique({ where: { id: marinaId } })
  if (!marina) {
    throw createError({ statusCode: 404, message: 'Haven niet gevonden' })
  }

  const berths = await prisma.berth.findMany({
    where: { marinaId },
    orderBy: [{ pier: 'asc' }, { code: 'asc' }]
  })

  // Group berths by pier
  const pierGroups: Record<string, typeof berths> = {}
  for (const b of berths) {
    if (!pierGroups[b.pier]) pierGroups[b.pier] = []
    pierGroups[b.pier].push(b)
  }

  const pierSummary = Object.entries(pierGroups)
    .map(([pier, bs]) => `Steiger ${pier}: ${bs.length} ligplaatsen (${bs[0].code} t/m ${bs[bs.length - 1].code})`)
    .join('\n')

  const client = new Anthropic({ apiKey: config.claudeApiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Je bent een expert in jachthaven-indelingen in Nederland. Ik heb een jachthaven met het volgende:

Naam: ${marina.name}
GPS centrum: ${marina.gpsLat}, ${marina.gpsLng}
Locatie: Ketelhaven, aan het Vossemeer/Ketelmeer

De haven heeft de volgende steigers en ligplaatsen:
${pierSummary}

De haven is Jachthaven Lands End in Ketelhaven. De steigers lopen ongeveer noord-zuid (perpendiculair op de Vossemeerdijk), van oost naar west: A, B, C, D, E.

Geef me voor elke steiger de GPS-coordinaten van het begin (noord/waterzijde) en eind (zuid/walzijde) van de steiger. De ligplaatsen worden dan gelijkmatig verdeeld langs deze lijn.

De haven ligt op GPS ~52.5804, 5.7597. De steigers liggen in het watergebied ten noorden van de Vossemeerdijk.

Op basis van typische havenindelingen en de bekende locatie van Jachthaven Lands End, geef me realistische coordinaten.

Antwoord ALLEEN in dit JSON formaat, niets anders:
{
  "piers": {
    "A": { "startLat": 52.xxx, "startLng": 5.xxx, "endLat": 52.xxx, "endLng": 5.xxx },
    "B": { "startLat": 52.xxx, "startLng": 5.xxx, "endLat": 52.xxx, "endLng": 5.xxx },
    ...
  }
}`
    }]
  })

  // Parse Claude's response
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  let pierCoords: Record<string, { startLat: number; startLng: number; endLat: number; endLng: number }>

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    pierCoords = parsed.piers
  }
  catch (e) {
    throw createError({ statusCode: 500, message: 'Claude response kon niet geparsed worden: ' + text.slice(0, 200) })
  }

  // Position berths along each pier
  let positioned = 0
  for (const [pier, bs] of Object.entries(pierGroups)) {
    const coords = pierCoords[pier]
    if (!coords) continue

    for (let i = 0; i < bs.length; i++) {
      const t = bs.length > 1 ? i / (bs.length - 1) : 0.5
      const lat = coords.startLat + (coords.endLat - coords.startLat) * t
      const lng = coords.startLng + (coords.endLng - coords.startLng) * t

      await prisma.berth.update({
        where: { id: bs[i].id },
        data: { gpsLat: lat, gpsLng: lng }
      })
      positioned++
    }
  }

  return { positioned, piers: Object.keys(pierCoords) }
})
