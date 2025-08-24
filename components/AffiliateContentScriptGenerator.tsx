import React, { useState, useMemo } from 'react';
import { useTranslations, useApiKey } from '../contexts/LanguageContext.tsx';
import { generateAffiliateScript } from '../services/geminiService.ts';

interface AffiliateContentScriptGeneratorProps {
}

const AffiliateContentScriptGenerator: React.FC<AffiliateContentScriptGeneratorProps> = () => {
    const { t } = useTranslations();
    const { apiKey } = useApiKey();

    const [productLink, setProductLink] = useState('https://www.tokopedia.com/contoh/produk-keren');
    const [languageStyle, setLanguageStyle] = useState('persuasive');
    const [writingLength, setWritingLength] = useState('short');
    const [numVariations, setNumVariations] = useState(1);
    const [scriptResult, setScriptResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const languageStyles = useMemo(() => [
        { value: 'persuasive', label: t('affiliateScriptGenerator.styles.persuasive') },
        { value: 'casual', label: t('affiliateScriptGenerator.styles.casual') },
        { value: 'formal', label: t('affiliateScriptGenerator.styles.formal') },
        { value: 'enthusiastic', label: t('affiliateScriptGenerator.styles.enthusiastic') },
    ], [t]);

    const writingLengths = useMemo(() => [
        { value: 'short', label: t('affiliateScriptGenerator.lengths.short') },
        { value: 'medium', label: t('affiliateScriptGenerator.lengths.medium') },
        { value: 'long', label: t('affiliateScriptGenerator.lengths.long') },
    ], [t]);
    
    const variationOptions = [1, 2, 3];

    const handleCreateScript = async () => {
        if (!productLink) {
            alert('Please provide a product link.');
            return;
        }
        setIsLoading(true);
        setScriptResult('');
        try {
            const result = await generateAffiliateScript(apiKey, productLink, languageStyle, writingLength, numVariations);
            setScriptResult(result);
        } catch (error) {
            const errorMessage = (error as Error).message;
            setScriptResult(`Error: ${errorMessage}`);
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const gridStyle = {
        backgroundImage: 'linear-gradient(rgba(50, 150, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 150, 255, 0.1) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
    };

    return (
        <div style={gridStyle} className="p-4 sm:p-0 lg:p-0 rounded-lg -m-4 sm:-m-6 lg:-m-8">
            <div className="max-w-7xl mx-auto backdrop-blur-sm p-4 sm:p-6 lg:p-8">
                <header className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-brand-green tracking-wide">{t('affiliateScriptGenerator.title')}</h1>
                    <p className="mt-2 text-lg text-text-secondary">{t('affiliateScriptGenerator.description')}</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Settings Form */}
                    <div className="bg-surface/50 border border-border rounded-lg p-6 space-y-6">
                        <h2 className="text-2xl font-semibold text-text-main">{t('affiliateScriptGenerator.settings.title')}</h2>
                        
                        <div>
                            <label htmlFor="product-link" className="block text-sm font-medium text-text-secondary mb-1">{t('affiliateScriptGenerator.settings.productLink')}</label>
                            <input
                                id="product-link"
                                type="url"
                                value={productLink}
                                onChange={(e) => setProductLink(e.target.value)}
                                placeholder={t('affiliateScriptGenerator.settings.productLinkPlaceholder')}
                                className="w-full bg-background border border-border rounded-md py-2 px-3 text-text-main placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-green"
                            />
                        </div>

                        <div>
                            <label htmlFor="language-style" className="block text-sm font-medium text-text-secondary mb-1">{t('affiliateScriptGenerator.settings.languageStyle')}</label>
                            <select
                                id="language-style"
                                value={languageStyle}
                                onChange={(e) => setLanguageStyle(e.target.value)}
                                className="w-full bg-background border border-border rounded-md py-2 px-3 text-text-main focus:outline-none focus:ring-2 focus:ring-brand-green"
                            >
                                {languageStyles.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="writing-length" className="block text-sm font-medium text-text-secondary mb-1">{t('affiliateScriptGenerator.settings.writingLength')}</label>
                            <select
                                id="writing-length"
                                value={writingLength}
                                onChange={(e) => setWritingLength(e.target.value)}
                                className="w-full bg-background border border-border rounded-md py-2 px-3 text-text-main focus:outline-none focus:ring-2 focus:ring-brand-green"
                            >
                                {writingLengths.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="variations" className="block text-sm font-medium text-text-secondary mb-1">{t('affiliateScriptGenerator.settings.variations')}</label>
                             <select
                                id="variations"
                                value={numVariations}
                                onChange={(e) => setNumVariations(Number(e.target.value))}
                                className="w-full bg-background border border-border rounded-md py-2 px-3 text-text-main focus:outline-none focus:ring-2 focus:ring-brand-green"
                            >
                                {variationOptions.map(num => <option key={num} value={num}>{num}</option>)}
                            </select>
                        </div>

                        <button
                            onClick={handleCreateScript}
                            disabled={isLoading}
                            className="w-full bg-brand-green hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? t('affiliateScriptGenerator.settings.creatingButton') : t('affiliateScriptGenerator.settings.createButton')}
                        </button>
                    </div>

                    {/* Script Result */}
                    <div className="bg-surface/50 border border-border rounded-lg p-6 flex flex-col">
                        <h2 className="text-2xl font-semibold text-text-main mb-4">{t('affiliateScriptGenerator.results.title')}</h2>
                        <div className="bg-background rounded-md flex-grow p-4 min-h-[300px] overflow-y-auto">
                            {isLoading ? (
                                <p className="text-text-secondary text-center animate-pulse">{t('affiliateScriptGenerator.results.loading')}</p>
                            ) : scriptResult ? (
                                <pre className="whitespace-pre-wrap text-text-main font-sans">{scriptResult}</pre>
                            ) : (
                                <p className="text-text-secondary">{t('affiliateScriptGenerator.results.placeholder')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AffiliateContentScriptGenerator;