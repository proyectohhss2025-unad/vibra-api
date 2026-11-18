import { jest } from '@jest/globals';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

/**
 * Pruebas del flujo de login con protección de fuerza bruta.
 * Verifica el orden: credenciales → contador → bloqueo suave.
 */
describe('AuthService.login', () => {
  let service: AuthService;
  let usersService: any;
  let loginProtection: any;

  const password = 'Vibra@2026!';
  // Rondas bajas para que la prueba sea rápida (el algoritmo es el mismo).
  const passwordHash = bcrypt.hashSync(password, 4);

  const buildUser = (overrides: Record<string, any> = {}) => ({
    _id: 'user-1',
    username: 'ana',
    name: 'Ana',
    email: 'ana@example.com',
    documentNumber: '12345678',
    password: passwordHash,
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    jest.spyOn(global, 'setInterval').mockImplementation((() => 0) as any);

    usersService = {
      findByUsername: jest.fn(),
      updateIsLogged: jest.fn().mockResolvedValue(undefined),
    };

    loginProtection = {
      getLockStatus: jest.fn().mockResolvedValue({
        locked: false,
        retryAfterSeconds: 0,
      }),
      getIpStatus: jest.fn().mockReturnValue({
        blocked: false,
        retryAfterSeconds: 0,
      }),
      registerFailure: jest
        .fn()
        .mockResolvedValue({ locked: false, retryAfterSeconds: 0 }),
      reset: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      { sign: jest.fn(() => 'jwt-token') } as any,
      usersService,
      { sendActiveUsers: jest.fn() } as any,
      loginProtection,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('permite el acceso con credenciales correctas y limpia el contador', async () => {
    usersService.findByUsername.mockResolvedValue(buildUser());

    const result = await service.login({ username: 'ana', password });

    expect(result).toEqual({ access_token: 'jwt-token' });
    expect(usersService.updateIsLogged).toHaveBeenCalledWith('user-1', true);
    expect(loginProtection.reset).toHaveBeenCalledWith('ana');
  });

  it('devuelve 401 genérico con contraseña incorrecta y registra el fallo', async () => {
    usersService.findByUsername.mockResolvedValue(buildUser());

    await expect(
      service.login({ username: 'ana', password: 'incorrecta' }),
    ).rejects.toMatchObject({
      response: { message: 'Usuario o contraseña incorrectos.' },
      status: HttpStatus.UNAUTHORIZED,
    });

    expect(loginProtection.registerFailure).toHaveBeenCalledWith(
      'ana',
      undefined,
    );
  });

  it('no revela si el usuario existe (mismo 401 y contador)', async () => {
    usersService.findByUsername.mockRejectedValue(
      new NotFoundException('Usuario con username x no encontrado'),
    );

    await expect(
      service.login({ username: 'no-existe', password }),
    ).rejects.toMatchObject({
      response: { message: 'Usuario o contraseña incorrectos.' },
      status: HttpStatus.UNAUTHORIZED,
    });

    expect(loginProtection.registerFailure).toHaveBeenCalledWith(
      'no-existe',
      undefined,
    );
  });

  it('responde 429 LOGIN_LOCKED al alcanzar el umbral de fallos', async () => {
    usersService.findByUsername.mockResolvedValue(buildUser());
    loginProtection.registerFailure.mockResolvedValue({
      locked: true,
      retryAfterSeconds: 900,
    });

    await expect(
      service.login({ username: 'ana', password: 'incorrecta' }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: {
        code: 'LOGIN_LOCKED',
        retryAfterSeconds: 900,
      },
    });
  });

  it('bloqueo suave: la contraseña correcta entra aunque la cuenta esté bloqueada', async () => {
    usersService.findByUsername.mockResolvedValue(buildUser());
    loginProtection.getLockStatus.mockResolvedValue({
      locked: true,
      retryAfterSeconds: 600,
    });

    const result = await service.login({ username: 'ana', password });

    expect(result).toEqual({ access_token: 'jwt-token' });
    expect(loginProtection.reset).toHaveBeenCalledWith('ana');
  });

  it('con bloqueo activo rechaza contraseñas incorrectas con 429', async () => {
    usersService.findByUsername.mockResolvedValue(buildUser());
    loginProtection.getLockStatus.mockResolvedValue({
      locked: true,
      retryAfterSeconds: 600,
    });

    const error = await service
      .login({ username: 'ana', password: 'incorrecta' })
      .catch((e) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(loginProtection.registerFailure).not.toHaveBeenCalled();
  });

  it('mantiene el mensaje de cuenta pendiente tras validar la contraseña', async () => {
    usersService.findByUsername.mockResolvedValue(
      buildUser({ isActive: false }),
    );

    await expect(service.login({ username: 'ana', password })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('registra el fallo con la IP del cliente', async () => {
    usersService.findByUsername.mockResolvedValue(
      buildUser({ password: bcrypt.hashSync('otra', 4) }),
    );

    await expect(
      service.login({ username: 'ana', password: 'incorrecta' }, '1.2.3.4'),
    ).rejects.toThrow();

    expect(loginProtection.registerFailure).toHaveBeenCalledWith(
      'ana',
      '1.2.3.4',
    );
  });

  it('bloqueo suave por red: credenciales correctas pasan aunque la IP esté limitada', async () => {
    usersService.findByUsername.mockResolvedValue(buildUser());
    loginProtection.getIpStatus = jest.fn().mockReturnValue({
      blocked: true,
      retryAfterSeconds: 300,
    });

    const result = await service.login(
      { username: 'ana', password },
      '1.2.3.4',
    );

    expect(result).toEqual({ access_token: 'jwt-token' });
  });

  it('con la red limitada rechaza credenciales incorrectas con 429 LOGIN_RATE_LIMITED', async () => {
    usersService.findByUsername.mockResolvedValue(
      buildUser({ password: bcrypt.hashSync('otra', 4) }),
    );
    loginProtection.getIpStatus = jest.fn().mockReturnValue({
      blocked: true,
      retryAfterSeconds: 300,
    });

    await expect(
      service.login({ username: 'ana', password: 'incorrecta' }, '1.2.3.4'),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: { code: 'LOGIN_RATE_LIMITED' },
    });
    expect(loginProtection.registerFailure).not.toHaveBeenCalled();
  });

  it('exige usuario y contraseña', async () => {
    await expect(
      service.login({ username: '', password } as any),
    ).rejects.toThrow('El nombre de usuario es requerido');

    await expect(
      service.login({ username: 'ana', password: '' } as any),
    ).rejects.toThrow('La contraseña es requerida');
  });
});
