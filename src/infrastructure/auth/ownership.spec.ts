import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { assertOwnership, normalizePayload } from './ownership';

describe('assertOwnership', () => {
  const session = (sub?: string) => ({ user: sub ? { sub } : undefined });

  it('permite cuando el dueño del recurso es el usuario de la sesión', () => {
    expect(() => assertOwnership(session('user-1'), 'user-1')).not.toThrow();
  });

  it('compara ObjectId y string por valor', () => {
    const id = new Types.ObjectId();

    expect(() => assertOwnership(session(String(id)), id as any)).not.toThrow();
  });

  it('niega el acceso a datos de otro usuario', () => {
    expect(() => assertOwnership(session('user-1'), 'user-2')).toThrow(
      ForbiddenException,
    );
  });

  it('falla cerrado cuando no hay dueño identificable', () => {
    expect(() => assertOwnership(session('user-1'), null)).toThrow(
      ForbiddenException,
    );
    expect(() => assertOwnership(session('user-1'), undefined)).toThrow(
      ForbiddenException,
    );
    expect(() => assertOwnership(session('user-1'), '')).toThrow(
      ForbiddenException,
    );
  });

  it('falla cerrado cuando la petición no trae usuario', () => {
    expect(() => assertOwnership({}, 'user-1')).toThrow(ForbiddenException);
    expect(() => assertOwnership(undefined, 'user-1')).toThrow(
      ForbiddenException,
    );
    expect(() => assertOwnership({ user: {} }, 'user-1')).toThrow(
      ForbiddenException,
    );
  });
});

describe('normalizePayload', () => {
  it('devuelve el objeto tal cual cuando ya es un objeto', () => {
    const body = { testId: '1', responses: [] };

    expect(normalizePayload(body)).toBe(body);
  });

  it('parsea un body enviado como string JSON', () => {
    expect(normalizePayload('{"testId":"1"}')).toEqual({ testId: '1' });
  });

  it('parsea la variante de compatibilidad { body: "<json>" }', () => {
    expect(normalizePayload({ body: '{"testId":"1"}' })).toEqual({
      testId: '1',
    });
  });

  it('lanza 400 cuando el JSON es inválido', () => {
    expect(() => normalizePayload('{no-json')).toThrow(BadRequestException);
    expect(() => normalizePayload({ body: '{no-json' })).toThrow(
      BadRequestException,
    );
  });

  it('lanza 400 cuando el body está vacío o no es objeto', () => {
    expect(() => normalizePayload(null)).toThrow(BadRequestException);
    expect(() => normalizePayload(undefined)).toThrow(BadRequestException);
    expect(() => normalizePayload(42)).toThrow(BadRequestException);
  });
});
