import React, { useState, useRef, useEffect } from 'react';
import { useTranslations, useApiKey } from '../contexts/LanguageContext.tsx';
import { generateVideo } from '../services/geminiService.ts';
import DownloadButton from './DownloadButton.tsx';

interface BatchResult {
    id: number;
    url: string;
    type: 'image' | 'video';
    prompt: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    error?: string;
}

// Defines the expected structure for scene data within this component,
// including 'prompt' and 'style' which are used to generate the video.
interface BatchScene {
    sceneNumber: number;
    duration: number;
    prompt: string;
    style: string;
}

interface BatchGeneratorProps {
}

const BatchGenerator: React.FC<BatchGeneratorProps> = () => {
    const { t } = useTranslations();
    const { apiKey } = useApiKey();
    const [inputText, setInputText] = useState('');
    const [results, setResults] = useState<BatchResult[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const addToLog = (message: string) => {
        setLogs(prev => [...prev, message]);
    };

    const handleStartBatch = async () => {
        if (!inputText.trim()) {
            alert(t('batchGenerator.placeholder'));
            return;
        }

        setIsGenerating(true);
        setResults([]);
        setLogs([t('batchGenerator.logWelcome')]);

        try {
            addToLog(t('batchGenerator.parsingInput'));
            const scenes: BatchScene[] = JSON.parse(inputText);
            
            if (!Array.isArray(scenes)) {
                throw new Error('Input is not a JSON array.');
            }
            
            const initialResults: BatchResult[] = scenes.map((scene) => ({
                id: scene.sceneNumber,
                url: '',
                type: 'video',
                prompt: scene.prompt,
                status: 'pending',
            }));
            setResults(initialResults);

            for (const scene of scenes) {
                setResults(prev => prev.map(r => r.id === scene.sceneNumber ? { ...r, status: 'generating' } : r));
                addToLog(t('batchGenerator.startingScene', { sceneNumber: scene.sceneNumber, prompt: scene.prompt }));

                try {
                    const finalPrompt = `${scene.prompt}, style: ${scene.style}`;
                    const resultUrl = await generateVideo(
                        apiKey,
                        finalPrompt,
                        'veo-2.0-generate-001', // Default model
                        '16:9', // Default aspect ratio
                        scene.duration,
                        false, // withSound
                        null, // referenceImage
                        (log) => addToLog(`[${t('storyboard.scenes.scene')} ${scene.sceneNumber}] ${log}`)
                    );
                    
                    setResults(prev => prev.map(r => 
                        r.id === scene.sceneNumber 
                        ? { ...r, status: 'completed', url: resultUrl, type: 'video' } 
                        : r
                    ));
                    addToLog(t('batchGenerator.sceneComplete', { sceneNumber: scene.sceneNumber }));

                } catch (error) {
                     const errorMessage = (error as Error).message;
                     setResults(prev => prev.map(r => 
                        r.id === scene.sceneNumber
                        ? { ...r, status: 'failed', error: errorMessage } 
                        : r
                    ));
                    addToLog(`${t('batchGenerator.sceneFailed', { sceneNumber: scene.sceneNumber })}: ${errorMessage}`);
                }
            }
            addToLog(t('batchGenerator.batchComplete'));
        } catch (error) {
            addToLog(`${t('batchGenerator.invalidJson')}: ${(error as Error).message}`);
            alert(t('batchGenerator.invalidJson'));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-surface p-6 rounded-lg shadow-lg border border-border space-y-4">
                <h2 className="text-xl font-semibold border-b border-border pb-3 text-secondary">{t('batchGenerator.title')}</h2>
                <p className="text-text-secondary">{t('batchGenerator.description')}</p>
                <div>
                    <label htmlFor="batch-input" className="block text-sm font-medium text-text-secondary mb-2">{t('batchGenerator.inputLabel')}</label>
                    <textarea
                        id="batch-input"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t('batchGenerator.placeholder')}
                        rows={10}
                        className="w-full bg-background border border-border rounded-md p-3 font-mono text-sm"
                        disabled={isGenerating}
                    />
                </div>
                 <button
                    onClick={handleStartBatch}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:from-surface disabled:to-surface disabled:text-text-secondary transition-opacity"
                >
                    {isGenerating ? t('batchGenerator.generating') : t('batchGenerator.startButton')}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface p-6 rounded-lg shadow-lg border border-border space-y-4">
                    <h2 className="text-xl font-semibold text-secondary">{t('batchGenerator.resultsTitle')}</h2>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto p-2 bg-background rounded-md">
                        {results.length === 0 && !isGenerating && (
                            <p className="col-span-full text-center text-text-secondary py-10">{t('batchGenerator.resultPlaceholder')}</p>
                        )}
                        {results.map(result => (
                            <div key={result.id} className="relative aspect-video bg-border rounded-lg flex items-center justify-center text-center p-2">
                                {result.status === 'pending' && <span className="text-xs text-text-secondary">Pending...</span>}
                                {result.status === 'generating' && <span className="text-xs text-text-secondary animate-pulse">Generating...</span>}
                                {result.status === 'completed' && result.type === 'video' && (
                                    <video src={result.url} controls className="w-full h-full object-contain rounded-md" />
                                )}
                                {result.status === 'completed' && result.type === 'image' && (
                                    <img src={result.url} alt={`Scene ${result.id}`} className="w-full h-full object-contain rounded-md" />
                                )}
                                {result.status === 'failed' && <span className="text-xs text-red-400">Failed</span>}
                                
                                {result.status === 'completed' && (
                                    <DownloadButton mediaUrl={result.url} mediaType={result.type} className="top-1 right-1 z-10" />
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate" title={result.prompt}>{result.prompt}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-surface p-6 rounded-lg shadow-lg border border-border flex flex-col">
                    <h2 className="text-xl font-semibold text-secondary mb-4">{t('batchGenerator.logTitle')}</h2>
                    <div ref={logContainerRef} className="bg-background rounded-md p-3 flex-grow h-64 overflow-y-auto font-mono text-sm text-text-secondary">
                         {logs.map((log, index) => <p key={index} className="leading-relaxed">{`> ${log}`}</p>)}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default BatchGenerator;