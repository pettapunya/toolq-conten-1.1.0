import React, { useState, ChangeEvent, useMemo } from 'react';
import { getPromptHelperModels, getPromptTypes, getCompositions, getLanguages, getAspectRatios, getVeoModels } from '../constants.ts';
import { generatePromptIdeas, generatePromptIdeasAsJson, analyzeImageForPrompt, analyzeImageForJsonPrompt, generateImages, generateVideo, enhanceCreativeText } from '../services/geminiService.ts';
import { generateVideoV3 } from '../services/veo3Service.ts';
import CopyButton from './CopyButton.tsx';
import DownloadButton from './DownloadButton.tsx';
import { useTranslations, useApiKey } from '../contexts/LanguageContext.tsx';
import { Resolution, VideoGenerationOptions } from '../types.ts';

interface PromptHelperProps {
}

const SparklesIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${className}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.23l4.484 1.121a1 1 0 01.54 1.77l-3.243 3.16.766 4.464a1 1 0 01-1.451 1.054L10 15.547l-4.015 2.11a1 1 0 01-1.451-1.054l.766-4.464-3.243-3.16a1 1 0 01.54-1.77l4.484-1.121L9.033 2.744A1 1 0 0110 2h2z" clipRule="evenodd" />
    </svg>
);

// Sub-component for direct generation from a prompt
const PromptGenerationOutput: React.FC<{
    prompt: string;
    jsonPrompt?: string;
}> = ({ prompt, jsonPrompt }) => {
    const { t } = useTranslations();
    const { apiKey } = useApiKey();
    const ASPECT_RATIOS = useMemo(() => getAspectRatios(t), [t]);
    const VEO_MODELS = useMemo(() => getVeoModels(t), [t]);
    
    const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].value);
    const [numberOfImages, setNumberOfImages] = useState(1);
    const [veoModel, setVeoModel] = useState(VEO_MODELS[0].value);
    const [isTransparent, setIsTransparent] = useState(false);
    const [isHighQuality, setIsHighQuality] = useState(true);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<(string)[]>([]);
    const [resultType, setResultType] = useState<'image' | 'video' | null>(null);

    const getBestPrompt = () => {
        if (jsonPrompt) {
            try {
                const parsed = JSON.parse(jsonPrompt);
                // Construct a detailed prompt from the JSON structure
                return [
                    parsed.subject,
                    parsed.action,
                    `in ${parsed.location}`,
                    `style of ${parsed.style}`,
                    `composition: ${parsed.composition}`,
                    ...(parsed.details || [])
                ].filter(Boolean).join(', ');
            } catch (e) {
                // Fallback to normal prompt if JSON parsing fails
                return prompt;
            }
        }
        return prompt;
    };

    const handleGenerateImages = async () => {
        const finalPrompt = getBestPrompt();
        if (!finalPrompt) return;

        setIsGenerating(true);
        setResults([]);
        setResultType('image');
        try {
            const imageUrls = await generateImages(apiKey, finalPrompt, aspectRatio, numberOfImages, isTransparent, isHighQuality);
            setResults(imageUrls);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleGenerateVideo = async () => {
        const finalPrompt = getBestPrompt();
        if (!finalPrompt) return;

        setIsGenerating(true);
        setResults([]);
        setResultType('video');
        try {
            const isVeo3Model = veoModel.startsWith('veo-3.0');
            let videoUrl;
            const logProgress = (log: string) => console.log(`[Prompt Helper]`, log);

            if (isVeo3Model) {
                 const options: VideoGenerationOptions = {
                    prompt: finalPrompt,
                    model: veoModel,
                    aspectRatio: aspectRatio as "16:9" | "9:16" | "4:3" | "3:4" | "1:1",
                    resolution: Resolution.FullHD,
                    soundEnabled: false,
                };
                videoUrl = await generateVideoV3(apiKey, options, logProgress);
            } else { // VEO 2
                videoUrl = await generateVideo(apiKey, finalPrompt, veoModel, aspectRatio, 4, false, null, logProgress);
            }
            setResults([videoUrl]);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
            <h3 className="text-lg font-semibold text-secondary">{t('promptHelper.output.title')}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-medium text-text-secondary">{t('promptHelper.output.aspectRatio')}</label>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} disabled={isGenerating} className="mt-1 w-full bg-background border border-border rounded-md p-2 text-sm">
                        {ASPECT_RATIOS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-secondary">{t('promptHelper.output.numImages')}</label>
                    <input type="number" min="1" max="4" value={numberOfImages} onChange={e => setNumberOfImages(parseInt(e.target.value, 10))} disabled={isGenerating} className="mt-1 w-full bg-background border border-border rounded-md p-2 text-sm" />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-text-secondary">{t('promptHelper.output.veoModel')}</label>
                    <select value={veoModel} onChange={e => setVeoModel(e.target.value)} disabled={isGenerating} className="mt-1 w-full bg-background border border-border rounded-md p-2 text-sm">
                        {VEO_MODELS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex gap-4 text-sm text-text-secondary">
                <label className="flex items-center">
                    <input type="checkbox" checked={isTransparent} onChange={e => setIsTransparent(e.target.checked)} disabled={isGenerating} className="mr-2 h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"/>
                    {t('imageStudio.generate.transparent')}
                </label>
                <label className="flex items-center">
                    <input type="checkbox" checked={isHighQuality} onChange={e => setIsHighQuality(e.target.checked)} disabled={isGenerating} className="mr-2 h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary"/>
                    {t('imageStudio.generate.hq')}
                </label>
            </div>
             <div className="flex gap-4">
                <button onClick={handleGenerateImages} disabled={isGenerating} className="flex-1 bg-surface hover:bg-border border border-border text-text-main font-bold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50">
                    {t('promptHelper.output.generateImage')}
                </button>
                <button onClick={handleGenerateVideo} disabled={isGenerating} className="flex-1 bg-surface hover:bg-border border border-border text-text-main font-bold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50">
                    {t('promptHelper.output.generateVideo')}
                </button>
            </div>
            
            {isGenerating && <div className="text-center text-text-secondary animate-pulse py-4">{t('promptHelper.output.generating')}</div>}

            {results.length > 0 && (
                 <div className={`grid gap-2 ${resultType === 'image' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {results.map((url, index) => (
                         <div key={index} className="relative aspect-video bg-background rounded-md border border-border">
                             {resultType === 'image' && <img src={url} alt={`Generated image ${index + 1}`} className="w-full h-full object-contain rounded-md" />}
                             {resultType === 'video' && <video src={url} controls className="w-full h-full object-contain rounded-md" />}
                             <DownloadButton mediaUrl={url} mediaType={resultType} className="top-1 right-1" />
                         </div>
                    ))}
                 </div>
            )}
        </div>
    );
};


const PromptHelper: React.FC<PromptHelperProps> = () => {
    const { t, language } = useTranslations();
    const { apiKey } = useApiKey();
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);

    const PROMPT_HELPER_MODELS = useMemo(() => getPromptHelperModels(t), [t]);
    const PROMPT_TYPES = useMemo(() => getPromptTypes(t), [t]);
    const COMPOSITIONS = useMemo(() => getCompositions(t), [t]);
    const LANGUAGES = useMemo(() => getLanguages(t), [t]);

    // Idea Generator State
    const [idea, setIdea] = useState("A cat discovering a hidden portal in a library.");
    const [model, setModel] = useState('gemini-2.5-flash');
    const [promptType, setPromptType] = useState('normal');
    const [composition, setComposition] = useState('normal');
    const [outputLanguage, setOutputLanguage] = useState('english');
    const [ideaImageFile, setIdeaImageFile] = useState<File | null>(null);
    const [ideaImagePreview, setIdeaImagePreview] = useState<string | null>(null);
    const [generatedIdeaPrompt, setGeneratedIdeaPrompt] = useState('');
    const [generatedIdeaPromptJson, setGeneratedIdeaPromptJson] = useState('');
    const [enhanceFormat, setEnhanceFormat] = useState<'normal' | 'json'>('normal');

    // Image Analyzer State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [generatedImagePrompt, setGeneratedImagePrompt] = useState('');
    const [generatedImagePromptJson, setGeneratedImagePromptJson] = useState('');
    
    const handleIdeaImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIdeaImageFile(file);
            setIdeaImagePreview(URL.createObjectURL(file));
        }
    };

    const handleEnhanceIdea = async () => {
        if (!idea) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhanceCreativeText(apiKey, idea, "a creative concept or idea for an image or video", language, enhanceFormat);
            setIdea(enhanced);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleGenerateFromIdea = async () => {
        if (!idea) {
            alert(t('alerts.ideaMissing'));
            return;
        }
        setIsLoading(true);
        setGeneratedIdeaPrompt('');
        setGeneratedIdeaPromptJson('');
        try {
            const [normalResult, jsonResult] = await Promise.all([
                generatePromptIdeas(apiKey, idea, model, promptType, composition, outputLanguage, ideaImageFile),
                generatePromptIdeasAsJson(apiKey, idea, model, ideaImageFile)
            ]);
            setGeneratedIdeaPrompt(normalResult);
            setGeneratedIdeaPromptJson(jsonResult);
        } catch (error) {
            alert((error as Error).message || t('alerts.error'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleGenerateFromImage = async () => {
        if (!imageFile) {
            alert(t('alerts.imageMissingUpload'));
            return;
        }
        setIsLoading(true);
        setGeneratedImagePrompt('');
        setGeneratedImagePromptJson('');
        try {
            const [normalResult, jsonResult] = await Promise.all([
                analyzeImageForPrompt(apiKey, imageFile),
                analyzeImageForJsonPrompt(apiKey, imageFile)
            ]);
            setGeneratedImagePrompt(normalResult);
            setGeneratedImagePromptJson(jsonResult);
        } catch (error) {
            alert(`${t('alerts.imageAnalyzeError')}: ${(error as Error).message}`);
            setGeneratedImagePrompt(t('alerts.genFail'));
            setGeneratedImagePromptJson(t('alerts.genFail'));
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Prompt Idea Generator */}
            <div className="bg-surface p-6 rounded-lg shadow-lg space-y-4 border border-border">
                <h2 className="text-xl font-semibold border-b border-border pb-3 text-secondary">{t('promptHelper.idea.title')}</h2>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">{t('promptHelper.idea.yourIdea')}</label>
                    <div className="relative">
                        <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={3} className="w-full bg-background border border-border rounded-md p-2 pr-32" disabled={isLoading || isEnhancing}/>
                        <div className="absolute top-2 right-2">
                            <button 
                                onClick={handleEnhanceIdea} 
                                disabled={isLoading || isEnhancing || !idea}
                                className="flex items-center space-x-1.5 bg-secondary/20 hover:bg-secondary/30 border border-secondary/50 text-secondary font-semibold py-1 px-3 rounded-full text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface disabled:border-border disabled:text-text-secondary"
                            >
                                <SparklesIcon />
                                <span>{isEnhancing ? t('common.enhancing') : 'AI Enhancer'}</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-text-secondary mt-2">{t('enhancer.format')}</label>
                    <div className="flex border-b border-border mt-1">
                        <button onClick={() => setEnhanceFormat('normal')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${enhanceFormat === 'normal' ? 'border-secondary text-secondary' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('enhancer.normal')}</button>
                        <button onClick={() => setEnhanceFormat('json')} className={`py-2 px-4 font-medium text-sm -mb-px border-b-2 transition-colors duration-200 ${enhanceFormat === 'json' ? 'border-secondary text-secondary' : 'border-transparent text-text-secondary hover:text-text-main'}`}>{t('enhancer.json')}</button>
                    </div>
                </div>

                <input id="idea-image-upload" type="file" accept="image/*" onChange={handleIdeaImageFileChange} className="hidden" />
                <label htmlFor="idea-image-upload" className="cursor-pointer w-full inline-block bg-surface hover:bg-border border border-border text-text-main text-center font-bold py-2.5 px-4 rounded-lg transition-colors">{t('promptHelper.idea.uploadButton')}</label>
                
                {ideaImagePreview && (
                     <div className="bg-background rounded-lg flex items-center justify-center p-2 border border-border">
                        <img src={ideaImagePreview} alt="Idea reference preview" className="max-h-32 object-contain rounded-md" />
                    </div>
                )}


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('promptHelper.idea.model')}</label>
                        <select value={model} onChange={e => setModel(e.target.value)} className="mt-1 w-full bg-background border border-border rounded-md p-2">
                           {PROMPT_HELPER_MODELS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('promptHelper.idea.promptType')}</label>
                        <select value={promptType} onChange={e => setPromptType(e.target.value)} className="mt-1 w-full bg-background border border-border rounded-md p-2">
                           {PROMPT_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('promptHelper.idea.composition')}</label>
                        <select value={composition} onChange={e => setComposition(e.target.value)} className="mt-1 w-full bg-background border border-border rounded-md p-2">
                           {COMPOSITIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('promptHelper.idea.language')}</label>
                        <select value={outputLanguage} onChange={e => setOutputLanguage(e.target.value)} className="mt-1 w-full bg-background border border-border rounded-md p-2">
                           {LANGUAGES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={handleGenerateFromIdea} disabled={isLoading || isEnhancing} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-lg disabled:opacity-50 transition-opacity">
                    {isLoading ? t('promptHelper.idea.generating') : t('promptHelper.idea.generateButton')}
                </button>
                {generatedIdeaPrompt && (
                    <div className="pt-4 border-t border-border">
                        <div className="relative">
                            <label className="block text-sm font-medium text-text-secondary">{t('promptHelper.idea.generatedLabel')}</label>
                            <textarea readOnly value={generatedIdeaPrompt} rows={4} className="mt-1 w-full bg-background border border-border rounded-md p-2 pr-14" />
                            <CopyButton textToCopy={generatedIdeaPrompt} className="top-8" />
                        </div>
                         <div className="relative mt-4">
                            <label className="block text-sm font-medium text-text-secondary">{t('promptHelper.idea.generatedJsonLabel')}</label>
                            <textarea readOnly value={generatedIdeaPromptJson} rows={6} className="mt-1 w-full bg-background border border-border rounded-md p-2 font-mono text-sm pr-14"/>
                            <CopyButton textToCopy={generatedIdeaPromptJson} className="top-8" />
                        </div>
                        <PromptGenerationOutput prompt={generatedIdeaPrompt} jsonPrompt={generatedIdeaPromptJson} />
                    </div>
                )}
            </div>

            {/* Analyze Image to Create Prompt */}
            <div className="bg-surface p-6 rounded-lg shadow-lg space-y-4 border border-border">
                <h2 className="text-xl font-semibold border-b border-border pb-3 text-secondary">{t('promptHelper.image.title')}</h2>
                <input id="image-upload" type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                <label htmlFor="image-upload" className="cursor-pointer w-full inline-block bg-surface hover:bg-border border border-border text-text-main text-center font-bold py-2.5 px-4 rounded-lg transition-colors">{t('promptHelper.image.uploadButton')}</label>
                
                <div className="bg-background rounded-lg flex items-center justify-center min-h-[150px] p-2 border border-border">
                    {imagePreview ? <img src={imagePreview} alt="Upload preview" className="max-h-48 object-contain rounded-md" /> : <p className="text-text-secondary">{t('promptHelper.image.preview')}</p>}
                </div>

                <button onClick={handleGenerateFromImage} disabled={isLoading || !imageFile} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-lg disabled:opacity-50 disabled:from-surface disabled:to-surface disabled:text-text-secondary transition-opacity">
                    {isLoading ? t('promptHelper.image.analyzing') : t('promptHelper.image.analyzeButton')}
                </button>

                {generatedImagePrompt && (
                    <div className="pt-4 border-t border-border">
                        <div className="relative">
                            <label className="block text-sm font-medium text-text-secondary">{t('promptHelper.image.generatedLabel')}</label>
                            <textarea readOnly value={generatedImagePrompt} rows={4} className="mt-1 w-full bg-background border border-border rounded-md p-2 font-mono text-sm pr-14"/>
                            <CopyButton textToCopy={generatedImagePrompt} className="top-8" />
                        </div>
                        <div className="relative mt-4">
                            <label className="block text-sm font-medium text-text-secondary">{t('promptHelper.image.generatedJsonLabel')}</label>
                            <textarea readOnly value={generatedImagePromptJson} rows={6} className="mt-1 w-full bg-background border border-border rounded-md p-2 font-mono text-sm pr-14"/>
                            <CopyButton textToCopy={generatedImagePromptJson} className="top-8" />
                        </div>
                        <PromptGenerationOutput prompt={generatedImagePrompt} jsonPrompt={generatedImagePromptJson} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromptHelper;