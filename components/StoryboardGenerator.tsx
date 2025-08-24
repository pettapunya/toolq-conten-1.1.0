import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Scene, Resolution, VideoGenerationOptions } from '../types.ts';
import { useTranslations, useApiKey } from '../contexts/LanguageContext.tsx';
import { enhanceStory, generateStoryboardScenes, generateVideo as generateVideoV2 } from '../services/geminiService.ts';
import { generateVideoV3 } from '../services/veo3Service.ts';
import { getVisualStyles, getDialogueLanguages, getGenres, getTargetAudiences, getFilmmakerModels, getAspectRatios } from '../constants.ts';
import CopyButton from './CopyButton.tsx';
import DownloadButton from './DownloadButton.tsx';

// --- Icons ---
const CreateStoryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
);

const SettingsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const EnhanceIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.23l4.484 1.121a1 1 0 01.54 1.77l-3.243 3.16.766 4.464a1 1 0 01-1.451 1.054L10 15.547l-4.015 2.11a1 1 0 01-1.451-1.054l.766-4.464-3.243-3.16a1 1 0 01.54-1.77l4.484-1.121L9.033 2.744A1 1 0 0110 2h2z" clipRule="evenodd" />
    </svg>
);

const SendIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

// --- Types ---
interface SceneStatus {
    status: 'idle' | 'generating' | 'completed' | 'failed';
    url?: string;
    error?: string;
    logs?: string[];
}

// --- Sub-components ---
const SceneCard: React.FC<{
    scene: Scene;
    status: SceneStatus;
    visualStyle: string;
    onGenerate: () => void;
    t: (key: string) => string;
}> = ({ scene, status, visualStyle, onGenerate, t }) => {

    const handleCopyJson = () => {
        const sceneJson = JSON.stringify(scene, null, 2);
        navigator.clipboard.writeText(sceneJson).then(() => {
            // Maybe show a small notification
        }).catch(err => console.error('Failed to copy JSON', err));
    };

    return (
        <div className="bg-surface border border-border rounded-lg flex flex-col group">
            <div className="relative aspect-video bg-background rounded-t-lg flex items-center justify-center">
                {status.status === 'generating' && <div className="text-text-secondary animate-pulse">{t('filmmaker.generatingStatus')}...</div>}
                {status.status === 'completed' && status.url && (
                    <>
                        <video src={status.url} controls className="w-full h-full object-contain rounded-t-lg" />
                        <DownloadButton mediaUrl={status.url} mediaType="video" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </>
                )}
                {status.status === 'failed' && <div className="text-red-400 text-sm p-2 text-center">{t('filmmaker.failedStatus')}: {status.error}</div>}
            </div>
            <div className="p-3 flex-grow space-y-2 text-xs">
                 <h4 className="font-bold text-sm text-secondary flex justify-between">
                    <span>{t('filmmaker.scene')} {scene.sceneNumber}</span>
                    <span className="font-normal text-text-secondary">{scene.duration}s</span>
                </h4>
                <div className="space-y-1">
                    <p><strong className="font-semibold text-text-secondary">{t('filmmaker.setting')}:</strong> {scene.setting}</p>
                    <p><strong className="font-semibold text-text-secondary">{t('filmmaker.characters')}:</strong> {scene.characters.join(', ')}</p>
                    <p><strong className="font-semibold text-text-secondary">{t('filmmaker.camera')}:</strong> {scene.camera}</p>
                    <p><strong className="font-semibold text-text-secondary">{t('filmmaker.dialogue')}:</strong> {scene.dialogue}</p>
                </div>
            </div>
             <div className="flex border-t border-border">
                <button onClick={onGenerate} disabled={status.status === 'generating'} className="flex-1 text-center py-2 px-3 text-sm font-medium text-brand-green hover:bg-brand-green/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {status.status === 'generating' ? t('filmmaker.generatingStatus') + '...' : t('filmmaker.generate')}
                </button>
                <div className="w-px bg-border"></div>
                <button onClick={handleCopyJson} className="flex-1 text-center py-2 px-3 text-sm font-medium text-text-secondary hover:bg-white/5 transition-colors">{t('filmmaker.copyJson')}</button>
            </div>
        </div>
    );
};


const Filmmaker: React.FC = () => {
    const { t, language } = useTranslations();
    const { apiKey } = useApiKey();
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [storyIdea, setStoryIdea] = useState('');
    const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(true);

    // Story settings
    const [numberOfScenes, setNumberOfScenes] = useState(4);
    const [visualStyle, setVisualStyle] = useState('3D cartoon cinematic');
    const [dialogueLanguage, setDialogueLanguage] = useState('id-ID');
    const [genre, setGenre] = useState('adventure');
    const [targetAudience, setTargetAudience] = useState('family');
    const [referenceImage, setReferenceImage] = useState<File | null>(null);
    const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
    
    // Video generation settings
    const [sceneStatuses, setSceneStatuses] = useState<Record<number, SceneStatus>>({});
    const [generationModel, setGenerationModel] = useState('veo-3.0-generate-001');
    const [generationAspectRatio, setGenerationAspectRatio] = useState('16:9');
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);


    const VISUAL_STYLES = useMemo(() => getVisualStyles(t), [t]);
    const DIALOGUE_LANGUAGES = useMemo(() => getDialogueLanguages(), []);
    const GENRES = useMemo(() => getGenres(t), [t]);
    const TARGET_AUDIENCES = useMemo(() => getTargetAudiences(t), [t]);
    const FILMMAKER_MODELS = useMemo(() => getFilmmakerModels(t), [t]);
    const ASPECT_RATIOS = useMemo(() => getAspectRatios(t), [t]);


    const handleEnhance = useCallback(async () => {
        if (!storyIdea || isEnhancing || isGeneratingScenes || !apiKey) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhanceStory(apiKey, storyIdea, language, 'normal');
            setStoryIdea(enhanced);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsEnhancing(false);
        }
    }, [apiKey, storyIdea, language, isEnhancing, isGeneratingScenes]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setReferenceImage(file);
            setReferenceImagePreview(URL.createObjectURL(file));
        }
        if (e.target) e.target.value = '';
    };

    const handleClearImage = () => {
        setReferenceImage(null);
        setReferenceImagePreview(null);
    };

    const handleSceneSubmit = useCallback(async () => {
        if (!storyIdea || isGeneratingScenes || !apiKey) {
            if (!apiKey) alert(t('filmmaker.apiKeyWarning'));
            return;
        }
        
        setIsGeneratingScenes(true);
        setScenes([]);
        setSceneStatuses({});

        try {
            const generatedScenes = await generateStoryboardScenes(
                apiKey, storyIdea, numberOfScenes,
                visualStyle, dialogueLanguage, genre, targetAudience,
                referenceImage
            ); 
            setScenes(generatedScenes);
            const initialStatuses: Record<number, SceneStatus> = {};
            generatedScenes.forEach(scene => {
                initialStatuses[scene.sceneNumber] = { status: 'idle', logs: [] };
            });
            setSceneStatuses(initialStatuses);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsGeneratingScenes(false);
        }
    }, [apiKey, storyIdea, isGeneratingScenes, t, numberOfScenes, visualStyle, dialogueLanguage, genre, targetAudience, referenceImage]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSceneSubmit();
        }
    };
    
    const constructPromptFromScene = (scene: Scene): string => {
        return `${visualStyle} style, ${scene.setting}. ${scene.characters.join('. ')}. Shot: ${scene.camera}.`;
    };

    const handleGenerateVideo = async (scene: Scene) => {
        const sceneNumber = scene.sceneNumber;
        setSceneStatuses(prev => ({ ...prev, [sceneNumber]: { status: 'generating', logs: [] } }));
        
        const updateLog = (log: string) => {
            setSceneStatuses(prev => ({
                ...prev,
                [sceneNumber]: { ...prev[sceneNumber], logs: [...(prev[sceneNumber].logs || []), log] }
            }));
        };

        const prompt = constructPromptFromScene(scene);
        const isVeo3Model = generationModel.startsWith('veo-3.0');

        try {
            let videoUrl: string;
            if (isVeo3Model) {
                const options: VideoGenerationOptions = {
                    prompt, model: generationModel,
                    aspectRatio: generationAspectRatio as "16:9" | "9:16" | "4:3" | "3:4" | "1:1",
                    resolution: Resolution.FullHD,
                    soundEnabled: false,
                    image: referenceImage ? { file: referenceImage } : undefined,
                };
                videoUrl = await generateVideoV3(apiKey, options, updateLog);
            } else { // Veo 2
                videoUrl = await generateVideoV2(apiKey, prompt, generationModel, generationAspectRatio, scene.duration, false, referenceImage, updateLog);
            }
            setSceneStatuses(prev => ({ ...prev, [sceneNumber]: { status: 'completed', url: videoUrl } }));
        } catch (error) {
            const errorMessage = (error as Error).message;
            setSceneStatuses(prev => ({ ...prev, [sceneNumber]: { status: 'failed', error: errorMessage } }));
        }
    };
    
    const handleGenerateAll = async () => {
        setIsBatchGenerating(true);
        for (const scene of scenes) {
            if (sceneStatuses[scene.sceneNumber]?.status !== 'completed') {
                await handleGenerateVideo(scene);
            }
        }
        setIsBatchGenerating(false);
    };

    const CustomSelect: React.FC<{label: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: {value: string, label: string}[], small?: boolean}> = 
    ({label, value, onChange, options, small}) => (
        <div>
            <label className={`block text-xs font-medium text-text-secondary ${small ? 'mb-1' : ''}`}>{label}</label>
            <select value={value} onChange={onChange} className={`mt-1 block w-full bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${small ? 'py-1 px-2 text-sm' : 'py-2 px-3'}`}>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-background text-text-main -m-4 sm:-m-6 lg:-m-8">
            <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {isGeneratingScenes ? (
                    <div className="flex flex-col items-center justify-center text-center h-full animate-pulse">
                        <CreateStoryIcon />
                        <h2 className="mt-6 text-2xl font-semibold">{t('filmmaker.generating')}...</h2>
                    </div>
                ) : scenes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center h-full">
                        <CreateStoryIcon />
                        <h2 className="mt-6 text-2xl font-semibold">{t('filmmaker.createYourStory')}</h2>
                        <p className="mt-2 text-text-secondary max-w-md">{t('filmmaker.enterStoryIdea')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <header className="bg-surface border border-border rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h2 className="font-semibold text-text-main">{t('filmmaker.storyboardScenes')}</h2>
                                <p className="text-sm text-text-secondary">{t('filmmaker.scenesReady', { count: scenes.length })}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <CustomSelect small label={t('filmmaker.model')} value={generationModel} onChange={e => setGenerationModel(e.target.value)} options={FILMMAKER_MODELS} />
                                <CustomSelect small label={t('filmmaker.aspectRatio')} value={generationAspectRatio} onChange={e => setGenerationAspectRatio(e.target.value)} options={ASPECT_RATIOS} />
                                <div className="self-end">
                                    <button onClick={handleGenerateAll} disabled={isBatchGenerating} className="w-full bg-brand-green hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50 transition-opacity">
                                        {isBatchGenerating ? t('filmmaker.generatingAll') : t('filmmaker.generateAll')}
                                    </button>
                                </div>
                            </div>
                        </header>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {scenes.map(scene => (
                                <SceneCard 
                                    key={scene.sceneNumber} 
                                    scene={scene}
                                    status={sceneStatuses[scene.sceneNumber] || { status: 'idle' }}
                                    visualStyle={visualStyle}
                                    onGenerate={() => handleGenerateVideo(scene)}
                                    t={t}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <footer className="border-t border-border p-3 bg-surface flex-shrink-0">
                <input type="file" ref={imageInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setAdvancedSettingsOpen(!advancedSettingsOpen)} role="button" aria-expanded={advancedSettingsOpen}>
                        <div className="flex items-center gap-2">
                            <SettingsIcon />
                            <h3 className="font-semibold">{t('filmmaker.advancedSettings')}</h3>
                            <span className="text-sm text-text-secondary">({t('filmmaker.filmmakerWithVeo')})</span>
                        </div>
                        <ChevronIcon open={advancedSettingsOpen} />
                    </div>
                    
                    {advancedSettingsOpen && (
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary">{t('filmmaker.numberOfScenes')} ({numberOfScenes})</label>
                                    <input type="range" min="1" max="12" value={numberOfScenes} onChange={e => setNumberOfScenes(Number(e.target.value))} className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary mt-2" />
                                </div>
                                <CustomSelect label={t('filmmaker.visualStyle')} value={visualStyle} onChange={e => setVisualStyle(e.target.value)} options={VISUAL_STYLES} />
                                <CustomSelect label={t('filmmaker.dialogueLanguage')} value={dialogueLanguage} onChange={e => setDialogueLanguage(e.target.value)} options={DIALOGUE_LANGUAGES} />
                                <CustomSelect label={t('filmmaker.genre')} value={genre} onChange={e => setGenre(e.target.value)} options={GENRES} />
                                <CustomSelect label={t('filmmaker.targetAudience')} value={targetAudience} onChange={e => setTargetAudience(e.target.value)} options={TARGET_AUDIENCES} />
                                 <div className="lg:col-span-1">
                                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('filmmaker.referenceImage')}</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => imageInputRef.current?.click()} className="flex-1 bg-surface hover:bg-border border border-border text-text-main font-semibold py-2 px-3 rounded-md text-sm transition-colors">
                                            {referenceImage ? t('filmmaker.changeReferenceImage') : t('filmmaker.addReferenceImage')}
                                        </button>
                                        {referenceImage && (
                                            <button onClick={handleClearImage} className="text-xs text-text-secondary hover:text-red-400">
                                                {t('filmmaker.clear')}
                                            </button>
                                        )}
                                    </div>
                                    {referenceImagePreview && (
                                        <div className="mt-2 p-2 bg-background border border-border rounded-md">
                                            <img src={referenceImagePreview} alt="Reference Preview" className="max-h-24 w-full object-contain rounded" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <textarea
                                    className="w-full bg-background border border-border rounded-lg p-3 pr-12 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    rows={2}
                                    placeholder={t('filmmaker.storyIdeaPlaceholder')}
                                    value={storyIdea}
                                    onChange={(e) => setStoryIdea(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    maxLength={1000}
                                />
                                <button onClick={handleSceneSubmit} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main disabled:opacity-50 disabled:cursor-not-allowed" disabled={isGeneratingScenes || !storyIdea.trim()}>
                                    <SendIcon />
                                </button>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    {!apiKey && (
                                        <p className="text-sm text-yellow-400 animate-pulse">{t('filmmaker.apiKeyWarning')}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-text-secondary">
                                    <button onClick={handleEnhance} className="flex items-center gap-1.5 text-sm bg-surface hover:bg-border border border-border px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-text-main" disabled={isEnhancing || isGeneratingScenes || !storyIdea.trim()}>
                                        <EnhanceIcon />
                                        {t('filmmaker.enhanceTopic')}
                                    </button>
                                    <span>{storyIdea.length}/1000</span>
                                    <span className="hidden sm:inline">{t('filmmaker.keyboardInstructions')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default Filmmaker;