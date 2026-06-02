import { useSelector } from 'react-redux';
import { translations, type TranslationKey } from '../i18n/translations';

export const useTranslation = () => {
  const lang = (useSelector((state: any) => state.lang.lang) ?? 'en') as 'en' | 'fr';
  const t = (key: TranslationKey): string => {
    return translations[lang]?.[key] || translations.en[key] || key;
  };

  return { t, lang };
};
