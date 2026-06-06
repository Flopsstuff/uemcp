import { normalizeName } from '../../utils/type-coercion.js';

export const normalizeLightName = (value: unknown, defaultName?: string): string =>
  normalizeName(value, defaultName, 'Light');
