import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const config = useRuntimeConfig()
  if (!config.claudeApiKey) {
    throw createError({ statusCode: 500, message: 'Claude API key niet geconfigureerd' })
  }

  const body = await readBody(event)
  const { imageBase64, polygon, center, zoom, marinaName } = body

  if (!imageBase64) {
    throw createError({ statusCode: 400, message: 'Screenshot is verplicht' })
  }

  const client = new Anthropic({ apiKey: config.claudeApiKey })

  const polygonInfo = polygon
    ? `De gebruiker heeft het volgende gebied omcirkeld (polygon GPS coördinaten): ${JSON.stringify(polygon)}`
    : ''

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
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
          text: `Analyseer deze satellietfoto van een jachthaven${marinaName ? ` (${marinaName})` : ''}.
${polygonInfo}
Het kaartcentrum is ongeveer op GPS ${center?.lat || 'onbekend'}, ${center?.lng || 'onbekend'}, zoomniveau ${zoom || 'onbekend'}.

Identificeer alle steigers (piers) die je ziet in de haven. Voor elke steiger:
1. Geef een letter-naam (A, B, C, D, E, etc.) — begin bij de meest rechtse/oostelijke steiger
2. Schat het aantal ligplaatsen aan elke kant (links en rechts van de steiger)
3. Bepaal of het een T-steiger is (met een kopzijde/dwarssteiger aan het uiteinde)
4. Schat de GPS-coördinaten van het begin (waterzijde/noord) en eind (walzijde/zuid) van de steiger
5. Schat de gemiddelde lengte van de ligplaatsen (in meters)

Antwoord ALLEEN in dit JSON formaat:
{
  "marinaName": "Naam van de haven",
  "piers": [
    {
      "name": "A",
      "startLat": 52.xxx,
      "startLng": 5.xxx,
      "endLat": 52.xxx,
      "endLng": 5.xxx,
      "leftBerths": 5,
      "rightBerths": 5,
      "hasHead": true,
      "headBerths": 3,
      "headStartLat": 52.xxx,
      "headStartLng": 5.xxx,
      "headEndLat": 52.xxx,
      "headEndLng": 5.xxx,
      "avgBerthLength": 12,
      "avgBerthWidth": 4
    }
  ],
  "totalBerths": 70,
  "notes": "Eventuele opmerkingen over de haven"
}`
        }
      ]
    }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Geen JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    return parsed
  }
  catch {
    throw createError({
      statusCode: 500,
      message: 'AI analyse kon niet geparsed worden. Probeer opnieuw.'
    })
  }
})
