import { toPublicUser } from './user.mapper';

describe('toPublicUser', () => {
  const user = {
    id: 'u1',
    email: 'a@b.com',
    name: 'Ana',
    locale: 'es',
    paymentLink: 'https://pay.me/ana',
    googleId: 'g-secret',
    passwordHash: 'hash-secret',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    deletedAt: null,
  } as never;

  it('expone solo los campos públicos', () => {
    const pub = toPublicUser(user);
    expect(pub).toEqual({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ana',
      locale: 'es',
      paymentLink: 'https://pay.me/ana',
      createdAt: new Date('2026-01-01'),
    });
  });

  it('NUNCA filtra passwordHash ni googleId', () => {
    const pub = toPublicUser(user) as unknown as Record<string, unknown>;
    expect(pub.passwordHash).toBeUndefined();
    expect(pub.googleId).toBeUndefined();
  });
});
