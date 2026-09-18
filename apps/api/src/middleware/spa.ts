import { extname, join } from 'node:path';
import express, { type RequestHandler } from 'express';

// Paths the server itself owns: an unknown path under them is an error of the API, never a page.
const SERVER_PREFIXES = ['/api', '/health'];

const isServerPath = (path: string) =>
  SERVER_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

// Serves the compiled SPA: its files, and index.html for the routes that only exist in the
// browser (/products/7, ...), so that reloading or opening a link works.
export function createSpaMiddleware({ dir }: { dir: string }): RequestHandler[] {
  const indexFile = join(dir, 'index.html');

  // `index: false`: "/" takes the same path as any other client route, through the fallback.
  const files = express.static(dir, { index: false });

  const fallback: RequestHandler = (req, res, next) => {
    const isRead = req.method === 'GET' || req.method === 'HEAD';
    // A path with an extension is a file that does not exist: 404, not a page that would hide a
    // broken build. Client routes never have one.
    if (!isRead || isServerPath(req.path) || extname(req.path) !== '') {
      next();
      return;
    }
    res.sendFile(indexFile, (error) => {
      if (error) {
        next(error);
      }
    });
  };

  return [files, fallback];
}
