import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div style={{ fontSize: 96, fontWeight: 800, color: '#1A56DB' }}>404</div>
        <h2 className="text-2xl font-semibold mt-2">{t('pageNotFound') || 'Page Not Found'}</h2>
        <p className="text-sm text-secondary mt-3">{t('pageNotFoundMessage') || 'The page you are looking for does not exist.'}</p>
        <div className="mt-6">
          <Link to="/" className="px-6 py-3 bg-primary text-white rounded-lg">{t('backToDashboard') || 'Back to Dashboard'}</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
