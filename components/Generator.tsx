import React, { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import { getGeneratorModels, getAspectRatios, getVideoQualities, getStyles, getResolutions } from '../constants.ts';
import { enhancePrompt, generateImage, generateVideo as generateVideoV2 } from '../services/geminiService.ts';
import { generateVideoV3 } from '../services/veo3Service.ts';
import CopyButton from './CopyButton.tsx';
import DownloadButton from './DownloadButton.tsx';
import { useTranslations, useApiKey } from '../contexts/LanguageContext.tsx';
import { Resolution, VideoGenerationOptions } from '../types.ts';

interface GeneratorProps {
}

interface GenerationResult {
    id: number;
    url: string;
    type: 'image' | 'video' | null;
    prompt: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    error?: string;
}

const SparklesIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${className}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.23l4.484 1.121a1 1 0 01.54 1.77l-3.243 3.16.766 4.464a1 1 0 01-1.451 1.054L10 15.547l-4.015 2.11a1 1 0 01-1.451-1.054l.766-4.464-3.243-3.16a1 1 0 01.54-1.77l4.484-1.121L9.033 2.744A1 1 0 0110 2h2z" clipRule="evenodd" />
    </svg>
);


const Generator: React.FC<GeneratorProps> = () => {
    const { t, language } = useTranslations();
    const { apiKey } = useApiKey();

    const [logs, setLogs] = useState<string[]>([t('generator.log.welcome')]);
    const [referenceImage, setReferenceImage] = useState<File | null>(null);
    const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
    const [manualPrompt, setManualPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [promptSource, setPromptSource] = useState<'batch' | 'manual'>('manual');
    const [promptsFileInfo, setPromptsFileInfo] = useState<{ name: string; count: number } | null>(null);
    const [enhanceFormat, setEnhanceFormat] = useState<'normal' | 'json'>('normal');

    const GENERATOR_MODELS = useMemo(() => getGeneratorModels(t), [t]);
    const ASPECT_RATIOS = useMemo(() => getAspectRatios(t), [t]);
    const VIDEO_QUALITIES = useMemo(() => getVideoQualities(t), [t]);
    const RESOLUTIONS = useMemo(() => getResolutions(t), [t]);
    const STYLES = useMemo(() => getStyles(t), [t]);

    // States for Generation Settings
    const [model, setModel] = useState(GENERATOR_MODELS[0].value);
    const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].value);
    const [duration, setDuration] = useState(4);
    const [videoQuality, setVideoQuality] = useState(VIDEO_QUALITIES[0].value);
    const [resolution, setResolution] = useState<Resolution>(Resolution.FullHD);
    const [withSound, setWithSound] = useState(false);

    // States for Augmentation
    const [style, setStyle] = useState(STYLES[0].value);
    const [customStyle, setCustomStyle] = useState('');

    // State for generation process
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [generationResults, setGenerationResults] = useState<GenerationResult[]>([]);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const promptsFileRef = useRef<HTMLInputElement>(null);
    const negativesFileRef = useRef<HTMLInputElement>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const addToLog = (message: string) => {
        setLogs(prev => [...prev, message]);
    };
    
    const handleImageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setReferenceImage(file);
            setReferenceImagePreview(URL.createObjectURL(file));
            addToLog(`${t('generator.log.imageSelected')}: ${file.name}`);
        }
    };
    
     const handleFileLoad = (event: ChangeEvent<HTMLInputElement>, type: 'prompts' | 'negatives') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                if (type === 'prompts') {
                    const lines = text.split('\n').filter(line => line.trim() !== '');
                    setManualPrompt(text);
                    setPromptsFileInfo({ name: file.name, count: lines.length });
                    addToLog(t('generator.log.promptsLoaded', { count: lines.length, fileName: file.name }));
                } else { // negatives
                    setNegativePrompt(text);
                    addToLog(t('generator.log.negativesLoaded'));
                }
            };
            reader.readAsText(file);
        }
        event.target.value = ''; // Allow re-uploading the same file
    };

    const handleEnhancePrompt = async () => {
        if (!manualPrompt) {
            alert(t('alerts.promptMissing'));
            return;
        }

        setIsEnhancing(true);
        addToLog(t('generator.log.enhancing'));
        try {
            const enhanced = await enhancePrompt(apiKey, manualPrompt, language, enhanceFormat);
            setManualPrompt(enhanced);
            addToLog(t('generator.log.enhanceSuccess'));
        } catch (error) {
            const errorMessage = (error as Error).message;
            addToLog(`${t('generator.log.enhanceFail')}: ${errorMessage}`);
            alert(t('alerts.enhanceFail'));
        } finally {
            setIsEnhancing(false);
        }
    };
    
    const executeGeneration = async (promptToUse: string): Promise<{ url: string; type: 'image' | 'video' }> => {
        let finalPrompt = promptToUse;
        const selectedStyleLabel = STYLES.find(s => s.value === style)?.label;
        if (style !== 'photorealistic' || customStyle) {
            finalPrompt += `, style: ${customStyle || selectedStyleLabel}`;
        }
        if (negativePrompt) {
            finalPrompt += `. Negative prompt: ${negativePrompt}`;
        }

        const isVideoModel = model.toLowerCase().includes('veo');
        const isVeo3Model = model.startsWith('veo-3.0');
        
        if (isVideoModel) {
            let videoUrl: string;
            if (isVeo3Model) {
                const options: VideoGenerationOptions = {
                    prompt: finalPrompt, model,
                    aspectRatio: aspectRatio as "16:9" | "9:16" | "4:3" | "3:4" | "1:1",
                    resolution, soundEnabled: withSound,
                    image: referenceImage ? { file: referenceImage } : undefined
                };
                videoUrl = await generateVideoV3(apiKey, options, addToLog);
            } else {
                 videoUrl = await generateVideoV2(apiKey, finalPrompt, model, aspectRatio, duration, withSound, referenceImage, addToLog);
            }
            return { url: videoUrl, type: 'video' };
        } else { // Imagen
            const imageUrl = await generateImage(apiKey, finalPrompt, aspectRatio, false, true);
            addToLog(t('generator.log.imageGenComplete'));
            return { url: imageUrl, type: 'image' };
        }
    };

    const handleRun = async () => {
        setIsGenerating(true);
    
        const promptsToRun = (promptSource === 'batch'
            ? manualPrompt.split('\n').filter(p => p.trim() !== '')
            : [manualPrompt.trim()]).filter(Boolean);
    
        if (promptsToRun.length === 0) {
            alert(t('alerts.promptMissing'));
            setIsGenerating(false);
            return;
        }
    
        addToLog(`Starting generation for ${promptsToRun.length} prompt(s) with model: ${model}`);
    
        const initialResults: GenerationResult[] = promptsToRun.map((prompt, index) => ({
            id: index,
            prompt,
            url: '',
            type: null,
            status: 'pending',
        }));
        setGenerationResults(initialResults);
    
        for (const [index, prompt] of promptsToRun.entries()) {
            if (promptSource === 'batch') {
                addToLog(`[${index + 1}/${promptsToRun.length}] Generating for: "${prompt}"`);
            }
            
            setGenerationResults(prev => prev.map(r => r.id === index ? { ...r, status: 'generating' } : r));
    
            try {
                const { url, type } = await executeGeneration(prompt);
                setGenerationResults(prev => prev.map(r => 
                    r.id === index 
                    ? { ...r, status: 'completed', url, type: type as ('image' | 'video') } 
                    : r
                ));
            } catch (error) {
                const errorMessage = (error as Error).message;
                addToLog(`[${index + 1}/${promptsToRun.length}] FAILED for: "${prompt}". Error: ${errorMessage}`);
                setGenerationResults(prev => prev.map(r => 
                    r.id === index 
                    ? { ...r, status: 'failed', error: errorMessage } 
                    : r
                ));
                if (promptSource === 'manual') alert(t('alerts.genFail'));
            }
        }
        
        addToLog('All generation tasks finished.');
        setIsGenerating(false);
    };


    return (
        <div className="space-y-8">
            <input type="file" ref={imageInputRef} onChange={handleImageInputChange} className="hidden" accept="image/*"/>
            <input type="file" ref={promptsFileRef} onChange={(e) => handleFileLoad(e, 'prompts')} className="hidden" accept=".txt" />
            <input type="file" ref={negativesFileRef} onChange={(e) => handleFileLoad(e, 'negatives')} className="hidden" accept=".txt" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Generation Settings */}
                <div className="bg-surface p-6 rounded-lg shadow-lg space-y-4 border border-border">
                    <h2 className="text-lg font-semibold border-b border-border pb-2 text-secondary">{t('generator.settings.title')}</h2>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('generator.settings.model')}</label>
                        <select value={model} onChange={e => setModel(e.target.value)} disabled={isGenerating} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary disabled:opacity-50">
                            {GENERATOR_MODELS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('generator.settings.aspectRatio')}</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} disabled={isGenerating} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary disabled:opacity-50">
                           {ASPECT_RATIOS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('generator.settings.duration')}</label>
                        <input type="number" min="1" value={duration} onChange={e => setDuration(parseInt(e.target.value, 10))} disabled={isGenerating || model.startsWith('veo-3.0')} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 disabled:opacity-50"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('generator.settings.resolution')}</label>
                        <select value={resolution} onChange={e => setResolution(e.target.value as Resolution)} disabled={isGenerating || !model.startsWith('veo-3.0')} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 disabled:opacity-50">
                           {RESOLUTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('generator.settings.videoQuality')}</label>
                        <select value={videoQuality} onChange={e => setVideoQuality(e.target.value)} disabled={isGenerating || model.startsWith('veo-3.0')} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 disabled:opacity-50">
                           {VIDEO_QUALITIES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center">
                        <input id="sound" type="checkbox" checked={withSound} onChange={e => setWithSound(e.target.checked)} disabled={isGenerating || !model.includes('veo')} className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary disabled:opacity-50"/>
                        <label htmlFor="sound" className="ml-2 block text-sm text-text-secondary">{t('generator.settings.withSound')}</label>
                    </div>
                    <button className="w-full bg-surface hover:bg-border border border-border text-text-main font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors" disabled={isGenerating} onClick={() => imageInputRef.current?.click()}>{t('generator.settings.chooseImage')}</button>
                    {referenceImagePreview && (
                        <div className="mt-2 bg-background rounded-lg p-2">
                            <img src={referenceImagePreview} alt="Reference Preview" className="max-h-32 mx-auto object-contain rounded-md" />
                        </div>
                    )}
                </div>

                {/* Prompt Source & Augmentation */}
                <div className="bg-surface p-6 rounded-lg shadow-lg space-y-4 border border-border">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                        <h2 className="text-lg font-semibold text-secondary">{t('generator.prompt.sourceTitle')}</h2>
                        <button onClick={() => { setManualPrompt(''); setNegativePrompt(''); setPromptsFileInfo(null); }} className="text-xs bg-surface hover:bg-border border border-border text-text-secondary font-bold py-1 px-3 rounded-lg">Clear</button>
                    </div>
                     <div className="flex border-b border-border">
                        <button onClick={() => setPromptSource('batch')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${promptSource === 'batch' ? 'border-brand-green text-brand-green' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('generator.prompt.batch')}</button>
                        <button onClick={() => setPromptSource('manual')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${promptSource === 'manual' ? 'border-brand-green text-brand-green' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('generator.prompt.manual')}</button>
                    </div>
                    
                    {promptSource === 'batch' && (
                        <div className="space-y-3 pt-2">
                             <button className="w-full bg-brand-green/20 hover:bg-brand-green/30 border border-brand-green/50 text-text-main font-bold py-2.5 px-4 rounded-lg transition-colors" onClick={() => promptsFileRef.current?.click()}>{t('generator.prompt.loadPrompts')}</button>
                              {promptsFileInfo && <p className="text-xs text-text-secondary text-center">{t('generator.prompt.promptsLoadedInfo', {fileName: promptsFileInfo.name, count: promptsFileInfo.count})}</p>}
                             <button className="w-full bg-brand-green/20 hover:bg-brand-green/30 border border-brand-green/50 text-text-main font-bold py-2.5 px-4 rounded-lg transition-colors" onClick={() => negativesFileRef.current?.click()}>{t('generator.prompt.loadNegatives')}</button>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-secondary mb-1">{promptSource === 'manual' ? t('generator.prompt.manualPlaceholder') : t('generator.prompt.batchContents')}</label>
                        <div className="relative">
                            <textarea 
                                placeholder={promptSource === 'manual' ? t('generator.prompt.manualPlaceholder') : ''}
                                rows={5} 
                                className="w-full bg-background border border-border rounded-md shadow-sm p-2 pr-48 disabled:opacity-50"
                                value={manualPrompt}
                                onChange={(e) => setManualPrompt(e.target.value)}
                                disabled={isGenerating || isEnhancing}
                            ></textarea>
                            <div className="absolute top-9 right-2 flex items-center space-x-2">
                                {promptSource === 'manual' && (
                                    <button 
                                        onClick={handleEnhancePrompt} 
                                        disabled={isGenerating || isEnhancing || !manualPrompt}
                                        className="flex items-center space-x-1.5 bg-secondary/20 hover:bg-secondary/30 border border-secondary/50 text-secondary font-semibold py-1 px-3 rounded-full text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface disabled:border-border disabled:text-text-secondary"
                                    >
                                        <SparklesIcon />
                                        <span>{isEnhancing ? t('generator.prompt.enhancing') : 'AI Enhancer'}</span>
                                    </button>
                                )}
                                <CopyButton textToCopy={manualPrompt} className="!relative !top-auto !right-auto" />
                            </div>
                        </div>
                        {promptSource === 'manual' && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mt-2">{t('enhancer.format')}</label>
                                <div className="flex border-b border-border mt-1">
                                    <button onClick={() => setEnhanceFormat('normal')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${enhanceFormat === 'normal' ? 'border-secondary text-secondary' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('enhancer.normal')}</button>
                                    <button onClick={() => setEnhanceFormat('json')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${enhanceFormat === 'json' ? 'border-secondary text-secondary' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('enhancer.json')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <h2 className="text-lg font-semibold border-b border-border pb-2 pt-4 text-secondary">{t('generator.augmentation.title')}</h2>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('generator.augmentation.chooseStyle')}</label>
                        <select value={style} onChange={e => setStyle(e.target.value)} disabled={isGenerating} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 disabled:opacity-50">
                           {STYLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('generator.augmentation.customStyle')}</label>
                        <input type="text" value={customStyle} onChange={e => setCustomStyle(e.target.value)} disabled={isGenerating} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 disabled:opacity-50"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('generator.augmentation.negative')}</label>
                        <textarea 
                            rows={3} 
                            className="mt-1 w-full bg-background border border-border rounded-md shadow-sm p-2"
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                {/* Results, Controls & Log */}
                <div className="bg-surface p-6 rounded-lg shadow-lg space-y-4 flex flex-col border border-border">
                    <h2 className="text-lg font-semibold border-b border-border pb-2 text-secondary">{t('generator.results.title')}</h2>
                    <div className="relative bg-background rounded-md flex-grow min-h-[300px] p-2">
                        {generationResults.length === 0 ? (
                            <div className="flex w-full h-full items-center justify-center">
                                <p className="text-text-secondary">{t('generator.results.placeholder')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 w-full h-full max-h-[400px] overflow-y-auto">
                                {generationResults.map((result) => (
                                    <div key={result.id} className="relative aspect-video bg-border rounded-lg group flex items-center justify-center text-center p-2">
                                        {result.status === 'pending' && <span className="text-xs text-text-secondary">Pending...</span>}
                                        {result.status === 'generating' && <span className="text-xs text-text-secondary animate-pulse">Generating...</span>}
                                        {result.status === 'failed' && <span className="text-xs text-red-400">Failed: {result.error}</span>}
                                        {result.status === 'completed' && (
                                            <>
                                                {result.type === 'image' && <img src={result.url} alt={result.prompt} className="w-full h-full object-contain rounded-md" />}
                                                {result.type === 'video' && <video src={result.url} controls className="w-full h-full object-contain rounded-md" />}
                                                <DownloadButton mediaUrl={result.url} mediaType={result.type} className="top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-opacity" title={result.prompt}>
                                                    {result.prompt}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <h2 className="text-lg font-semibold border-b border-border pb-2 pt-4 text-secondary">{t('generator.controls.title')}</h2>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-gradient-to-r from-primary to-accent text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:from-surface disabled:to-surface disabled:text-text-secondary transition-opacity" onClick={handleRun} disabled={isGenerating}>
                            {isGenerating ? t('generator.controls.generating') : t('generator.controls.run')}
                        </button>
                        <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-surface disabled:text-text-secondary transition-colors" onClick={() => addToLog('Stop functionality not implemented.')} disabled={!isGenerating}>
                            {t('generator.controls.stop')}
                        </button>
                    </div>
                    <div className="text-center font-mono text-text-secondary">{t('generator.controls.status')}: {isGenerating ? t('generator.controls.statusRunning') : t('generator.controls.statusIdle')}</div>
                     <h2 className="text-lg font-semibold border-b border-border pb-2 pt-4 text-secondary">{t('generator.log.title')}</h2>
                    <div ref={logContainerRef} className="bg-background rounded-md p-3 flex-grow h-64 overflow-y-auto font-mono text-sm text-text-secondary">
                        {logs.map((log, index) => <p key={index} className="leading-relaxed">{`> ${log}`}</p>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Generator;