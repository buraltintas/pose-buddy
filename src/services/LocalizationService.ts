import { LANGUAGES, TRANSLATIONS } from '../i18n';
import type { LanguageCode, TranslationKey } from '../i18n/types';
import { ProgressService } from './ProgressService';

export class LocalizationService {
  private language: LanguageCode;
  private readonly progress: ProgressService;

  constructor(progress: ProgressService) {
    this.progress = progress;
    this.language = progress.getLanguage();
  }

  public getLanguage(): LanguageCode {
    return this.language;
  }

  public getLanguages(): LanguageCode[] {
    return [...LANGUAGES];
  }

  public setLanguage(language: LanguageCode): void {
    if (!LANGUAGES.includes(language)) {
      return;
    }

    this.language = language;
    this.progress.setLanguage(language);
  }

  public t(
    key: TranslationKey,
    params: Record<string, string | number> = {},
  ): string {
    const langMap = TRANSLATIONS[this.language];
    const template = langMap[key] ?? TRANSLATIONS.en[key];

    return Object.entries(params).reduce((acc, [paramKey, value]) => {
      return acc.replaceAll(`{${paramKey}}`, String(value));
    }, template);
  }
}
