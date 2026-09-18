import { apiErrorSchema } from '@vynyl/shared';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createLogCapture } from '../test/log-capture';
import { errorHandler } from './error-handler';
import { createRequestLogger } from './request-logger';

function setup() {
  const capture = createLogCapture();
  const app = express();
  app.use(createRequestLogger(capture.logger));
  app.use(express.json());
  app.post('/echo', (req, res) => {
    res.json({ received: req.body });
  });
  app.use(errorHandler);
  return { app, capture };
}

const postJson = (app: express.Express, body: string) =>
  request(app).post('/echo').set('Content-Type', 'application/json').send(body);

describe('error handler: request body errors', () => {
  it('answers malformed JSON with 400 VALIDATION_ERROR and a fixed message', async () => {
    const { app } = setup();

    const response = await postJson(app, '{"title":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' },
    });
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
  });

  it('does not repeat the parser message', async () => {
    const { app } = setup();

    const response = await postJson(app, '{"title":');

    expect(JSON.stringify(response.body)).not.toMatch(/Unexpected|JSON\.parse|position/i);
  });

  it('answers a JSON null body like malformed JSON', async () => {
    const { app } = setup();

    const response = await postJson(app, 'null');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Malformed JSON body');
  });

  it('answers a body above the size limit with 400 VALIDATION_ERROR', async () => {
    const { app } = setup();

    const response = await postJson(app, JSON.stringify({ text: 'x'.repeat(200_000) }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Request body too large' },
    });
  });

  it('answers an unsupported charset as a client error, not a server error', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json; charset=unknown-charset')
      .send('{}');

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
    });
  });

  it('logs these errors as client errors, not as request failures', async () => {
    const { app, capture } = setup();

    await postJson(app, '{"title":');

    expect(capture.entries().some((entry) => entry.msg === 'Request failed')).toBe(false);
  });

  it('lets valid JSON through untouched', async () => {
    const { app } = setup();

    const response = await postJson(app, '{"title":"ok"}');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: { title: 'ok' } });
  });
});
