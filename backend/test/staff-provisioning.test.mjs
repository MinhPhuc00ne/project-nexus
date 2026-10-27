import assert from 'node:assert/strict';
import { test } from 'node:test';
import { staffFixture, staffInput, initialPassword, load } from './staff-fixture.mjs';
const bcrypt = load('bcrypt');
const { AdminService } = load('../src/modules/admin/admin.service.ts');
const { AuthService: ModularAuth } = load('../src/modules/auth/services/auth.service.ts');
const { StaffController } = load('../src/modules/auth/controllers/staff.controller.ts');

test('invitation provisions an active staff account, wallet and old-format username', async () => {
  const f = staffFixture();
  const result = await f.provision.invite(staffInput);
  const password = initialPassword(f.emails[0]);
  assert.equal(result.assignedEmail, 'HuyNQ@staff.com');
  assert.equal(result.staff.role, 'SUPPORT_STAFF');
  assert.equal(result.staff.isVerified, true);
  assert.equal(f.state.wallets.length, 1);
  assert.equal(f.state.invitations[0].isAccepted, true);
  assert.equal(f.emails[0].to, 'personal@example.test');
  assert.equal(f.emails[0].requireDelivery, true);
  assert.equal(f.emails[0].sensitive, true);
  assert.ok(f.emails[0].text.includes('https://nexus.test/login'));
  assert.ok(!f.emails[0].text.includes('/staff/activate'));
  assert.match(password, /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{30,}$/);
  assert.ok(await bcrypt.compare(password, f.state.users[0].passwordHash));
  assert.ok(!JSON.stringify(result).includes(password));
  assert.ok(!JSON.stringify(f.state).includes(password));
  assert.equal(result.token, undefined);
  const loggedIn = await f.shared.login({ email: 'huynq@staff.com', password });
  assert.equal(loggedIn.user.role, 'SUPPORT_STAFF');
});

test('staff and buyer sharing a personal Gmail remain separate accounts', async () => {
  const f = staffFixture();
  const buyer = {
    id: 'buyer',
    email: staffInput.email,
    personalEmail: staffInput.email,
    role: 'BUYER',
    fullName: 'Buyer',
    isVerified: true,
    passwordHash: await bcrypt.hash('BuyerPassword!9', 4),
  };
  f.state.users.push(buyer);
  const result = await f.provision.invite(staffInput);
  assert.notEqual(result.staff.id, 'buyer');
  assert.equal(f.state.users.find((row) => row.id === 'buyer').passwordHash, buyer.passwordHash);
  assert.equal(
    (await f.shared.login({ email: staffInput.email, password: 'BuyerPassword!9' })).user.role,
    'BUYER',
  );
});

test('duplicate personal staff email is rejected without emailing or rotating credentials', async () => {
  const f = staffFixture();
  await f.provision.invite(staffInput);
  const hash = f.state.users[0].passwordHash;
  await assert.rejects(
    f.provision.invite({ ...staffInput, email: ' PERSONAL@example.test ' }),
    (error) => error.getStatus() === 400,
  );
  assert.equal(f.emails.length, 1);
  assert.equal(f.state.users.length, 1);
  assert.equal(f.state.users[0].passwordHash, hash);
});

test('same staff names get numbered usernames and independent random passwords', async () => {
  const f = staffFixture();
  const [a, b] = await Promise.all([
    f.provision.invite(staffInput),
    f.provision.invite({ ...staffInput, email: 'second@example.test' }),
  ]);
  assert.deepEqual([a.assignedEmail, b.assignedEmail], ['HuyNQ@staff.com', 'HuyNQ2@staff.com']);
  assert.notEqual(initialPassword(f.emails[0]), initialPassword(f.emails[1]));
});

test('SMTP failure rolls back staff account, wallet and invitation changes', async () => {
  const f = staffFixture({ mailAccepted: false });
  f.state.invitations.push({
    id: 'old',
    personalEmail: staffInput.email,
    assignedEmail: 'HuyNQ@staff.com',
    isAccepted: false,
  });
  await assert.rejects(f.provision.invite(staffInput), (error) => error.getStatus() === 503);
  assert.equal(f.state.users.length, 0);
  assert.equal(f.state.wallets.length, 0);
  assert.equal(f.state.invitations.length, 1);
  assert.equal(f.state.invitations[0].isAccepted, false);
});

test('legacy activation tokens are invalidated when credentials are issued', async () => {
  const f = staffFixture();
  f.state.invitations.push({
    id: 'old',
    personalEmail: staffInput.email,
    assignedEmail: 'HuyNQ@staff.com',
    isAccepted: false,
  });
  await f.provision.invite(staffInput);
  assert.equal(f.state.invitations[0].isAccepted, true);
  const auth = new ModularAuth(f.prisma, f.config, f.mail, {}, f.provision);
  await assert.rejects(auth.activateStaff({ token: 'old' }), (error) => error.getStatus() === 410);
  await assert.rejects(auth.getStaffInvitationInfo('old'), (error) => error.getStatus() === 410);
});

test('both admin provisioning paths always issue a random password', async () => {
  const f = staffFixture();
  const admin = new AdminService(f.prisma, f.provision);
  const result = await admin.createStaff({ ...staffInput, password: 'IgnoredManualPassword!9' });
  assert.equal(result.staff.role, 'SUPPORT_STAFF');
  assert.notEqual(initialPassword(f.emails[0]), 'IgnoredManualPassword!9');
  const result2 = await admin.inviteStaff({ ...staffInput, email: 'another@example.test' });
  assert.equal(result2.assignedEmail, 'HuyNQ2@staff.com');
});

test('staff uses the shared forgot-password OTP flow, then only the new password works', async () => {
  const f = staffFixture();
  const created = await f.provision.invite(staffInput);
  const password = initialPassword(f.emails[0]);
  await f.shared.login({ email: created.assignedEmail, password });
  const controller = new StaffController({}, {}, f.shared);
  const response = await controller.forgotPassword({ email: ' huynq@staff.com ' });
  assert.equal(response.success, true);
  assert.equal(response.devOtpCode, undefined);
  const otpEmail = f.emails.at(-1);
  assert.equal(otpEmail.to, staffInput.email);
  const otp = otpEmail.html.match(/>(\d{6})<\/h1>/)[1];
  await controller.resetPassword({
    email: 'HUYNQ@staff.com',
    otp,
    newPassword: 'MyNewPassword!2026',
  });
  await assert.rejects(
    f.shared.login({ email: created.assignedEmail, password }),
    (error) => error.getStatus() === 401,
  );
  assert.equal(
    (await f.shared.login({ email: created.assignedEmail, password: 'MyNewPassword!2026' })).user
      .role,
    'SUPPORT_STAFF',
  );
  assert.equal(f.state.refreshTokens[0].isRevoked, true);
  await assert.rejects(
    f.shared.resetPassword({
      email: created.assignedEmail,
      code: otp,
      newPassword: 'OtherPassword!2026',
    }),
  );
});

test('expired or incorrect OTP cannot change the staff password', async () => {
  const f = staffFixture();
  const created = await f.provision.invite(staffInput);
  const user = f.state.users[0];
  const hash = user.passwordHash;
  user.verificationCode = '123456';
  user.codeExpiresAt = new Date(Date.now() - 1000);
  await assert.rejects(
    f.shared.resetPassword({
      email: created.assignedEmail,
      code: '123456',
      newPassword: 'NewPassword!2026',
    }),
  );
  user.codeExpiresAt = new Date(Date.now() + 10000);
  await assert.rejects(
    f.shared.resetPassword({
      email: created.assignedEmail,
      code: '999999',
      newPassword: 'NewPassword!2026',
    }),
  );
  assert.equal(user.passwordHash, hash);
});

test('one OTP cannot be consumed concurrently to set two passwords', async () => {
  const f = staffFixture();
  const created = await f.provision.invite(staffInput);
  f.state.users[0].verificationCode = '123456';
  f.state.users[0].codeExpiresAt = new Date(Date.now() + 60000);
  const attempts = await Promise.allSettled(
    ['FirstPassword!2026', 'SecondPassword!2026'].map((newPassword) =>
      f.shared.resetPassword({ email: created.assignedEmail, code: '123456', newPassword }),
    ),
  );
  assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(f.state.users[0].verificationCode, null);
});

test('staff forgot-password fails if Gmail delivery fails, without publishing an OTP', async () => {
  const f = staffFixture();
  const created = await f.provision.invite(staffInput);
  f.shared.transporter.sendMail = async () => {
    throw new Error('SMTP not available');
  };
  await assert.rejects(
    f.shared.forgotPassword({ email: created.assignedEmail }),
    (error) => error.getStatus() === 400,
  );
  assert.equal(f.state.users[0].verificationCode, undefined);
});
