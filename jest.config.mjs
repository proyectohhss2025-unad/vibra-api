/**
 * Configuración de Jest para `vibra-api`.
 *
 * ─── Por qué existe este archivo (y no la clave «jest» de package.json) ───
 *
 * El proyecto corre sobre **NestJS 12**, que se publica como **ESM**: los
 * paquetes `@nestjs/common`, `@nestjs/core`, `@nestjs/testing`, `@nestjs/mongoose`,
 * `@nestjs/swagger`, etc. declaran `"type": "module"` y su `index.js` usa
 * `import`.
 *
 * ─── Cómo se ejecuta ───
 *
 * Jest solo admite ESM con el indicador de Node habilitado, así que el script
 * `npm test` invoca directamente:
 *
 *     node --experimental-vm-modules node_modules/jest/bin/jest.js
 *
 * Se usa ese comando en lugar de la variable `NODE_OPTIONS` porque funciona
 * igual en Windows, macOS y Linux sin depender de `cross-env`.
 */

/** @type {import('jest').Config} */
export default {

  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',

  // Sin esto, Jest sigue tratando un `.ts` como CommonJS y el error de arriba
  // desaparece de un sitio para aparecer en otro.
  extensionsToTreatAsEsm: ['.ts'],

  moduleNameMapper: {
    // Alias del proyecto: `import … from 'src/domains/…'`.
    '^src/(.*)$': '<rootDir>/$1',
  },

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'node',
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          target: 'ES2021',
        },
        diagnostics: false,
      },
    ],
  },

  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
};
