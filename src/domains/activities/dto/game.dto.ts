import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** Tipos de juego soportados por la app mobile. */
export const GAME_TYPES = [
  'WordSearch',
  'MatchingConcepts',
  'DiceGame',
  'EmotionBox',
] as const;

export type GameType = (typeof GAME_TYPES)[number];

/**
 * Reglas de la Caja de Emociones.
 * Deben coincidir con `vibra-web/src/utils/game-config-validation.ts` y con lo
 * que espera `vibra-web-mb` al resolver la actividad.
 */
export const EMOTION_BOX_RULES = {
  minEmotions: 2,
  maxEmotions: 20,
  minTimeLimit: 30,
  maxTimeLimit: 600,
  defaultTimeLimit: 120,
} as const;

const EMOTION_TYPES = ['sana', 'gestionar'];

const normalizeName = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Devuelve el motivo por el que una configuración de Caja de Emociones no es
 * válida, o `null` si es correcta.
 */
export function getEmotionBoxConfigError(config: any): string | null {
  if (!config || typeof config !== 'object') {
    return 'La Caja de Emociones requiere una configuración (emociones y tiempo límite).';
  }

  const rawEmotions = Array.isArray(config.emotions) ? config.emotions : null;
  if (!rawEmotions) {
    return 'La Caja de Emociones requiere el listado de emociones.';
  }

  const emotions = rawEmotions.map((emotion: any) => ({
    name: normalizeName(emotion?.name),
    type: typeof emotion?.type === 'string' ? emotion.type : '',
  }));

  if (emotions.some((emotion) => emotion.name === '')) {
    return 'Todas las emociones de la Caja de Emociones deben tener nombre.';
  }

  if (emotions.length < EMOTION_BOX_RULES.minEmotions) {
    return `La Caja de Emociones requiere al menos ${EMOTION_BOX_RULES.minEmotions} emociones configuradas.`;
  }

  if (emotions.length > EMOTION_BOX_RULES.maxEmotions) {
    return `La Caja de Emociones admite como máximo ${EMOTION_BOX_RULES.maxEmotions} emociones.`;
  }

  const invalidType = emotions.find(
    (emotion) => !EMOTION_TYPES.includes(emotion.type),
  );
  if (invalidType) {
    return `La emoción "${invalidType.name}" debe clasificarse como "Sana" o "Por Gestionar".`;
  }

  const duplicated = emotions.find(
    (emotion, index) =>
      emotions.findIndex(
        (other) => other.name.toLowerCase() === emotion.name.toLowerCase(),
      ) !== index,
  );
  if (duplicated) {
    return `La emoción "${duplicated.name}" está repetida en la Caja de Emociones.`;
  }

  if (!emotions.some((emotion) => emotion.type === 'sana')) {
    return 'La Caja de Emociones requiere al menos una emoción de tipo "Sana".';
  }

  if (!emotions.some((emotion) => emotion.type === 'gestionar')) {
    return 'La Caja de Emociones requiere al menos una emoción de tipo "Por Gestionar".';
  }

  if (config.timeLimit !== undefined && config.timeLimit !== null) {
    const timeLimit = Number(config.timeLimit);
    if (
      !Number.isInteger(timeLimit) ||
      timeLimit < EMOTION_BOX_RULES.minTimeLimit ||
      timeLimit > EMOTION_BOX_RULES.maxTimeLimit
    ) {
      return `El tiempo límite debe estar entre ${EMOTION_BOX_RULES.minTimeLimit} y ${EMOTION_BOX_RULES.maxTimeLimit} segundos.`;
    }
  }

  return null;
}

/** Valida el rango del tiempo límite (30–600 s) si viene definido. */
function getTimeLimitError(
  timeLimit: any,
  gameLabel: string,
): string | null {
  if (timeLimit === undefined || timeLimit === null) return null;
  const value = Number(timeLimit);
  if (
    !Number.isInteger(value) ||
    value < EMOTION_BOX_RULES.minTimeLimit ||
    value > EMOTION_BOX_RULES.maxTimeLimit
  ) {
    return `El tiempo límite de ${gameLabel} debe estar entre ${EMOTION_BOX_RULES.minTimeLimit} y ${EMOTION_BOX_RULES.maxTimeLimit} segundos.`;
  }
  return null;
}

/** Emparejar conceptos: parejas concepto → definición completas y sin repetir. */
export function getMatchingConceptsConfigError(config: any): string | null {
  if (!config || typeof config !== 'object') {
    return 'Emparejar conceptos requiere una configuración (parejas y tiempo límite).';
  }

  const rawPairs = Array.isArray(config.conceptPairs)
    ? config.conceptPairs
    : null;
  if (!rawPairs) {
    return 'Emparejar conceptos requiere el listado de parejas (concepto → definición).';
  }

  const pairs = rawPairs.map((pair: any) => ({
    concept: normalizeName(pair?.concept),
    match: normalizeName(pair?.match),
  }));

  if (pairs.some((pair) => !pair.concept || !pair.match)) {
    return 'Cada pareja debe tener concepto y definición.';
  }

  if (pairs.length === 0) {
    return 'Emparejar conceptos requiere al menos una pareja configurada.';
  }

  const duplicated = pairs.find(
    (pair, index) =>
      pairs.findIndex(
        (other) => other.concept.toLowerCase() === pair.concept.toLowerCase(),
      ) !== index,
  );
  if (duplicated) {
    return `El concepto "${duplicated.concept}" está repetido en las parejas.`;
  }

  return getTimeLimitError(config.timeLimit, 'Emparejar conceptos');
}

/** Sopa de letras: palabras válidas y cuadrícula dentro de rango. */
export function getWordSearchConfigError(config: any): string | null {
  if (!config || typeof config !== 'object') {
    return 'La sopa de letras requiere una configuración (palabras y tiempo límite).';
  }

  const rawWords = Array.isArray(config.words) ? config.words : null;
  if (!rawWords) {
    return 'La sopa de letras requiere el listado de palabras.';
  }

  const words = rawWords.map((word: any) => normalizeName(word));
  if (words.some((word) => word === '')) {
    return 'Todas las palabras de la sopa de letras deben tener texto.';
  }

  if (words.length === 0) {
    return 'La sopa de letras requiere al menos una palabra configurada.';
  }

  if (words.some((word) => word.length < 3)) {
    return 'Cada palabra de la sopa de letras debe tener al menos 3 letras.';
  }

  if (config.gridSize !== undefined && config.gridSize !== null) {
    const gridSize = Number(config.gridSize);
    if (!Number.isInteger(gridSize) || gridSize < 5 || gridSize > 15) {
      return 'El tamaño de la cuadrícula debe estar entre 5 y 15.';
    }
  }

  return getTimeLimitError(config.timeLimit, 'la sopa de letras');
}

/** Juego de dados: preguntas con valor de dado y respuesta correcta coherente. */
export function getDiceGameConfigError(config: any): string | null {
  if (!config || typeof config !== 'object') {
    return 'El juego de dados requiere una configuración (preguntas).';
  }

  const questions = Array.isArray(config.questions) ? config.questions : null;
  if (!questions) {
    return 'El juego de dados requiere el listado de preguntas.';
  }

  if (questions.length === 0) {
    return 'El juego de dados requiere al menos una pregunta configurada.';
  }

  for (let i = 0; i < questions.length; i++) {
    const question: any = questions[i];
    const number = i + 1;

    if (!normalizeName(question?.questionText)) {
      return `La pregunta #${number} del juego de dados no tiene texto.`;
    }

    const diceValue = Number(question?.diceValue);
    if (!Number.isInteger(diceValue) || diceValue < 1 || diceValue > 6) {
      return `La pregunta #${number} debe tener un valor de dado entre 1 y 6.`;
    }

    if (question?.type === 'multiple') {
      const options = (Array.isArray(question.options) ? question.options : [])
        .map((option: any) => normalizeName(option))
        .filter((option) => option !== '');

      if (options.length < 2) {
        return `La pregunta #${number} necesita al menos 2 opciones.`;
      }

      const correct = normalizeName(question?.correctAnswer);
      if (!correct || !options.includes(correct)) {
        return `La pregunta #${number} necesita una respuesta correcta entre sus opciones.`;
      }
    }
  }

  return null;
}

/** Reglas por tipo de juego. Devuelve el motivo del rechazo o `null`. */
export function getGameConfigError(
  type: string,
  config: any,
): string | null {
  switch (type) {
    case 'EmotionBox':
      return getEmotionBoxConfigError(config);
    case 'MatchingConcepts':
      return getMatchingConceptsConfigError(config);
    case 'WordSearch':
      return getWordSearchConfigError(config);
    case 'DiceGame':
      return getDiceGameConfigError(config);
    default:
      return null;
  }
}

/**
 * Valida la configuración del juego según su tipo.
 * Sólo se permiten juegos con una configuración que la app mobile pueda jugar.
 */
@ValidatorConstraint({ name: 'isValidGameConfig', async: false })
export class IsValidGameConfig implements ValidatorConstraintInterface {
  validate(config: any, args: ValidationArguments): boolean {
    const game = args.object as GameDto;
    if (!game?.type) return true;
    // Si `config` no es un objeto lo reporta @IsObject(); aquí sólo validamos
    // las reglas de negocio de cada juego.
    if (!config || typeof config !== 'object') return true;
    return getGameConfigError(game.type, config) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    const game = args.object as GameDto;
    return (
      getGameConfigError(game?.type, args.value) ??
      'La configuración del juego no es válida.'
    );
  }
}

export class GameDto {
  @ApiProperty({
    description: 'Tipo de juego de la actividad.',
    enum: GAME_TYPES,
    example: 'EmotionBox',
  })
  @IsIn([...GAME_TYPES])
  type: GameType;

  @ApiProperty({
    description:
      'Configuración específica del juego. Para `EmotionBox`: `emotions` (mínimo 2, una de cada tipo), `timeLimit` (30-600 s) y `showInstructions`.',
    example: {
      emotions: [
        { id: 'e1', name: 'alegría', type: 'sana' },
        { id: 'e2', name: 'enojo', type: 'gestionar' },
      ],
      timeLimit: 120,
      showInstructions: true,
    },
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @Validate(IsValidGameConfig)
  config: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Orden del juego dentro de la actividad.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
