import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { pt } from './pt';
import { tr } from './tr';
import type { LanguageCode, TranslationMap } from './types';

export const TRANSLATIONS: Record<LanguageCode, TranslationMap> = {
  en,
  tr,
  de,
  es,
  fr,
  pt,
};

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};

export const LANGUAGES: LanguageCode[] = ['en', 'tr', 'de', 'es', 'fr', 'pt'];
