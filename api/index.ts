import type { IncomingMessage, ServerResponse } from 'http';
import { createApiMiddleware } from '../src/server/api';

const middleware = createApiMiddleware();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  return middleware(req, res, () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });
}
