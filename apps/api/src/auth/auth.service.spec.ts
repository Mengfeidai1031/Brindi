import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

function makeUser(over: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'a@b.com',
    name: 'A',
    locale: 'es',
    passwordHash: null,
    paymentLink: null,
    googleId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe('AuthService', () => {
  let prisma: { user: Record<string, jest.Mock> };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let config: { getOrThrow: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed'), verifyAsync: jest.fn() };
    config = { getOrThrow: jest.fn().mockReturnValue('refresh-secret') };
    service = new AuthService(prisma as never, jwt as never, config as never);
  });

  describe('register', () => {
    it('crea el usuario con la contraseña cifrada y devuelve tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser({ email: 'new@b.com' }));
      const res = await service.register({ email: 'New@b.com', password: 'password123', name: 'New', locale: 'es' } as never);
      expect(res.tokens.accessToken).toBe('signed');
      expect(res.user.email).toBe('new@b.com');
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', data.passwordHash)).toBe(true);
      expect(data.email).toBe('new@b.com'); // normalizado a minúsculas
    });

    it('lanza conflicto si el email ya existe', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      await expect(
        service.register({ email: 'a@b.com', password: 'password123', name: 'A' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('entra con la contraseña correcta', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash }));
      const res = await service.login({ email: 'a@b.com', password: 'password123' } as never);
      expect(res.tokens.accessToken).toBe('signed');
    });

    it('rechaza contraseña incorrecta', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash }));
      await expect(service.login({ email: 'a@b.com', password: 'mala' } as never)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rechaza usuario inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@b.com', password: 'password123' } as never)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rechaza cuenta solo-OAuth (sin contraseña local)', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: null }));
      await expect(service.login({ email: 'a@b.com', password: 'password123' } as never)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rechaza cuenta dada de baja', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash, deletedAt: new Date() }));
      await expect(service.login({ email: 'a@b.com', password: 'password123' } as never)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('rechaza si falta el token', async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza token inválido', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('bad'));
      await expect(service.refresh('tok')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza token de tipo equivocado', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', type: 'access' });
      await expect(service.refresh('tok')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('emite tokens nuevos para un refresh válido', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', type: 'refresh' });
      prisma.user.findFirst.mockResolvedValue(makeUser());
      const res = await service.refresh('tok');
      expect(res.tokens.accessToken).toBe('signed');
    });

    it('rechaza si el usuario ya no existe', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', type: 'refresh' });
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.refresh('tok')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('loginWithGoogle', () => {
    const profile = { googleId: 'g1', email: 'g@b.com', name: 'G' };

    it('devuelve el usuario existente por googleId sin crear ni vincular', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(makeUser({ googleId: 'g1', email: 'g@b.com' }));
      const res = await service.loginWithGoogle(profile);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(res.user.email).toBe('g@b.com');
    });

    it('vincula googleId a una cuenta existente por email', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // por googleId
        .mockResolvedValueOnce(makeUser({ email: 'g@b.com' })); // por email
      prisma.user.update.mockResolvedValue(makeUser({ email: 'g@b.com', googleId: 'g1' }));
      await service.loginWithGoogle(profile);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('crea una cuenta nueva sin contraseña cuando no existe', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValue(makeUser({ email: 'g@b.com', googleId: 'g1' }));
      await service.loginWithGoogle(profile);
      expect(prisma.user.create).toHaveBeenCalled();
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.googleId).toBe('g1');
      expect(data.passwordHash).toBeUndefined();
    });
  });
});
