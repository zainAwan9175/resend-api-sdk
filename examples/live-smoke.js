// Live smoke test for the generated Resend TypeScript SDK.
//
// Usage (from the repo root, after `cd ts && npm install && npm run build`):
//   RESEND_APIKEY=re_xxx node examples/live-smoke.js
//
// Uses Resend's sandbox sender (onboarding@resend.dev) and test inbox
// (delivered@resend.dev), so no verified domain is needed.

const { ResendSDK } = require('../ts/dist/ResendSDK')

const apikey = process.env.RESEND_APIKEY
if (!apikey) {
  console.error('Set RESEND_APIKEY first.')
  process.exit(1)
}

const client = new ResendSDK({ apikey })

async function step(name, fn) {
  try {
    const out = await fn()
    console.log('PASS', name, JSON.stringify(out)?.slice(0, 200))
    return out
  } catch (err) {
    console.log('FAIL', name, err.message)
  }
}

async function main() {
  await step('Domain.list', async () =>
    (await client.Domain().list()).map((d) => d.data()))

  await step('ApiKey.list', async () =>
    (await client.ApiKey().list()).map((k) => k.data().name))

  const sent = await step('Email.create (send)', async () =>
    (await client.Email().create({
      from: 'onboarding@resend.dev',
      to: ['delivered@resend.dev'],
      subject: 'Voxgig SDK smoke test',
      text: 'Sent from the generated Resend SDK.',
    })).data())

  if (sent?.id) {
    await step('Email.load (documented: id)', async () =>
      (await client.Email().load({ id: sent.id })).data())

    await step('Email.load (path param: email_id)', async () =>
      (await client.Email().load({ email_id: sent.id })).data())
  }

  await step('Email.list', async () =>
    (await client.Email().list()).length)

  await step('direct GET /domains', async () => {
    const res = await client.direct({ path: '/domains', method: 'GET' })
    return { ok: res.ok, status: res.status }
  })
}

main()
