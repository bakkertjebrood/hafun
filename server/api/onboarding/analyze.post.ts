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

OPDRACHT — wees CONSERVATIEF:
Geef alleen steigers die je écht duidelijk ziet. **Liever 3 zekere steigers dan 10 gegokte.**
Het is beter om er één te missen dan een fantasie-steiger toe te voegen.

Een steiger:
- is een lange smalle drijvende of vaste ponton in het water
- heeft duidelijk zichtbare ligplaatsen (boten of lege vingerpiers) langs één of beide zijden
- staat los van de oever (NIET een kade, dijk, looppad of weg langs het water)

Voor elke ZEKER herkende steiger:
1. Letternaam A, B, C... (oostelijkste = A)
2. Pixelcoördinaten van begin- en eindpunt van de hoofdlijn (binnen [0, ${imageWidth}] en [0, ${imageHeight}])
3. Aantal ligplaatsen LINKS en RECHTS van de hoofdlijn (boten + lege plekken)
4. T-kop ja/nee. Alleen "ja" als je écht een dwarssteiger ziet.
5. Gemiddelde ligplaats-lengte en -breedte in meters
6. Confidence 0..1: alleen >= 0.65 wordt overgenomen. Alles daaronder wordt verworpen.

VERBODEN:
- Kades, dijken, parkeerplaatsen, looppaden, gebouwen of stenen oevers als steiger benoemen.
- Steigers verzinnen die er niet zijn.
- Meer dan 26 steigers retourneren (alfabet stopt bij Z).

Antwoord ALLEEN geldige JSON:
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
  "notes": "korte opmerking"
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
