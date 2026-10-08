# Report: using the Voxgig SDK generator

These are my notes from building a Resend SDK with the Voxgig SDK generator.

## Setup

| | |
| --- | --- |
| API | Resend email API |
| Spec | Official [Resend OpenAPI spec](https://github.com/resend/resend-openapi), OpenAPI 3.1.2, version 1.5.1, about 70 paths |
| Languages | TypeScript and Python |
| Tools | `@voxgig/create-sdkgen` 0.30.6, `@voxgig/sdkgen` 4.34.3, `@voxgig/apidef` 8.25.0, `@voxgig/model` 12.0.1, `aontu` 0.76.0 |
| Machine | Windows 11, Node 24.18.0, npm 11.16.0, Python 3.12.10 |
| Repo | https://github.com/zainAwan9175/resend-api-sdk |

## Short version

Once it ran, the generator was fast and gave a lot back. In about 10 seconds it made two SDKs with
63 entities, READMEs, reference docs, CI files and a large offline test suite.

Getting it to run on Windows was harder. I hit three problems that stopped me, and one of them
happens on every OS.

| | TypeScript | Python |
| --- | --- | --- |
| Offline tests | 577 pass, 5 fail, 68 skipped | 440 pass, 5 fail, 147 skipped |
| Real API | Requests reach api.resend.com with the API key | Not tried |

## Problems that stopped me

### 1. `create-sdkgen` cannot start npm on Windows

```
npm create @voxgig/sdkgen@latest -- resend -o resend-sdk -d ./spec/resend.yaml
Voxgig Create SDK Error: Failed to start npm: spawn npm ENOENT
```

`runNpm()` calls `spawn('npm', ...)`. On Windows the command is `npm.cmd`, and `spawn` cannot
find it without a shell. The project files are written, but `npm install` and the target and
feature steps never run.

Fix idea: use `npm.cmd` on Windows, or pass `shell: true`.

Workaround: run `npm install` in `.sdk/` by hand.

### 2. `npm install` fails in a new project (all OSes)

The new project's `.sdk/package.json` asks for `"@voxgig/apidef": "~8.22.1"`. But
`@voxgig/sdkgen@4.34.x` needs `@voxgig/apidef >=8.25.0`, so npm stops with `ERESOLVE`.

Fix idea: change the template to `~8.25.0`. A CI job that creates a project and runs
`npm install` would catch this early.

Workaround: change the version in `.sdk/package.json` by hand.

### 3. `npm run generate` cannot find model files on Windows

```
[aontu/multisource_not_found]: source not found: api/api-info.aontu
  --> C:\...\resend-sdk\.sdk\model\sdk.aontu:13:1
Search paths:
  /Users/zain9/Desktop/devrel/resend-sdk/.sdk/api/api-info.aontu
```

The search path has lost the `C:` drive and looks in the wrong folder. It should look in `model/`.

I found the cause in `@tabnas/multisource`, in `dist/resolver/file.js`:

```js
const P = null != ctx.meta?.fs ? Path.posix : Path;
```

`@voxgig/model` always passes `fs`, so this code uses POSIX paths on Windows too.
`path.posix.dirname('C:\\...\\model\\sdk.aontu')` gives `.`, so every relative include is
looked up from the current folder instead of `model/`. The comment above that line says POSIX
paths are meant for a fake in-memory `fs`, not the real one.

I changed that line on my machine and generation then worked:

```js
const P = (null != ctx.meta?.fs && ctx.meta.fs !== SystemFs && !ctx.meta.fs.realpathSync?.native)
  ? Path.posix : Path;
```

A better fix might be to let the caller say if the `fs` is fake, instead of guessing.

The error message helped a lot here. It listed every path it tried, so the bug was quick to find.

## Problems with the output

4. **Entity names come from response names, not resources.** About 25 of the 63 entities have
   names like `RemoveContactResponseSuccess`, `UpdateTopicResponseSuccess` or `Rotate`. Some resources
   are split up. API keys are `ApiKey` (list and remove), plus separate `CreateApiKey` and
   `UpdateApiKey`. The first "create" example in the generated README is
   `client.AddContactToSegmentResponseSuccess().create(...)`. Resend's spec does name its responses
   this way, but the generator could clean them up (drop `ResponseSuccess`, group by path), or the
   docs could show how to rename entities in the model.

5. **Paths with two IDs break.** The same 5 tests fail in both languages: `AutomationRun`
   (`/automations/{automation_id}/runs/{run_id}`), `RetrievedAttachment`
   (`/emails/{email_id}/attachments/{attachment_id}`), `RemoveSuppressionResponseSuccess`, and the
   README and REFERENCE example checks. For example, REFERENCE.md shows
   `client.Email().load({ id: 'email_id' })`, but that call fails with `missing: email_id`.
   The generator also prints a `flow-step-unreachable` warning for these, so it already knows
   something is off.

6. **The generated README skips step 2.** It goes from "1. Create a client" to "3. Load an automationrun".

7. **Python typed models leave out `from`.** It is a reserved word in Python, so the generator
   skips it (`entity-types-skip-field` warning). For an email API, `from` is one of the most
   important fields. Python's other TypedDict form, `TypedDict('Email', {'from': str, ...})`, allows it.

8. **Error messages hide the API's message.** With a bad key, the SDK says
   `ResendSDK: list: request: 400: Bad Request`. Resend's reply says `"API key is invalid"`, but
   you can only see that in `err.result.resdata`. Adding the reply's `message` to the error text
   would help. (Resend sends 400, not 401, for a bad key on GET requests. That part is Resend, not the SDK.)

## Smaller things

9. **New projects are owned by Voxgig by default.** Unless you change it, the LICENSE says
   "Copyright (c) Voxgig", the package is called `@voxgig-sdk/resend-sdk`, and links point to
   `github.com/voxgig-sdk/resend-sdk`, which does not exist. Setting `main.kit.publisher`,
   `main.kit.repo` and `publish.registry.package` in `project.aontu` fixed it, but I only found
   these in the model reference. `create-sdkgen` could ask for them or accept `--publisher` and
   `--repo` options.

10. **The project warns about its own file.** The new `.sdk/.gitignore` ignores `log/`. Then
    `add-target` and `generate` both warn: "Delete the log/ line."

11. **Docs and output disagree on `dist-test/`.** The project layout docs say `ts/dist-test/` is
    not committed. The generated `ts/.gitignore` says it is committed on purpose.

12. **It is not clear when the spec is read.** I expected `create` to fill `model/entity`, but the
    spec is only read during `npm run generate`. One line in the tutorial would make this clear.

## What worked well

- One spec in, two SDKs out, and a rebuild takes about 10 seconds.
- The model setup is good. All my own choices (owner, repo, package names) live in one small file,
  `project.aontu`. It is kept when the project is rebuilt, so I never had to edit generated code.
- The offline tests need no server and no key, and they found real problems (point 5) instead of hiding them.
- Error messages and warnings are clear and say what to do.
- You get a full repo, not just code: reference docs, agent guides, CI and publish workflows.

## How to repeat this

```bash
npm create @voxgig/sdkgen@latest -- resend -o resend-sdk -d ./resend.yaml
cd resend-sdk/.sdk
# On Windows, apply the workarounds for problems 1 to 3 first
npm run add-target ts,py
npm run build
npm run generate
cd ../ts && npm install && npm run build && npm test
cd .. && RESEND_APIKEY=re_your_key node examples/live-smoke.js
```
