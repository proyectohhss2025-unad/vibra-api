import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import 'reflect-metadata';
import { PublicRegisterDto } from './public-register.dto';

/**
 * Garantiza que el DTO público conserve la validación heredada de RegisterDto
 * (email, contraseña, documento) y exija los campos del captcha.
 */
describe('PublicRegisterDto', () => {
  const basePayload = {
    name: 'María Fernanda Gómez',
    username: 'mgomez',
    email: 'mgomez@example.com',
    password: 'Vibra@2026!',
    documentNumber: '12345678',
    documentType: '66c9cce47e6a95e98116c0a1',
    company: '66c9cce47e6a95e98116c0ac',
    captchaId: '9f1c2f2e-6b7a-4d4e-9f0a-2b8c3d4e5f60',
    captchaAnswer: '12',
  };

  const validatePayload = (payload: Record<string, any>) =>
    validate(plainToInstance(PublicRegisterDto, payload));

  it('acepta un payload completo y válido', async () => {
    const errors = await validatePayload(basePayload);
    expect(errors).toHaveLength(0);
  });

  it('exige el identificador del reto', async () => {
    const { captchaId, ...withoutCaptchaId } = basePayload;
    const errors = await validatePayload(withoutCaptchaId);
    expect(errors.map((error) => error.property)).toContain('captchaId');
  });

  it('exige la respuesta del reto', async () => {
    const { captchaAnswer, ...withoutAnswer } = basePayload;
    const errors = await validatePayload(withoutAnswer);
    expect(errors.map((error) => error.property)).toContain('captchaAnswer');
  });

  it('exige el nombre completo', async () => {
    const { name, ...withoutName } = basePayload;
    const errors = await validatePayload(withoutName);
    expect(errors.map((error) => error.property)).toContain('name');
  });

  it('conserva la validación heredada del email', async () => {
    const errors = await validatePayload({
      ...basePayload,
      email: 'no-es-email',
    });
    expect(errors.map((error) => error.property)).toContain('email');
  });

  it('conserva la política de contraseña', async () => {
    const errors = await validatePayload({ ...basePayload, password: 'debil' });
    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('acepta el honeypot vacío', async () => {
    const errors = await validatePayload({ ...basePayload, website: '' });
    expect(errors).toHaveLength(0);
  });
});
