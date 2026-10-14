import { describe, it, expect } from 'vitest';
import { I18nManager, TRANSLATIONS, TranslationKey } from '../../src/i18n';

describe('Localization System (i18n)', () => {
  const locales = ['en', 'tr', 'el'] as const;

  it('guarantees complete translation key parity across EN, TR, and EL', () => {
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    const trKeys = Object.keys(TRANSLATIONS.tr).sort();
    const elKeys = Object.keys(TRANSLATIONS.el).sort();

    // Check that every single English key is translated in Turkish and Greek
    const missingInTr = enKeys.filter((k) => !(k in TRANSLATIONS.tr));
    const missingInEl = enKeys.filter((k) => !(k in TRANSLATIONS.el));

    expect(missingInTr, `Missing Turkish keys: ${missingInTr.join(', ')}`).toEqual([]);
    expect(missingInEl, `Missing Greek keys: ${missingInEl.join(', ')}`).toEqual([]);

    expect(trKeys.length).toBe(enKeys.length);
    expect(elKeys.length).toBe(enKeys.length);
  });

  it('verifies non-empty translations for all player-facing keys in all 3 languages', () => {
    for (const loc of locales) {
      const dict = TRANSLATIONS[loc];
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, `Locale ${loc} key ${key} must be a string`).toBe('string');
        expect(value.trim().length, `Locale ${loc} key ${key} must not be empty`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it('verifies correct Turkish special characters in Turkish dictionary', () => {
    const trText = JSON.stringify(TRANSLATIONS.tr);
    // Check Turkish specific characters: ç, ğ, ı, ö, ş, ü, İ
    expect(trText).toMatch(/[çğışöüÇĞİŞÖÜ]/);

    const i18nTr = new I18nManager('tr');
    expect(i18nTr.t('hud.score')).toBe('SKOR');
    expect(i18nTr.t('hud.target')).toBe('HEDEF');
    expect(i18nTr.t('settings.title')).toBe('AYARLAR');
    expect(i18nTr.t('settings.reducedMotion')).toBe('Hareketi Azalt');
  });

  it('verifies correct Greek script rendering in Greek dictionary', () => {
    const elText = JSON.stringify(TRANSLATIONS.el);
    // Check Greek specific unicode characters
    expect(elText).toMatch(/[\u0370-\u03FF]/);

    const i18nEl = new I18nManager('el');
    expect(i18nEl.t('hud.score')).toBe('ΣΚΟΡ');
    expect(i18nEl.t('hud.target')).toBe('ΣΤΟΧΟΣ');
    expect(i18nEl.t('settings.title')).toBe('ΡΥΘΜΙΣΕΙΣ');
    expect(i18nEl.t('settings.reducedMotion')).toBe('Μειωμένη Κίνηση');
  });

  it('provides safe fallback behavior when missing or unsupported keys/locales are requested', () => {
    const i18n = new I18nManager('en');
    // Non-existent key falls back to returning the key string itself
    const fallback = i18n.t('non.existent.key' as TranslationKey);
    expect(fallback).toBe('non.existent.key');

    // Setting locale dynamically switches active dictionary
    i18n.setLocale('el');
    expect(i18n.getLocale()).toBe('el');
    expect(i18n.t('tutorial.title')).toBe('ΠΩΣ ΝΑ ΠΑΙΞΕΤΕ');
  });
});
