import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET')?.replace('v1,whsec_', '')
const textbeeApiKey = Deno.env.get('TEXTBEE_API_KEY')

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 400 })
  }

  if (!hookSecret || !textbeeApiKey) {
    console.error('SMS hook secrets are not configured')
    return new Response('{}', { status: 500 })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(hookSecret)
    const { user, sms } = wh.verify(payload, headers) as {
      user: { phone?: string }
      sms: { otp?: string }
    }

    const phone = user?.phone
    const otp = sms?.otp

    if (!phone || !otp) {
      console.error('Auth hook payload did not contain phone/otp')
      return new Response('{}', { status: 400 })
    }

    const providerResponse = await fetch(
      'https://api.textbee.dev/api/v1/gateway/send-sms',
      {
        method: 'POST',
        headers: {
          'x-api-key': textbeeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [phone],
          message: `رمز التحقق الخاص بك في جَرْمَل هو: ${otp}`,
        }),
      },
    )

    if (!providerResponse.ok) {
      const body = await providerResponse.text()
      console.error('textbee send failed', providerResponse.status, body)
      return new Response('{}', { status: 502 })
    }

    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-sms hook failed', error)
    return new Response('{}', { status: 400 })
  }
})
