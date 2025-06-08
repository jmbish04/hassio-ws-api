# hassio-ws-api

Cloudflare Worker for interacting with Home Assistant using the `@digital-alchemy` ecosystem.

## Features
- Persistent WebSocket connection to Home Assistant via Durable Object
- AI powered command routing using Cloudflare's Llama model
- KV caching of automation schema
- D1 logging of interactions
- R2 storage for large log payloads

## Endpoints
- `/schema` – returns AI optimised metadata about your Home Assistant entities
- `/ai-command` – accept natural language and trigger the correct service
- `/log` – store a command/response pair in D1
- `/status` – report connection and AI status

## Development
Install dependencies and build:

```bash
npm install
npm run build
```

The worker entry point is `src/index.ts` and outputs to `dist/index.js`.
