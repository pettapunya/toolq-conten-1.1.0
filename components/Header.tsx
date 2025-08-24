import React from 'react';
import { Tab } from '../types.ts';
import { useTranslations, useApiKey } from '../contexts/LanguageContext.tsx';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const tabs = Object.values(Tab);
  const { language, setLanguage, t } = useTranslations();
  const { apiKey, setApiKey } = useApiKey();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:p-0">
         <div className="flex flex-col sm:flex-row items-center justify-between py-4">
          <div className="text-center sm:text-left mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary">
              Toolq Conten
            </h1>
            <a href="https://wa.me/6281244442114" target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary hover:text-secondary transition-colors">
              wa.me/6281244442114
            </a>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('header.googleApiKeyPlaceholder')}
              className="w-48 sm:w-64 bg-surface border border-border rounded-full py-1.5 px-4 text-xs text-text-main placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
             <button
              id="buyBtn"
              className="bg-gradient-to-r from-primary to-accent text-white font-bold py-2 px-4 rounded-full text-sm transition-transform hover:scale-105"
            >
              {t('header.buyButton')}
            </button>
            <nav className="flex space-x-2 sm:space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-3 py-2 text-sm sm:text-base font-medium rounded-md transition-colors duration-300 ${
                    activeTab === tab
                      ? 'text-text-main'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  {t(`tabs.${tab}`)}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full"></span>
                  )}
                </button>
              ))}
            </nav>
            <div className="flex items-center bg-surface rounded-full border border-border p-1">
                <button onClick={() => setLanguage('id')} className={`px-3 py-1 text-xs rounded-full ${language === 'id' ? 'bg-primary text-white' : 'text-text-secondary'}`}>ID</button>
                <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-xs rounded-full ${language === 'en' ? 'bg-primary text-white' : 'text-text-secondary'}`}>EN</button>
            </div>
          </div>
        </div>
      </div>
       <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
    </header>
  );
};

export default Header;