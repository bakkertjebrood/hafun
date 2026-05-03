interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean, id?: string }> {
  const config = useRuntimeConfig()
  const apiKey = config.postmarkApiKey
  const from = config.emailFrom

  if (!apiKey) {
    console.warn('[email] POSTMARK_API_KEY not set — skipping send to', input.to)
    return { ok: false }
  }
  if (!from) {
    console.warn('[email] EMAIL_FROM not set — skipping send to', input.to)
    return { ok: false }
  }

  try {
    const res = await $fetch<{ MessageID: string }>('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': apiKey
      },
      body: {
        From: from,
        To: input.to,
        Subject: input.subject,
        HtmlBody: input.html,
        TextBody: input.text ?? htmlToText(input.html),
        ReplyTo: input.replyTo,
        MessageStream: 'outbound'
      }
    })
    return { ok: true, id: res.MessageID }
  } catch (err) {
    console.error('[email] Postmark send failed:', err)
    return { ok: false }
  }
}

export function welcomeEmail(firstName: string, marinaName: string): { subject: string, html: string } {
  const safeName = firstName || 'havenmeester'
  return {
    subject: `Welkom bij Nautar, ${safeName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0A1520;max-width:560px;margin:0 auto;padding:24px;">
        <h1 style="font-size:22px;margin:0 0 12px;">Welkom bij Nautar</h1>
        <p style="margin:0 0 12px;line-height:1.5;color:#2D3E4A;">
          Hoi ${safeName}, je account voor <strong>${marinaName}</strong> staat klaar.
        </p>
        <p style="margin:0 0 12px;line-height:1.5;color:#2D3E4A;">
          De volgende stap is het tekenen van je haven op de kaart. Onze AI plaatst de ligplaatsen automatisch.
          Daarna kun je huurders importeren en je boekhouding koppelen.
        </p>
        <p style="margin:24px 0;">
          <a href="${useRuntimeConfig().appUrl || 'https://nautar.nl'}/dashboard" style="display:inline-block;padding:12px 20px;background:#00A9A5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">
            Ga naar je dashboard
          </a>
        </p>
        <p style="margin:0;font-size:12px;color:#5A6A78;">
          Vragen? Antwoord op deze mail, dan helpen we je verder.
        </p>
      </div>
    `
  }
}
