import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { load } from './staff-fixture.mjs';
const nodemailer = load('nodemailer');
const { MailService } = load('../src/core/mail/mail.service.ts');

function fixture(values = {}) {
  const service = new MailService({ get: (key) => values[key] });
  const log = mock.fn();
  service.logger = { log, debug: log, warn: log, error: log };
  return { service, log };
}

test('staff credentials are not printed or treated as delivered when SMTP is missing', async () => {
  const { service, log } = fixture({ NODE_ENV: 'development' });
  const sent = await service.sendEmail({
    to: 'staff@example.test',
    subject: 'Credentials',
    text: 'DoNotLogThisPassword',
    sensitive: true,
    requireDelivery: true,
  });
  assert.equal(sent, false);
  assert.ok(!JSON.stringify(log.mock.calls).includes('DoNotLogThisPassword'));
});

for (const port of [465, 587]) {
  test(`SMTP ${port} protects the credential email with TLS`, async (t) => {
    const transport = t.mock.method(nodemailer, 'createTransport', () => ({
      sendMail: async () => ({ accepted: ['staff@example.test'] }),
    }));
    const { service } = fixture({
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: String(port),
      SMTP_USER: 'sender@example.test',
      SMTP_PASS: 'test-only',
    });
    assert.equal(
      await service.sendEmail({
        to: 'staff@example.test',
        subject: 'Credentials',
        text: 'secret',
        sensitive: true,
        requireDelivery: true,
      }),
      true,
    );
    const settings = transport.mock.calls[0].arguments[0];
    assert.equal(settings.secure, port === 465);
    assert.equal(settings.requireTLS, port !== 465);
    assert.equal(settings.debug, false);
    assert.equal(settings.logger, false);
  });
}

test('SMTP failures do not leak message content in errors or logs', async (t) => {
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async () => {
      throw new Error('DoNotLogThisPassword');
    },
  }));
  const { service, log } = fixture({
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_USER: 'sender@example.test',
    SMTP_PASS: 'test-only',
  });
  assert.equal(
    await service.sendEmail({
      to: 'staff@example.test',
      subject: 'Credentials',
      sensitive: true,
      requireDelivery: true,
    }),
    false,
  );
  assert.ok(!JSON.stringify(log.mock.calls).includes('DoNotLogThisPassword'));
});
