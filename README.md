<!-- JOSTRACA_PROTECT: hand-written file, the SDK generator will not overwrite it. -->

# Resend SDK (TypeScript and Python)

An unofficial SDK for the [Resend](https://resend.com) email API, in TypeScript and Python.

I made it with the [Voxgig SDK generator](https://voxgig.com/sdk). The generator reads Resend's
[OpenAPI spec](https://github.com/resend/resend-openapi) and writes the SDK code, docs and tests.
I did not write the SDK code by hand.

This project is not made by or connected to Resend.

## What is in this repo

| Folder / file | What it is |
| --- | --- |
| [`ts/`](ts) | The TypeScript SDK |
| [`py/`](py) | The Python SDK |
| [`examples/live-smoke.js`](examples/live-smoke.js) | A short script that calls the real Resend API |
| [`.sdk/`](.sdk) | The generator setup. Edit the model here and run it again to rebuild the SDKs |
| [`REPORT.md`](REPORT.md) | My notes on using the generator: what worked and what broke |

## Quickstart

You need a Resend API key. You can get one for free at [resend.com](https://resend.com).

### TypeScript

```bash
git clone https://github.com/zainAwan9175/resend-api-sdk
cd resend-api-sdk/ts
npm install
npm run build
```

Send an email:

```ts
import { ResendSDK } from '@zainawan9175/resend-sdk'

const client = new ResendSDK({ apikey: process.env.RESEND_APIKEY })

const email = await client.Email().create({
  from: 'onboarding@resend.dev',
  to: ['delivered@resend.dev'],
  subject: 'Hello',
  text: 'Sent with the Resend SDK.',
})

console.log(email.data().id)
```

### Python

```bash
git clone https://github.com/zainAwan9175/resend-api-sdk
cd resend-api-sdk/py
pip install -e .
```

Send an email:

```python
import os
from resend_sdk import ResendSDK

client = ResendSDK({"apikey": os.environ.get("RESEND_APIKEY")})

email = client.Email().create({
    "from": "onboarding@resend.dev",
    "to": ["delivered@resend.dev"],
    "subject": "Hello",
    "text": "Sent with the Resend SDK.",
})

print(email.data_get()["id"])
```

`onboarding@resend.dev` and `delivered@resend.dev` are Resend's test addresses. They work
before you add your own domain.

## How the SDK works

Each part of the API is an object with simple methods: `list`, `load`, `create`, `update` and `remove`.

```ts
const domains = await client.Domain().list()
const keys = await client.ApiKey().list()
```

If you need an endpoint the SDK does not cover well, you can call it directly:

```ts
const res = await client.direct({ path: '/domains', method: 'GET' })
if (res.ok) console.log(res.data)
```

The full list of objects and methods is in [`ts/REFERENCE.md`](ts/REFERENCE.md) and
[`py/REFERENCE.md`](py/REFERENCE.md).

## Testing without an API key

Both SDKs have a test mode. It uses fake in-memory data, so you need no key and no network.

```ts
const client = ResendSDK.test({
  entity: { email: { e1: { id: 'e1', subject: 'Hello' } } },
})

const emails = await client.Email().list()
console.log(emails.map((e) => e.data()))
```

Run the test suites:

```bash
cd ts && npm test                 # TypeScript
cd py && python -m pytest test/   # Python
```

Results right now: TypeScript has 577 tests passing and 5 failing. Python has 440 passing and 5 failing.
The same 5 fail in both languages, so the cause is in the generator, not in one language.
[`REPORT.md`](REPORT.md) explains why.

## Testing against the real API

```bash
cd ts && npm install && npm run build && cd ..
RESEND_APIKEY=re_your_key node examples/live-smoke.js
```

The script lists your domains and API keys, sends one test email, and then loads it back.
Each step prints `PASS` or `FAIL`.

## Rebuilding the SDKs

The code in `ts/` and `py/` is generated, so do not edit it by hand. Change the model in `.sdk/`
and run the generator again:

```bash
cd .sdk
npm install
npm run build
npm run generate
```

On Windows you need some workarounds first. They are listed in [`REPORT.md`](REPORT.md).

## Known problems

- Some names are long and odd, like `RemoveContactResponseSuccess`. They come from the names in Resend's spec.
- Endpoints with two IDs in the path, like email attachments, do not work well yet.
- In Python, the typed models leave out the `from` field because `from` is a reserved word in
  Python. You can still pass `"from"` in a normal dict, as in the example above.

More detail is in [`REPORT.md`](REPORT.md).

## License

MIT. See [`LICENSE`](LICENSE).
