import React, { useState, ChangeEvent, useMemo, useRef } from 'react';
import { ImageStudioSubTab } from '../types.ts';
import { getAspectRatios } from '../constants.ts';
import { analyzeImageForMetadata, generateImage, generateImages, upscaleImage, enhancePrompt } from '../services/geminiService.ts';
import CopyButton from './CopyButton.tsx';
import DownloadButton from './DownloadButton.tsx';
import { useTranslations, useApiKey } from '../contexts/LanguageContext.tsx';

interface ImageStudioProps {
}

interface GenerationResult {
    prompt: string;
    images: string[];
}

const SparklesIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${className}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.23l4.484 1.121a1 1 0 01.54 1.77l-3.243 3.16.766 4.464a1 1 0 01-1.451 1.054L10 15.547l-4.015 2.11a1 1 0 01-1.451-1.054l.766-4.464-3.243-3.16a1 1 0 01.54-1.77l4.484-1.121L9.033 2.744A1 1 0 0110 2h2z" clipRule="evenodd" />
    </svg>
);

const ImageStudio: React.FC<ImageStudioProps> = () => {
    const { t, language } = useTranslations();
    const { apiKey } = useApiKey();
    const [activeSubTab, setActiveSubTab] = useState<ImageStudioSubTab>(ImageStudioSubTab.GENERATE);
    const subTabs = Object.values(ImageStudioSubTab);

    const ASPECT_RATIOS = useMemo(() => getAspectRatios(t), [t]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    
    // Generate State
    const [promptSource, setPromptSource] = useState<'manual' | 'batch'>('manual');
    const [manualPrompt, setManualPrompt] = useState<string>('An epic fantasy landscape with a dragon flying over a castle, digital art.');
    const [batchPrompts, setBatchPrompts] = useState<string[]>([]);
    const [promptsFileInfo, setPromptsFileInfo] = useState<{ name: string; count: number } | null>(null);
    const promptsFileRef = useRef<HTMLInputElement | null>(null);
    const [genAspectRatio, setGenAspectRatio] = useState<string>('16:9');
    const [isTransparent, setIsTransparent] = useState(false);
    const [isHighQuality, setIsHighQuality] = useState(true);
    const [numResults, setNumResults] = useState(1);
    const [generationResults, setGenerationResults] = useState<GenerationResult[]>([]);
    const [enhanceFormat, setEnhanceFormat] = useState<'normal' | 'json'>('normal');

    // Analyze State
    const [analyzeFile, setAnalyzeFile] = useState<File | null>(null);
    const [analyzePreview, setAnalyzePreview] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);

    // Upscale State
    const [upscaleFile, setUpscaleFile] = useState<File | null>(null);
    const [upscalePreview, setUpscalePreview] = useState<string | null>(null);
    const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
    const [upscaleAspectRatio, setUpscaleAspectRatio] = useState<string>('1:1');
    const [upscaleMegapixels, setUpscaleMegapixels] = useState<number>(15);

    // Microstock State
    const [microstockPrompt, setMicrostockPrompt] = useState<string>('A high-detail photograph of a fresh salad in a white bowl, on a rustic wooden table, natural light from a window, healthy eating concept.');
    const [microstockAspectRatio, setMicrostockAspectRatio] = useState<string>('16:9');
    const [microstockResolution, setMicrostockResolution] = useState<'standard' | '2k' | '4k' | '8k'>('4k');
    const [microstockResult, setMicrostockResult] = useState<{ imageUrl: string; metadata: string; } | null>(null);
    const [isGeneratingMicrostock, setIsGeneratingMicrostock] = useState(false);


    const handleFileChange = (e: ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void, setPreview: (url: string | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handlePromptsFileLoad = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                setBatchPrompts(lines);
                setPromptsFileInfo({ name: file.name, count: lines.length });
            };
            reader.readAsText(file);
        }
        event.target.value = '';
    };

    const handleEnhancePrompt = async () => {
        if (!manualPrompt) {
            alert(t('alerts.promptMissing'));
            return;
        }
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePrompt(apiKey, manualPrompt, language, enhanceFormat);
            setManualPrompt(enhanced);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsEnhancing(false);
        }
    };
    
    const handleGenerateImages = async () => {
        const promptsToRun = (promptSource === 'batch' ? batchPrompts : [manualPrompt]).filter(p => p.trim());

        if (promptsToRun.length === 0) {
            alert(t('alerts.promptMissing'));
            return;
        }

        setIsLoading(true);
        setGenerationResults([]);
        
        try {
            let allResults: GenerationResult[] = [];
            for (const prompt of promptsToRun) {
                const imageUrls = await generateImages(apiKey, prompt, genAspectRatio, numResults, isTransparent, isHighQuality);
                allResults.push({ prompt, images: imageUrls });
            }
            setGenerationResults(allResults);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyzeImage = async () => {
        if (!analyzeFile) {
            alert(t('alerts.imageMissing'));
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const result = await analyzeImageForMetadata(apiKey, analyzeFile);
            setAnalysisResult(JSON.stringify(JSON.parse(result), null, 2));
        } catch (error) {
             alert((error as Error).message);
             setAnalysisResult(t('alerts.imageAnalyzeError'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUpscaleImage = async () => {
        if (!upscaleFile) {
            alert(t('alerts.imageMissingUpscale'));
            return;
        }
        setIsLoading(true);
        setUpscaledImage(null);
        try {
            const result = await upscaleImage(apiKey, upscaleFile, upscaleAspectRatio, upscaleMegapixels);
            setUpscaledImage(result);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateMicrostockImage = async () => {
        if (!microstockPrompt) {
            alert(t('alerts.promptMissing'));
            return;
        }
        setIsGeneratingMicrostock(true);
        setMicrostockResult(null);
        try {
            // Step 1: Generate the image (always high quality for microstock)
            const imageUrl = await generateImage(apiKey, microstockPrompt, microstockAspectRatio, false, false, microstockResolution);
            
            // Step 2: Convert the blob URL back to a File to be analyzed
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const imageFile = new File([blob], "microstock_image.jpeg", { type: blob.type });

            // Step 3: Analyze the generated image for metadata
            const metadataJson = await analyzeImageForMetadata(apiKey, imageFile);
            const formattedMetadata = JSON.stringify(JSON.parse(metadataJson), null, 2);

            // Step 4: Set results
            setMicrostockResult({ imageUrl, metadata: formattedMetadata });

        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsGeneratingMicrostock(false);
        }
    };
    
    const microstockResolutions = [
        { value: 'standard', label: t('imageStudio.microstock.resolutions.standard') },
        { value: '2k', label: t('imageStudio.microstock.resolutions.twoK') },
        { value: '4k', label: t('imageStudio.microstock.resolutions.fourK') },
        { value: '8k', label: t('imageStudio.microstock.resolutions.eightK') },
    ];

    const renderSubTabContent = () => {
        switch(activeSubTab) {
            case ImageStudioSubTab.GENERATE:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                             <input type="file" ref={promptsFileRef} onChange={handlePromptsFileLoad} className="hidden" accept=".txt" />
                            <h3 className="text-xl font-semibold text-secondary">{t('imageStudio.generate.title')}</h3>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('imageStudio.generate.sourceTitle')}</label>
                                <div className="flex border-b border-border mt-1">
                                    <button onClick={() => setPromptSource('manual')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${promptSource === 'manual' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('imageStudio.generate.manual')}</button>
                                    <button onClick={() => setPromptSource('batch')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${promptSource === 'batch' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('imageStudio.generate.batch')}</button>
                                </div>
                            </div>
                            {promptSource === 'manual' ? (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-text-secondary">{t('imageStudio.generate.prompt')}</label>
                                    <div className="relative">
                                        <textarea value={manualPrompt} onChange={e => setManualPrompt(e.target.value)} rows={4} className="w-full bg-background border border-border rounded-md p-2 pr-32" disabled={isLoading || isEnhancing} />
                                        <div className="absolute top-2 right-2">
                                            <button 
                                                onClick={handleEnhancePrompt} 
                                                disabled={isLoading || isEnhancing || !manualPrompt}
                                                className="flex items-center space-x-1.5 bg-secondary/20 hover:bg-secondary/30 border border-secondary/50 text-secondary font-semibold py-1 px-3 rounded-full text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface disabled:border-border disabled:text-text-secondary"
                                            >
                                                <SparklesIcon />
                                                <span>{isEnhancing ? t('generator.prompt.enhancing') : 'AI Enhancer'}</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mt-2">{t('enhancer.format')}</label>
                                        <div className="flex border-b border-border mt-1">
                                            <button onClick={() => setEnhanceFormat('normal')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${enhanceFormat === 'normal' ? 'border-secondary text-secondary' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('enhancer.normal')}</button>
                                            <button onClick={() => setEnhanceFormat('json')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${enhanceFormat === 'json' ? 'border-secondary text-secondary' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('enhancer.json')}</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                     <button className="w-full bg-surface hover:bg-border border border-border text-text-main font-bold py-2.5 px-4 rounded-lg transition-colors" onClick={() => promptsFileRef.current?.click()}>{t('imageStudio.generate.loadPrompts')}</button>
                                     {promptsFileInfo && <p className="text-xs text-text-secondary text-center">{t('generator.prompt.promptsLoadedInfo', {fileName: promptsFileInfo.name, count: promptsFileInfo.count})}</p>}
                                </div>
                            )}

                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary">{t('imageStudio.generate.aspectRatio')}</label>
                                    <select value={genAspectRatio} onChange={e => setGenAspectRatio(e.target.value)} className="mt-1 w-full bg-background border border-border rounded-md p-2">
                                        {ASPECT_RATIOS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary">{t('imageStudio.generate.numResults')}</label>
                                    <input type="number" min="1" max="100" value={numResults} onChange={e => setNumResults(parseInt(e.target.value, 10))} className="mt-1 w-full bg-background border border-border rounded-md p-2"/>
                                </div>
                            </div>

                             <div className="space-y-2 text-text-secondary">
                                <label className="flex items-center"><input type="checkbox" checked={isTransparent} onChange={e => setIsTransparent(e.target.checked)} className="mr-2 h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"/>{t('imageStudio.generate.transparent')}</label>
                                <label className="flex items-center"><input type="checkbox" checked={isHighQuality} onChange={e => setIsHighQuality(e.target.checked)} className="mr-2 h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"/>{t('imageStudio.generate.hq')}</label>
                            </div>
                           
                            <button onClick={handleGenerateImages} disabled={isLoading || isEnhancing} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-lg disabled:opacity-50 transition-opacity">
                                {isLoading ? t('imageStudio.generate.generating') : t('imageStudio.generate.generateButton')}
                            </button>
                        </div>
                        <div className="bg-background rounded-lg flex items-center justify-center min-h-[300px] border border-border p-2">
                            {isLoading && <div className="text-text-secondary">{t('imageStudio.generate.generating')}</div>}
                            {!isLoading && generationResults.length === 0 && <div className="text-text-secondary">{t('imageStudio.imagePreview')}</div>}
                            {generationResults.length > 0 && (
                                <div className="w-full h-full max-h-[500px] overflow-y-auto space-y-4">
                                    {generationResults.map((result, i) => (
                                        <div key={i}>
                                            <p className="text-xs text-text-secondary truncate mb-1" title={result.prompt}>{result.prompt}</p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                {result.images.map((url, j) => (
                                                    <div key={j} className="relative aspect-square bg-border rounded-md group">
                                                        <img src={url} alt={`Generated for ${result.prompt}`} className="w-full h-full object-contain rounded-md" />
                                                        <DownloadButton mediaUrl={url} mediaType="image" className="top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case ImageStudioSubTab.ANALYZE:
                 return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-secondary">{t('imageStudio.analyze.title')}</h3>
                            <p className="text-text-secondary">{t('imageStudio.analyze.description')}</p>
                             <input id="analyze-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAnalyzeFile, setAnalyzePreview)} className="hidden"/>
                            <label htmlFor="analyze-upload" className="cursor-pointer w-full inline-block bg-surface hover:bg-border border border-border text-text-main text-center font-bold py-2.5 px-4 rounded-lg transition-colors">{t('imageStudio.analyze.chooseButton')}</label>
                            <button onClick={handleAnalyzeImage} disabled={isLoading || !analyzeFile} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-lg disabled:opacity-50 disabled:from-surface disabled:to-surface disabled:text-text-secondary transition-opacity">
                                {isLoading ? t('imageStudio.analyze.analyzing') : t('imageStudio.analyze.analyzeButton')}
                            </button>
                             {analysisResult && (
                                <div>
                                    <h4 className="font-semibold mb-2 text-secondary">{t('imageStudio.analyze.resultTitle')}:</h4>
                                    <div className="relative">
                                        <pre className="bg-background p-3 rounded-md text-sm whitespace-pre-wrap border border-border">{analysisResult}</pre>
                                        <CopyButton textToCopy={analysisResult} />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-background rounded-lg flex items-center justify-center min-h-[300px] border border-border">
                             {analyzePreview && <img src={analyzePreview} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" />}
                             {!analyzePreview && <div className="text-text-secondary">{t('imageStudio.imagePreview')}</div>}
                        </div>
                    </div>
                );
            case ImageStudioSubTab.UPSCALE:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-secondary">{t('imageStudio.upscale.title')}</h3>
                            <p className="text-text-secondary">{t('imageStudio.upscale.description')}</p>
                            <input id="upscale-upload" type="file" accept="image/*" onChange={(e) => {
                                handleFileChange(e, setUpscaleFile, setUpscalePreview);
                                setUpscaledImage(null);
                            }} className="hidden"/>
                            <label htmlFor="upscale-upload" className="cursor-pointer w-full inline-block bg-surface hover:bg-border border border-border text-text-main text-center font-bold py-2.5 px-4 rounded-lg transition-colors">{t('imageStudio.upscale.chooseButton')}</label>
                             
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('imageStudio.upscale.aspectRatio')}</label>
                                <select value={upscaleAspectRatio} onChange={e => setUpscaleAspectRatio(e.target.value)} disabled={isLoading} className="mt-1 w-full bg-background border border-border rounded-md p-2">
                                    {ASPECT_RATIOS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('imageStudio.upscale.resolution')} ({upscaleMegapixels}MP)</label>
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="20" 
                                    value={upscaleMegapixels}
                                    onChange={e => setUpscaleMegapixels(Number(e.target.value))}
                                    disabled={isLoading}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            {upscalePreview && (
                                <div className="bg-background rounded-lg flex items-center justify-center min-h-[200px] border border-border">
                                     <img src={upscalePreview} alt="To Upscale" className="max-h-48 max-w-full object-contain rounded-md" />
                                </div>
                            )}
                            
                            <button onClick={handleUpscaleImage} disabled={isLoading || !upscaleFile} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-lg disabled:opacity-50 disabled:from-surface disabled:to-surface disabled:text-text-secondary transition-opacity">
                               {isLoading ? t('imageStudio.upscale.upscaling') : t('imageStudio.upscale.upscaleButton')}
                            </button>
                        </div>
                        <div className="relative bg-background rounded-lg flex items-center justify-center min-h-[300px] border border-border">
                            {isLoading && <div className="text-text-secondary">{t('imageStudio.upscale.upscaling')}...</div>}
                            {upscaledImage && <img src={upscaledImage} alt="Upscaled result" className="max-h-full max-w-full object-contain rounded-md" />}
                            {!isLoading && !upscaledImage && <div className="text-text-secondary">{t('imageStudio.upscale.resultPlaceholder')}</div>}
                            {upscaledImage && <DownloadButton mediaUrl={upscaledImage} mediaType="image" className="top-2 right-2 z-10" />}
                        </div>
                    </div>
                );
            case ImageStudioSubTab.MICROSTOCK:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-secondary">{t('imageStudio.microstock.title')}</h3>
                            <p className="text-text-secondary">{t('imageStudio.microstock.description')}</p>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('imageStudio.microstock.promptLabel')}</label>
                                <textarea
                                    value={microstockPrompt}
                                    onChange={e => setMicrostockPrompt(e.target.value)}
                                    rows={4}
                                    className="mt-1 w-full bg-background border border-border rounded-md p-2"
                                    disabled={isGeneratingMicrostock}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary">{t('imageStudio.generate.aspectRatio')}</label>
                                    <select value={microstockAspectRatio} onChange={e => setMicrostockAspectRatio(e.target.value)} disabled={isGeneratingMicrostock} className="mt-1 w-full bg-background border border-border rounded-md p-2">
                                        {ASPECT_RATIOS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary">{t('imageStudio.microstock.resolution')}</label>
                                    <select value={microstockResolution} onChange={e => setMicrostockResolution(e.target.value as any)} disabled={isGeneratingMicrostock} className="mt-1 w-full bg-background border border-border rounded-md p-2">
                                        {microstockResolutions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleGenerateMicrostockImage} disabled={isGeneratingMicrostock} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-lg disabled:opacity-50 transition-opacity">
                                {isGeneratingMicrostock ? t('imageStudio.microstock.generatingButton') : t('imageStudio.microstock.generateButton')}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-background rounded-lg flex items-center justify-center min-h-[300px] border border-border p-2 relative">
                                {isGeneratingMicrostock && !microstockResult && <div className="text-text-secondary">{t('imageStudio.microstock.generatingButton')}</div>}
                                {!isGeneratingMicrostock && !microstockResult && <div className="text-text-secondary">{t('imageStudio.microstock.imagePlaceholder')}</div>}
                                {microstockResult?.imageUrl && (
                                    <>
                                        <img src={microstockResult.imageUrl} alt="Generated microstock image" className="max-h-full max-w-full object-contain rounded-md" />
                                        <DownloadButton mediaUrl={microstockResult.imageUrl} mediaType="image" className="top-2 right-2 z-10" />
                                    </>
                                )}
                            </div>
                            <div className="bg-background rounded-lg p-3 border border-border min-h-[150px] relative">
                                <h4 className="font-semibold mb-2 text-secondary">{t('imageStudio.microstock.metadataTitle')}</h4>
                                {isGeneratingMicrostock && !microstockResult?.metadata && <div className="text-text-secondary text-sm animate-pulse">{t('imageStudio.microstock.generatingButton')}</div>}
                                {microstockResult?.metadata ? (
                                    <>
                                        <pre className="text-sm whitespace-pre-wrap">{microstockResult.metadata}</pre>
                                        <CopyButton textToCopy={microstockResult.metadata} />
                                    </>
                                ) : (
                                    !isGeneratingMicrostock && <p className="text-sm text-text-secondary">{t('imageStudio.microstock.metadataPlaceholder')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="bg-surface p-6 rounded-lg shadow-lg border border-border">
            <div className="flex border-b border-border mb-6">
                {subTabs.map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveSubTab(tab)}
                        className={`py-2 px-4 font-medium text-sm sm:text-base -mb-px border-b-2 transition-colors duration-200 ${
                            activeSubTab === tab 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-text-secondary hover:text-text-main'
                        }`}
                    >
                        {t(`imageStudio.tabs.${tab}`)}
                    </button>
                ))}
            </div>
            {renderSubTabContent()}
        </div>
    );
};

export default ImageStudio;