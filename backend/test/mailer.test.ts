import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';

test('the upgraded mailer preserves the application sender and message without using SMTP', async () => {
    process.env.SMTP_EMAIL = 'store@example.test';
    process.env.SMTP_APP_PASSWORD = 'test-only';
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const send = mock.method(transport, 'sendMail');
    const create = mock.method(nodemailer, 'createTransport', () => transport);
    try {
        const { sendMail } = await import('../src/utils/mailer');
        await sendMail('shopper@example.test', 'Your account', '<p>Welcome</p>');
        assert.equal(send.mock.calls.length, 1);
        assert.deepEqual(send.mock.calls[0].arguments[0], {
            from: '"V2 Enterprise" <store@example.test>', to: 'shopper@example.test', subject: 'Your account', html: '<p>Welcome</p>',
        });
    } finally { create.mock.restore(); send.mock.restore(); transport.close(); }
});
