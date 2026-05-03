import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '../../utils/auth'
import { convertAndValidate, metersPerPixel, type RawPier, type MapBounds } from '../../utils/geo'

interface AnalyzeBody {
  imageBase64: string
  bounds: MapBounds
  imageWidth: number
  imageHeight: number
  center?: { lat: number, lng: number }
  zoom?: number
  marinaName?: string
  polygon?: number[][] | null
}

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const config = useRuntimeConfig()
  if (!config.claudeApiKey) {
    throw createError({ statusCode: 500, message: 'Claude API key niet geconfigureerd' })
  }

  const body = await readBody<AnalyzeBody>(event)
  const { imageBase64, bounds, imageWidth, imageHeight, marinaName, polygon } = body

  if (!imageBase64) {
    throw createError({ statusCode: 400, message: 'Screenshot is verplicht' })
  }
  if (!bounds || !imageWidth || !imageHeight) {
    throw createError({ statusCode: 400, message: 'Kaartgrenzen en beeldafmetingen zijn verplicht' })
  }

  const mpp = metersPerPixel(bounds, imageWidth)
  const widthMeters = mpp * imageWidth
  const heightMeters = mpp * imageHeight

  const polygonHint = Array.isArray(polygon) && polygon.length >= 3
    ? `De gebruiker heeft een gebied omcirkeld om de zoekopdracht te beperken (GPS-polygon): ${JSON.stringify(polygon)}. Steigers buiten dit gebied negeren.`
    : ''

  const prompt = `Je analyseert een satellietfoto van een jachthaven${marinaName ? ` (${marinaName})` : ''}.

BEELD:
- Afmetingen: ${imageWidth} x ${imageHeight} pixels
- Schaal: ongeveer ${mpp.toFixed(2)} meter per pixel (totaal ${widthMeters.toFixed(0)}m breed, ${heightMeters.toFixed(0)}m hoog)
- Coördinatensysteem: x = 0 links, x = ${imageWidth} rechts; y = 0 boven, y = ${imageHeight} onder
${polygonHint}

OPDRACHT:
Identificeer ALLE steigers (drijvende of vaste pontons waar boten aan liggen). Voor elke steiger:

1. Geef een letter-naam (A, B, C, ...) — begin bij de oostelijkste/rechtse steiger.
2. Geef de PIXELCOÖRDINATEN van het beginpunt (waterzijde, vaak diepere kant) en eindpunt (walzijde) van de hoofdlijn van de steiger.
3. Tel ligplaatsen aan elke kant van de hoofdlijn (links en rechts t.o.v. de start→eind richting). Tel boten + lege plekken.
4. Bepaal of er een T-kop is (dwarssteiger aan het uiteinde). Zo ja, geef de twee pixelcoördinaten van de kop-lijn en het aantal kop-ligplaatsen.
5. Schat gemiddelde ligplaats-lengte en -breedte in METERS (typisch 8-15m lang, 3-4m breed voor Nederlandse havens).
6. Geef een confidence-score 0..1 voor deze steiger (hoe zeker ben je van naam, positie, en aantal).

REGELS:
- Output ALLEEN geldige JSON, geen uitleg eromheen.
- Pixelcoördinaten als gehele getallen binnen [0, ${imageWidth}] resp. [0, ${imageHeight}].
- Als je twijfelt over een steiger, lager confidence-getal — niet weglaten.
- Negeer schepen op open water; alleen steigers met ligplaatsen.

JSON-FORMAAT:
{
  "marinaName": "string",
  "piers": [
    {
      "name": "A",
      "start": { "x": 0, "y": 0 },
      "end": { "x": 0, "y": 0 },
      "leftBerths": 0,
      "rightBerths": 0,
      "hasHead": false,
      "headStart": { "x": 0, "y": 0 },
      "headEnd": { "x": 0, "y": 0 },
      "headBerths": 0,
      "avgBerthLength": 10,
      "avgBerthWidth": 3.5,
      "confidence": 0.85
    }
  ],
  "notes": "korte opmerking over het resultaat"
}`

  const client = new Anthropic({ apiKey: config.claudeApiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
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

  let parsed: { marinaName?: string, piers?: RawPier[], notes?: string }
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Geen JSON in response')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw createError({
      statusCode: 500,
      message: 'AI-antwoord kon niet gelezen worden. Probeer opnieuw.'
    })
  }

  const rawPiers = Array.isArray(parsed.piers) ? parsed.piers : []
  const { piers, warnings } = convertAndValidate(rawPiers, bounds, imageWidth, imageHeight)

  const totalBerths = piers.reduce((sum, p) =>
    sum + (p.leftBerths || 0) + (p.rightBerths || 0) + (p.hasHead ? p.headBerths : 0), 0)

  return {
    marinaName: parsed.marinaName || marinaName || '',
    piers,
    totalBerths,
    notes: parsed.notes || '',
    warnings,
    metersPerPixel: mpp
  }
})
