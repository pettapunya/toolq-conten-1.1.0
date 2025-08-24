import React, { useState, useCallback } from 'react';
import { Tab } from './types.ts';
import Header from './components/Header.tsx';
import Generator from './components/Generator.tsx';
import ImageStudio from './components/ImageStudio.tsx';
import PromptHelper from './components/PromptHelper.tsx';
import StoryboardGenerator from './components/StoryboardGenerator.tsx';
import AffiliateContentScriptGenerator from './components/AffiliateContentScriptGenerator.tsx';
import ChatGPT from './components/ChatGPT.tsx';
import { useTranslations } from './contexts/LanguageContext.tsx';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.GENERATOR);
  const { language } = useTranslations(); // For re-rendering on language change

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case Tab.IMAGE_STUDIO:
        return <ImageStudio />;
      case Tab.PROMPT_HELPER:
        return <PromptHelper />;
      case Tab.FILMMAKER:
        return <StoryboardGenerator />;
      case Tab.AFFILIATE_SCRIPT_GENERATOR:
        return <AffiliateContentScriptGenerator />;
      case Tab.CHATGPT:
        return <ChatGPT />;
      case Tab.GENERATOR:
      default:
        return <Generator />;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background text-text-main font-sans flex flex-col">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      <main className="p-4 sm:p-6 lg:p-8 flex-grow">
        <div className="mb-8">
            <div className="tc-cta">
              <a className="tc-btn tc-primary" href="https://wa.me/6281244442114?text=Halo%2C%20saya%20ingin%20membeli%20Toolq%20Conten" target="_blank" rel="noopener">Beli via WhatsApp</a>
              <a className="tc-btn tc-ghost" href="https://lynk.id/ftypunya" target="_blank" rel="noopener">Beli via Lynk.id</a>
              <a className="tc-btn tc-wa" href="https://wa.me/6281244442114" target="_blank" rel="noopener">Chat WhatsApp</a>
            </div>
        </div>
        {renderContent()}
      </main>
      <footer className="text-center p-4 text-xs text-text-secondary">
        <a href="https://wa.me/6281244442114" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">
          wa.me/6281244442114
        </a>
      </footer>
    </div>
  );
};

export default App;