import express from 'express';
import type { AddressInfo } from 'node:net';

/** Real routers mounted on a bare app (no rate limiters), listening on an ephemeral port. */
export const serve = async (mounts: Record<string, express.Router>) => {
    const app = express();
    app.use(express.json());
    for (const [path, router] of Object.entries(mounts)) app.use(path, router);
    const server = app.listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    return {
        base,
        close: () => new Promise<void>(r => server.close(() => r())),
        get: (path: string, token?: string) => fetch(base + path, { headers: token ? { authorization: `Bearer ${token}` } : {} }),
        post: (path: string, body: unknown, token?: string) => fetch(base + path, {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(body),
        }),
    };
};
