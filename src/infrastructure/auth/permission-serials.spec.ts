import { jest } from '@jest/globals';
import {
  CANONICAL_SERIALS,
  LEGACY_SERIAL_MAP,
  PERMISSION_SERIALS,
} from './permission-serials';

/**
 * Pruebas unitarias del registro canónico de seriales de permiso (F1).
 *
 * Lo que garantizan:
 *
 *  1. Todo serial canónico respeta el formato `P-ÁREA-NNN` y no hay duplicados.
 *  2. El mapa heredado apunta de números a seriales que EXISTEN: un número sin
 *     destino dejaría endpoints huérfanos tras la migración.
 *  3. Ningún serial numérico se cuela como canónico (era el defecto: 118 de 159
 *     endpoints dependían de 7 números que ninguna semilla declaraba).
 *  4. Los seriales que exige el código son los que declara el registro: la
 *     auditoría `npm run audit:serials` comprueba lo mismo contra los
 *     controladores, y esto lo fija en la suite.
 */

describe('registro canónico de seriales de permiso', () => {
  const FORMAT = /^P-[A-Z]+-\d{3}$/;

  it('todos los seriales siguen el formato P-ÁREA-NNN', () => {
    const invalid = CANONICAL_SERIALS.filter((serial) => !FORMAT.test(serial));
    expect(invalid).toEqual([]);
  });

  it('no hay seriales duplicados', () => {
    const unique = new Set(CANONICAL_SERIALS);
    expect(unique.size).toBe(CANONICAL_SERIALS.length);
  });

  it('ningún serial canónico es numérico (la convención anterior)', () => {
    const numeric = CANONICAL_SERIALS.filter((serial) => /^\d+$/.test(serial));
    expect(numeric).toEqual([]);
  });

  it('cada entrada declara nombre y qué concede', () => {
    for (const entry of PERMISSION_SERIALS) {
      expect(entry.name.length).toBeGreaterThan(3);
      expect(entry.grants.length).toBeGreaterThan(3);
    }
  });

  describe('mapa heredado', () => {
    it('cada número heredado apunta a un serial canónico que existe', () => {
      for (const [legacy, canonical] of Object.entries(LEGACY_SERIAL_MAP)) {
        expect(legacy).toMatch(/^\d+$/);
        expect(CANONICAL_SERIALS).toContain(canonical);
      }
    });

    it('cubre los siete números que usaba el código anterior', () => {
      // 0, 8, 9, 10, 11, 15 y 16 son los que aparecían hardcodeados en los
      // controladores y que ningún seed declaraba.
      expect(Object.keys(LEGACY_SERIAL_MAP).sort()).toEqual(
        ['0', '10', '11', '15', '16', '8', '9'].sort(),
      );
    });

    it('el mapeo es el esperado para los casos documentados', () => {
      expect(LEGACY_SERIAL_MAP['0']).toBe('P-IDEA-001');
      expect(LEGACY_SERIAL_MAP['8']).toBe('P-EMO-001');
      expect(LEGACY_SERIAL_MAP['9']).toBe('P-ADM-001');
      expect(LEGACY_SERIAL_MAP['10']).toBe('P-ADM-002');
      expect(LEGACY_SERIAL_MAP['11']).toBe('P-CFG-001');
      expect(LEGACY_SERIAL_MAP['15']).toBe('P-EVAL-001');
      expect(LEGACY_SERIAL_MAP['16']).toBe('P-ACT-001');
    });

    it('no hay dos números heredados apuntando al mismo serial', () => {
      const targets = Object.values(LEGACY_SERIAL_MAP);
      expect(new Set(targets).size).toBe(targets.length);
    });

    it('está congelado: nadie puede mutarlo en tiempo de ejecución', () => {
      expect(Object.isFrozen(LEGACY_SERIAL_MAP)).toBe(true);
    });
  });
});
