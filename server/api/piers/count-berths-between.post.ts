import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '../../utils/auth'
import { haversine, type MapBounds } from '../../utils/geo'

interface CountBody {
  imageBase64: string
  bounds: MapBounds
  imageWidth: number
  imageHeight: number
  line: [[number, number], [number, number]] // [[startLat,startLng], [endLat,endLng]]
  pierName?: string
}

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const config = useRuntimeConfig()
  if (!config.claudeApiKey) {
    throw createError({ statusCode: 500, message: 'Claude API key niet geconfigureerd' })
  }

  const body = await readBody<CountBody>(event)
  const { imageBase64, bounds, imageWidth, imageHeight, line, pierName } = body

  if (!imageBase64 || !bounds || !imageWidth || !imageHeight || !Array.isArray(line) || line.length !== 2) {
    throw createError({ statusCode: 400, message: 'imageBase64, bounds, dimensies en lijn zijn verplicht' })
  }

  const [start, end] = line
  if (!start || !end || start.length !== 2 || end.length !== 2) {
    throw createError({ statusCode: 400, message: 'Lijn moet twee GPS-punten bevatten' })
  }

  const lengthMeters = haversine(start[0], start[1], end[0], end[1])
  if (lengthMeters < 5 || lengthMeters > 600) {
    throw createError({ statusCode: 400, message: `Lijn is ${lengthMeters.toFixed(0)}m — verwacht 5-600m` })
  }

  const prompt = `Je krijgt een satellietfoto van een jachthaven en de exacte GPS-positie van één steiger.

STEIGER ${pierName || ''}:
- Begin: ${start[0].toFixed(6)}, ${start[1].toFixed(6)}
- Eind:  ${end[0].toFixed(6)}, ${end[1].toFixed(6)}
- Lengte: ${lengthMeters.toFixed(0)} meter

KAARTBEREIK:
- Beeld ${imageWidth} x ${imageHeight} pixels
- noord ${bounds.north}, zuid ${bounds.south}, oost ${bounds.east}, west ${bounds.west}

OPDRACHT:
Tel het aantal ligplaatsen aan elke kant van DEZE steiger (en alleen deze, niet de buren).
- "leftBerths": ligplaatsen aan de linkerkant van de richting Begin → Eind
- "rightBerths": ligplaatsen aan de rechterkant
- "hasHead": is er een T-kop aan het einde?
- "headBerths": aantal ligplaatsen op de kop (0 als hasHead=false)
- "avgBerthLength": gemiddelde lengte in meters (typisch 8-15m)
- "avgBerthWidth": gemiddelde breedte in meters (typisch 3-4m)
- "confidence": 0..1

Tel zowel boten als lege plekken. Output ALLEEN JSON:
{
  "leftBerths": 0,
  "rightBerths": 0,
  "hasHead": false,
  "headBerths": 0,
  "avgBerthLength": 10,
  "avgBerthWidth": 3.5,
  "confidence": 0.9
}`

  const client = new Anthropic({ apiKey: config.claudeApiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    temperature: 0.2,
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
        { type: 'text', text: prompt }
      ]
    }]
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Geen JSON')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      leftBerths: clampInt(parsed.leftBerths, 0, 100),
      rightBerths: clampInt(parsed.rightBerths, 0, 100),
      hasHead: !!parsed.hasHead,
      headBerths: clampInt(parsed.headBerths, 0, 30),
      avgBerthLength: clampNum(parsed.avgBerthLength, 4, 30, 10),
      avgBerthWidth: clampNum(parsed.avgBerthWidth, 1.5, 10, 3.5),
      confidence: clampNum(parsed.confidence, 0, 1, 0.7),
      lengthMeters
    }
  } catch {
    throw createError({
      statusCode: 500,
      message: 'AI-antwoord kon niet gelezen worden. Probeer opnieuw.'
    })
  }
})

function clampInt(v: unknown, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(min, Math.min(max, Math.round(n)))
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}
