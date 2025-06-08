import { Hono } from 'hono';
import { z } from 'zod';
import { CreateApplication } from "@digital-alchemy/core";
import * as Hass from '@digital-alchemy/hass';
import * as TypeWriter from '@digital-alchemy/type-writer';

export interface Env {
  AI: any;
  KV: KVNamespace;
  DB: D1Database;
  LOG_BUCKET: R2Bucket;
  HASS_DO: DurableObjectNamespace;
  HOMEASSISTANT_TOKEN: string;
  HOMEASSISTANT_URL: string;
  HOMEASSISTANT_WEBSOCKET_URL: string;
  AI_MODEL: string;
}

export class HassDO {
  state: DurableObjectState;
  env: Env;
  client: any;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async connect() {
    if (this.client) return this.client;
    const params = await Hass.QuickBoot('worker');
    this.client = params.hass.socket;
    await this.client.connect({
      url: this.env.HOMEASSISTANT_WEBSOCKET_URL,
      token: this.env.HOMEASSISTANT_TOKEN,
    });
    return this.client;
  }

  async fetch(_request: Request) {
    await this.connect();
    return new Response('ok');
  }
}

const app = new Hono<{ Bindings: Env }>();

app.get('/status', async c => {
  return c.json({ status: 'ok', model: c.env.AI_MODEL });
});

app.get('/schema', async c => {
  const cacheKey = 'schema';
  const cached = await c.env.KV.get(cacheKey);
  if (cached) return c.json(JSON.parse(cached));

  const appDef = CreateApplication({ name: "schema" as any, libraries: [Hass.LIB_HASS, TypeWriter.LIB_TYPE_BUILD], services: {} });
  const params = await appDef.bootstrap();
  const build = params.type_build.build;
  const meta = await build();
  await c.env.KV.put(cacheKey, JSON.stringify(meta));
  return c.json(meta);
});

const aiCommandBody = z.object({ prompt: z.string() });
app.post('/ai-command', async c => {
  const body = await c.req.json();
  const { prompt } = aiCommandBody.parse(body);
  const aiResponse = await c.env.AI.invoke(prompt);
  return c.json({ prompt, aiResponse });
});

const logBody = z.object({ prompt: z.string(), response: z.any() });
app.post('/log', async c => {
  const data = logBody.parse(await c.req.json());
  const stmt = c.env.DB.prepare('INSERT INTO logs (prompt, response) VALUES (?, ?)');
  await stmt.bind(data.prompt, JSON.stringify(data.response)).run();
  return c.json({ status: 'logged' });
});

export default app;
