## Veo3 + Tigris Text‑to‑Video (Next.js, TypeScript)

Build a text‑to‑video app using Google's Veo3 model and Tigris object storage. Enter an idea, optionally enhance it into structured cinematic parameters, generate a video with Veo3, and automatically store and serve it from Tigris via presigned URLs.

Example idea:

```text
Cinematic. An Extreme Close-Up of a scientist’s trembling hands holding a test tube filled with glowing green liquid. Sirens blare in the background as red warning lights flash across the lab. She whispers into a recorder, “If this works, humanity has one last chance.”
```

## Requirements

- Node v20.11.0 or later
- A Google AI Studio API key for Veo3 and Gemini 2.5 Flash
- A Tigris (S3‑compatible) bucket and access keys

## Project structure

```text
veo3/
  └─ typescript/
     ├─ public/
     ├─ src/
     │  ├─ app/
     │  │  ├─ api/
     │  │  │  ├─ enhance/
     │  │  │  │  └─ route.ts
     │  │  │  └─ generate/
     │  │  │     └─ route.ts
     │  │  ├─ favicon.ico
     │  │  ├─ globals.css
     │  │  ├─ layout.tsx
     │  │  └─ page.tsx
     ├─ eslint.config.mjs
     ├─ next.config.ts
     ├─ package.json
     ├─ postcss.config.mjs
     └─ tsconfig.json
```

## Setup

1) Create a Google AI Studio API key

- Create or select a Google Cloud project
- In AI Studio, click “Get API key” → “Create API key” and link it to your project

2) Create a Tigris bucket and access keys

- Go to `https://storage.new` and create a bucket (recommended name: `veo3`)
- Create Read/Write access keys and copy the credentials
- Ensure your user/role has Editor permissions on the bucket

3) Configure environment variables

Create a `.env.local` in `veo3/typescript` with:

```bash
GOOGLE_API_KEY=your_google_ai_studio_key
TIGRIS_STORAGE_ACCESS_KEY_ID=your_tigris_access_key_id
TIGRIS_STORAGE_SECRET_ACCESS_KEY=your_tigris_secret_access_key
```

Notes:
- The API runs server‑side only; do not expose keys client‑side.
- The S3/Tigris configuration in `api/generate/route.ts` uses:
  - Bucket name: `veo3` (change `S3_BUCKET_NAME` in code if you prefer another)
  - Region: `auto`
  - Endpoint: `https://t3.storage.dev`
  - Path style: `false`
  - Presigned URL expiry: 1 hour

## Install and run

```bash
npm install
npm run dev
# open http://localhost:3000
```

## How it works

- UI (`src/app/page.tsx`)
  - Enter a raw idea and click “Enhance” to extract cinematic parameters using Gemini 2.5 Flash
  - Optionally tweak parameters (subject, action, scene, camera angle/movement, lens effects, style, temporal elements, sound effects, dialogue)
  - Click “Generate Video” to send a prompt to Veo3 and preview the result
  - Shortcuts: Cmd+E (Enhance), Cmd+K (Toggle Parameters), Cmd+Enter (Generate)

- Enhance API (`src/app/api/enhance/route.ts`)
  - POST body: `{ "prompt": string }`
  - Uses `gemini-2.5-flash` to return structured parameters
  - Response: `{ ok: true, structured, params }`

- Generate API (`src/app/api/generate/route.ts`)
  - POST body: `{ prompt: string, numberOfVideos?: number }`
  - Calls Veo3 (`veo-3.0-generate-preview`) via `@google/genai`, polls until done
  - Downloads generated video bytes, uploads to Tigris (S3 API), returns presigned URL(s)
  - Response: `{ url: string[] }` (UI uses the first item)

Typical generation takes ~1 minute. Inference has a cost; see Google AI Studio pricing.

## API examples

Enhance prompt:

```bash
curl -sS -X POST http://localhost:3000/api/enhance \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"An astronaut planting a flag on a neon-lit asteroid."}'
```

Generate video:

```bash
curl -sS -X POST http://localhost:3000/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Cinematic, astronaut on neon-lit asteroid, close-up, dolly in, lens flare.", "numberOfVideos":1}'
```

## Tigris configuration

This app talks to Tigris using the AWS SDK for S3. By default:

- Bucket: `veo3`
- Endpoint: `https://t3.storage.dev`
- Region: `auto`
- forcePathStyle: `false`
- Presigned URL expiry: `3600` seconds

To change the bucket name or expiry, edit `S3_BUCKET_NAME` and the `expiresIn` value in `src/app/api/generate/route.ts`.

## Troubleshooting

- 400 Missing prompt: Provide a non‑empty `prompt` in the POST body
- 500 S3 is not configured: Ensure Tigris env vars are set and the bucket exists (default `veo3`)
- 403 from Tigris: Verify access key permissions and bucket rules (Editor)
- Fetch video failed: Ensure `GOOGLE_API_KEY` is valid and Veo3 access is enabled for your project
- Empty/expired playback: Presigned URLs expire after 1 hour; regenerate if needed

## Acknowledgements

- Google AI Studio (Veo3 and Gemini 2.5 Flash)
- Tigris S3‑compatible storage (`https://storage.new`)

