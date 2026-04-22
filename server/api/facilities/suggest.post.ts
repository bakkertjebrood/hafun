import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '../../utils/auth'

const ALLOWED_TYPES = [
  'SANITAIR', 'KANTINE', 'PARKEREN', 'HAVENMEESTER', 'TANKSTATION', 'AFVAL',
  'KRAAN', 'WERKPLAATS', 'WINKEL', 'TERRAS', 'SPEELTUIN', 'WATERPUNT',
  'STROOMPUNT', 'WIFI', 'EHBO', 'HELLING', 'TOEGANG', 'OVERIG'
] as const

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const config = useRuntimeConfig()
  if (!config.claudeApiKey) {
    throw createError({ statusCode: 500, message: 'Claude API key niet geconfigureerd' })
  }

  const body = await readBody(event)
  const { imageBase64, bounds, center, zoom, marinaName } = body

  if (!imageBase64) {
    throw createError({ statusCode: 400, message: 'Screenshot is verplicht' })
  }
  if (!bounds || typeof bounds.north !== 'number') {
    throw createError({ statusCode: 400, message: 'bounds zijn verplicht voor GPS-mapping' })
  }

  const client = new Anthropic({ apiKey: config.claudeApiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
          }
        },
        {
          type: 'text',
          text: `Dit is een satellietfoto van een jachthaven${marinaName ? ` (${marinaName})` : ''}.
Het kaartbereik (bounds) in GPS-coördinaten:
- noord: ${bounds.north}
- zuid: ${bounds.south}
- oost:  ${bounds.east}
- west:  ${bounds.west}
Centrum: ${center?.lat}, ${center?.lng} — zoom ${zoom}.

Identificeer voorzieningen/faciliteiten die je op de foto kunt zien. Voor elk gebouw of object:
- type: kies uit [${ALLOWED_TYPES.join(', ')}]
- name: korte Nederlandse naam (bijv. "Toiletgebouw steiger B", "Havenkantoor", "Parkeerterrein noord")
- gpsLat, gpsLng: GPS van het midden van het object (gebruik de bounds hierboven om pixels → GPS te mappen)
- confidence: 0-1, hoe zeker ben je van dit type

Type mapping:
- SANITAIR = sanitair/douches/toiletten (klein rechthoekig gebouw, vaak bij steiger)
- KANTINE = havenrestaurant/café/kantine (groter gebouw, vaak terras ernaast)
- PARKEREN = parkeerterrein (open gebied met auto's zichtbaar)
- HAVENMEESTER = havenkantoor (klein gebouw bij ingang, vaak met vlag)
- TANKSTATION = brandstofsteiger (drijvende pomp in het water)
- KRAAN = bootkraan/botenlift (metalen hijsconstructie aan waterkant)
- HELLING = botenhelling/trailerhelling (schuine strook water in)
- WERKPLAATS = werkloods/bootstalling (groot gebouw, soms met boten ervoor)
- WINKEL = watersportwinkel
- TERRAS = terras/zitplek
- SPEELTUIN = speeltuin
- TOEGANG = hek/toegangspoort
- AFVAL = afvalpunt/containers
- OVERIG = iets anders duidelijks dat relevant is

Antwoord UITSLUITEND in dit JSON-formaat (geen uitleg erbuiten):
{
  "facilities": [
    { "type": "SANITAIR", "name": "...", "gpsLat": 52.xxx, "gpsLng": 5.xxx, "confidence": 0.8 }
  ],
  "notes": "optionele opmerkingen"
}

Als je niets kunt onderscheiden, retourneer een lege facilities-array.`
        }
      ]
    }]
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Geen JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    const facilities = Array.isArray(parsed.facilities) ? parsed.facilities : []
    // Filter invalid types defensively
    const clean = facilities
      .filter((f: any) => ALLOWED_TYPES.includes(f.type))
      .filter((f: any) => typeof f.gpsLat === 'number' && typeof f.gpsLng === 'number')
    return { facilities: clean, notes: parsed.notes || null }
  } catch {
    throw createError({
      statusCode: 500,
      message: 'AI suggestie kon niet geparsed worden. Probeer opnieuw.'
    })
  }
})
