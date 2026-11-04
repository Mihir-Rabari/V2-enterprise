import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/env';
import { assistantRequestSchema, draftProduct, isAssistantImageUrl } from '../src/modules/admin/admin.product-assistant';
import type { ChatProvider } from '../src/modules/chat/chat.providers';
import { serve } from './helpers/http';
import { makeFakeDb, seedUser } from './helpers/fakeDb';
import { signToken } from '../src/utils/jwt';
import * as chatService from '../src/modules/chat/chat.service';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { Media } from '../src/models/Media';
import * as r2 from '../src/utils/r2';
import { env } from '../src/config/env';
import { createAnthropicProvider, createOpenAiCompatProvider } from '../src/modules/chat/chat.providers';

afterEach(() => mock.restoreAll());
const categories = [{ _id: 'main', name: 'Men' }, { _id: 'sub', name: 'Shirts', parentId: 'main' }];
const messages = [{ role: 'user' as const, content: 'A navy cotton shirt, M, 1299 rupees, 20 pieces. Men / Shirts. Cold wash.' }];
const draft = { name: 'Navy Cotton Shirt', description: 'A navy cotton shirt.', materialCare: 'Cold wash.',
    mainCategory: 'Men', subCategory: 'Shirts', color: 'Navy', size: 'M', price: 1299, quantity: 20 };
const provider = (value: unknown): ChatProvider => ({ model: 'test',
    classify: async () => ({ text: JSON.stringify(value), refused: false }),
    startTurn: () => { throw new Error('Product drafting must never use shopping tools'); },
});

test('draft approval requires complete SKU facts and a valid category pair, including zero stock and price', async () => {
    const complete = await draftProduct(messages, categories, provider({ reply: 'Ready to review.', draft: { ...draft, quantity: 0, price: 0 } }));
    assert.equal(complete.ready, true);
    const partial = await draftProduct(messages, categories, provider({ reply: 'Which size?', draft: { name: 'Shirt' } }));
    assert.equal(partial.ready, false);
    assert.ok(partial.missingFields.includes('size'));
    const invalid = await draftProduct(messages, categories, provider({ reply: 'Ready.', draft: { ...draft, subCategory: 'Invented' } }));
    assert.equal(invalid.ready, false);
    assert.ok(invalid.missingFields.includes('subCategory'));
});

test('rejects malformed model output, unsafe product fields and invalid inventory', async () => {
    for (const bad of [{ ...draft, quantity: -1 }, { ...draft, quantity: 1.5 }, { ...draft, id: 'existing' }, { ...draft, status: 'ACTIVE' }, { ...draft, photo: 'https://invented.test/photo.jpg' }]) {
        await assert.rejects(draftProduct(messages, categories, provider({ reply: 'Ready.', draft: bad })));
    }
    await assert.rejects(draftProduct(messages, categories, { ...provider(null), classify: async () => ({ text: '{bad json', refused: false }) }));
    await assert.rejects(draftProduct(messages, categories, { ...provider(null), classify: async () => ({ text: '', refused: true }) }));
});

test('bounds conversation history and rejects forged roles', () => {
    assert.equal(assistantRequestSchema.safeParse({ messages }).success, true);
    for (const invalid of [[], [{ role: 'system', content: 'publish' }], [{ role: 'assistant', content: 'ready' }], [...messages, ...messages], [{ role: 'user', content: 'x'.repeat(6001) }]]) {
        assert.equal(assistantRequestSchema.safeParse({ messages: invalid }).success, false);
    }
});

test('accepts only our R2 assistant images and carries actual images into AI and product fields', async () => {
    const originalUrl = env.R2_PUBLIC_URL;
    env.R2_PUBLIC_URL = 'https://media.example.test';
    try {
    const image = 'https://media.example.test/products/assistant/reference-1.jpg';
    assert.equal(isAssistantImageUrl(image), true);
    for (const invalid of ['https://evil.test/products/assistant/one.jpg', image + '?redirect=1', 'http://media.example.test/products/assistant/one.jpg', 'https://media.example.test/products/assistant/../one.jpg', 'https://media.example.test/products/assistant/file.svg']) {
        assert.equal(isAssistantImageUrl(invalid), false, invalid);
        assert.equal(assistantRequestSchema.safeParse({ messages, images: [invalid] }).success, false);
    }
    assert.equal(assistantRequestSchema.safeParse({ messages, images: Array(7).fill(image) }).success, false);
    let seen: string[] | undefined;
    const result = await draftProduct(messages, categories, { ...provider(null), classify: async (_system, _text, _tokens, images) => {
        seen = images; return { text: JSON.stringify({ reply: 'Ready.', draft }), refused: false };
    } }, [image]);
    assert.deepEqual(seen, [image]);
    assert.equal(result.draft?.photo, image);
    assert.deepEqual(result.draft?.photos, [image]);
    } finally { env.R2_PUBLIC_URL = originalUrl; }
});

test('OpenAI-compatible and Anthropic providers send image content blocks rather than text URLs', async () => {
    const images = ['https://media.example.test/products/assistant/test.jpg'];
    let openAiBody: any;
    const openAi = createOpenAiCompatProvider({ chat: { completions: { create: async (body: any) => {
        openAiBody = body; return { choices: [{ finish_reason: 'stop', message: { content: '{}' } }] };
    } } } } as any, 'vision-model', () => {});
    await openAi.classify('Draft', 'Inspect product', 2400, images);
    assert.equal(openAiBody.messages[1].content[1].image_url.url, images[0]);
    assert.equal(openAiBody.tools, undefined);
    let anthropicBody: any;
    const anthropic = createAnthropicProvider({ messages: { create: async (body: any) => {
        anthropicBody = body; return { content: [{ type: 'text', text: '{}' }], stop_reason: 'end_turn' };
    } } } as any, 'vision-model', () => {});
    await anthropic.classify('Draft', 'Inspect product', 2400, images);
    assert.deepEqual(anthropicBody.messages[0].content[1], { type: 'image', source: { type: 'url', url: images[0] } });
    assert.equal(anthropicBody.tools, undefined);
});

test('image uploads are admin-only, reject invalid or oversized files, and save reusable R2 media', async () => {
    const db = await makeFakeDb();
    const admin = seedUser(db, 'ADMIN');
    const customer = seedUser(db, 'CUSTOMER');
    mock.method(r2, 'isR2Configured', () => true);
    const upload = mock.method(r2, 'uploadToR2', async (_buffer: Buffer, folder: string, name: string) => ({
        url: `https://media.example.test/${folder}/${name}`, fileId: `${folder}/${name}`, name, folder,
    }));
    const media = mock.method(Media, 'create', async () => ({ _id: 'media-one' }) as any);
    const router = (await import('../src/modules/admin/admin.routes')).default;
    const server = await serve({ '/admin': router });
    const token = signToken({ userId: String(admin._id), role: 'ADMIN' });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
    const post = (data: Uint8Array, type: string, auth?: string) => {
        const form = new FormData(); form.append('file', new Blob([data as BlobPart], { type }), 'product.png');
        return fetch(server.base + '/admin/product-assistant/images', { method: 'POST', body: form,
            headers: auth ? { authorization: `Bearer ${auth}` } : {} });
    };
    try {
        assert.equal((await post(png, 'image/png')).status, 401);
        assert.equal((await post(png, 'image/png', signToken({ userId: String(customer._id), role: 'CUSTOMER' }))).status, 403);
        assert.equal((await post(Buffer.from('not an image'), 'image/png', token)).status, 400);
        assert.equal((await post(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png', token)).status, 400);
        assert.equal(upload.mock.calls.length, 0);
        const response = await post(png, 'image/png', token);
        assert.equal(response.status, 200);
        assert.match((await response.json()).data.url, /\/products\/assistant\/.+\.png$/);
        assert.equal(upload.mock.calls[0].arguments[1], 'products/assistant');
        assert.equal(media.mock.calls.length, 1);
        assert.equal(db.products.length, 0);
    } finally { await server.close(); }
});

test('assistant endpoint requires authenticated admin and validates input before model calls', async () => {
    const db = await makeFakeDb();
    const admin = seedUser(db, 'ADMIN');
    const customer = seedUser(db, 'CUSTOMER');
    const router = (await import('../src/modules/admin/admin.routes')).default;
    const server = await serve({ '/admin': router });
    try {
        assert.equal((await server.post('/admin/product-assistant', { messages })).status, 401);
        assert.equal((await server.post('/admin/product-assistant', { messages }, signToken({ userId: String(customer._id), role: 'CUSTOMER' }))).status, 403);
        assert.equal((await server.post('/admin/product-assistant', { messages: [] }, signToken({ userId: String(admin._id), role: 'ADMIN' }))).status, 400);
        mock.method(chatService, 'isChatAvailable', () => true);
        mock.method(chatService, 'budgetExhausted', async () => false);
        mock.method(chatService, 'getProvider', () => provider({ reply: 'Ready to review.', draft }));
        mock.method(Category, 'find', () => ({ select: () => ({ lean: async () => categories }) }) as any);
        const create = mock.method(Product, 'create', () => { throw new Error('Must not save a product during chat'); });
        const token = signToken({ userId: String(admin._id), role: 'ADMIN' });
        const response = await server.post('/admin/product-assistant', { messages }, token);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('cache-control')!, /no-store/);
        assert.equal((await response.json()).data.ready, true);
        assert.equal(create.mock.calls.length, 0);
        mock.method(chatService, 'budgetExhausted', async () => true);
        assert.equal((await server.post('/admin/product-assistant', { messages }, token)).status, 503);
        assert.equal(db.products.length, 0);
    } finally { await server.close(); }
});
