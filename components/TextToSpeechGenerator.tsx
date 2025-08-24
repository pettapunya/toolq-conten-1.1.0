import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations, useApiKey } from '../contexts/LanguageContext.tsx';
import { enhanceTextForSpeech } from '../services/geminiService.ts';

const LMNT_API_BASE = 'https://api.lmnt.com/v1';

interface LmntVoice {
    id: string;
    name: string;
    gender: string;
    state: string;
    language: string;
}

const listLmntVoices = async (apiKey: string): Promise<LmntVoice[]> => {
    if (!apiKey) return [];
    const response = await fetch(`${LMNT_API_BASE}/voices`, {
        headers: { 'X-API-Key': apiKey },
    });
    if (!response.ok) {
        throw new Error(`Status: ${response.status}`);
    }
    const data = await response.json();
    return data.voices;
};

const synthesizeSpeech = async (apiKey: string, text: string, voiceId: string): Promise<string> => {
    if (!apiKey || !text || !voiceId) throw new Error("API Key, text, and voice ID are required.");
    const response = await fetch(`${LMNT_API_BASE}/speech`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify({
            text,
            voice: voiceId,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to synthesize speech. Status: ${response.status}`);
    }
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
};


const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93V17h-2v-2.07A8.002 8.002 0 012 8V7h2v1a6 6 0 1012 0V7h2v1a8.002 8.002 0 01-6 7.93z" clipRule="evenodd" /></svg>;
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.998 5.998 0 0110 14c-1.476 0-2.822-.57-3.83-1.504a6.01 6.01 0 01-1.838-3.469z" clipRule="evenodd" /></svg>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.23l4.484 1.121a1 1 0 01.54 1.77l-3.243 3.16.766 4.464a1 1 0 01-1.451 1.054L10 15.547l-4.015 2.11a1 1 0 01-1.451-1.054l.766-4.464-3.243-3.16a1 1 0 01.54-1.77l4.484-1.121L9.033 2.744A1 1 0 0110 2h2z" clipRule="evenodd" /></svg>;


export default function TextToSpeechGenerator() {
    const { t } = useTranslations();
    const { apiKey: googleApiKey } = useApiKey();
    const [lmntApiKey, setLmntApiKey] = useState("ak_LAhWWrGFtgNvnfFJGdrTyS");
    const audioPlayerRef = useRef<HTMLAudioElement>(null);

    const [text, setText] = useState("");
    const [voices, setVoices] = useState<LmntVoice[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState("leah");
    
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    // Fetch voices whenever API key changes
    useEffect(() => {
        if (!lmntApiKey) {
            setVoices([]);
            return;
        }
        setIsLoadingVoices(true);
        setError(null);
        listLmntVoices(lmntApiKey)
            .then(fetchedVoices => {
                setVoices(fetchedVoices);
                if (fetchedVoices.length > 0 && !fetchedVoices.some(v => v.id === selectedVoiceId)) {
                    setSelectedVoiceId(fetchedVoices[0].id);
                }
            })
            .catch(err => {
                setError(t('textToSpeech.apiKeyError', { errorDetails: (err as Error).message }));
                setVoices([]);
            })
            .finally(() => setIsLoadingVoices(false));
    }, [lmntApiKey, t]);

    const handleGenerate = async () => {
        if (!text.trim() || !lmntApiKey || !selectedVoiceId || isGenerating) return;

        setIsGenerating(true);
        setError(null);
        setAudioUrl(null);
        setProgress(0);

        try {
            const url = await synthesizeSpeech(lmntApiKey, text, selectedVoiceId);
            setAudioUrl(url);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSuggestion = (type: 'upsell' | 'listen' | 'random') => {
        const suggestions = {
            upsell: "Discover the new Quantum-X smartphone, featuring a holographic display and all-day battery life. Pre-order now and get a free pair of our noise-cancelling earbuds.",
            listen: "Hi, I'm calling about my recent order. It seems one of the items was missing from the package. Can you help me with that?",
            random: "The old bookstore, nestled between a laundromat and a bakery, smelled of aging paper and fresh bread, a curious but comforting combination."
        };
        setText(suggestions[type]);
    };

    const handleEnhance = async () => {
        if (!text || !googleApiKey) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhanceTextForSpeech(googleApiKey, text);
            setText(enhanced);
        } catch(e) {
            setError((e as Error).message);
        } finally {
            setIsEnhancing(false);
        }
    };
    
    const togglePlayPause = () => {
        if (audioPlayerRef.current) {
            if (isPlaying) {
                audioPlayerRef.current.pause();
            } else {
                audioPlayerRef.current.play();
            }
        }
    };
  
    const selectedVoice = useMemo(() => voices.find(v => v.id === selectedVoiceId), [voices, selectedVoiceId]);

    return (
        <div className="w-full bg-background text-text-main p-4 md:p-6 lg:p-8 font-sans">
            <audio 
                ref={audioPlayerRef} 
                src={audioUrl || ''}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => { setIsPlaying(false); setProgress(0); }}
                onTimeUpdate={() => {
                    if (audioPlayerRef.current) {
                        const { currentTime, duration } = audioPlayerRef.current;
                        setProgress(duration > 0 ? (currentTime / duration) * 100 : 0);
                    }
                }}
                className="hidden" 
            />
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-grow flex flex-col">
                    <div className="relative flex-grow">
                         <textarea
                            className="w-full h-full bg-surface border border-border rounded-lg p-6 text-lg outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-secondary/50 resize-none min-h-[400px] md:min-h-[600px]"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={t('textToSpeech.placeholder')}
                            disabled={isGenerating || isEnhancing}
                        />
                         <button 
                            onClick={handleEnhance} 
                            disabled={!text || !googleApiKey || isEnhancing || isGenerating}
                            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary font-semibold rounded-full border border-secondary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <SparklesIcon />
                            <span>{isEnhancing ? t('common.enhancing') : 'AI Enhancer'}</span>
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-4 bg-surface rounded-lg border border-border">
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-sm text-text-secondary">{t('textToSpeech.suggestions.title')}</span>
                            <button onClick={() => handleSuggestion('upsell')} className="text-sm text-text-main hover:text-primary transition-colors">{t('textToSpeech.suggestions.upsell')}</button>
                            <button onClick={() => handleSuggestion('listen')} className="text-sm text-text-main hover:text-primary transition-colors">{t('textToSpeech.suggestions.listen')}</button>
                            <button onClick={() => handleSuggestion('random')} className="text-sm text-text-main hover:text-primary transition-colors">{t('textToSpeech.suggestions.random')}</button>
                        </div>
                        {audioUrl ? (
                            <div className="flex items-center gap-3 bg-background p-2 rounded-lg border border-border">
                                <button onClick={togglePlayPause} className="text-text-main hover:text-primary transition-colors">
                                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                </button>
                                <div className="w-40 h-1 bg-border rounded-full">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        ) : (
                             <button onClick={handleGenerate} disabled={isGenerating || !text || voices.length === 0} className="px-8 py-3 bg-primary hover:opacity-90 text-white font-bold rounded-lg disabled:opacity-50 disabled:bg-surface disabled:text-text-secondary transition-all">
                                {isGenerating ? t('textToSpeech.generating') : t('textToSpeech.generateButton')}
                            </button>
                        )}
                    </div>
                </div>

                <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 space-y-6">
                    <div className="bg-surface p-4 rounded-lg border border-border space-y-2">
                        <label className="text-sm text-text-secondary">{t('textToSpeech.lmntApiKeyLabel')}</label>
                        <input
                            type="password"
                            value={lmntApiKey}
                            onChange={(e) => setLmntApiKey(e.target.value)}
                            className="w-full bg-background border border-border rounded-md py-1.5 px-3 text-sm"
                        />
                        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-text-secondary">
                            <MicIcon />
                            <div className="flex-grow">
                                <label className="text-sm">{t('textToSpeech.voiceLabel')}</label>
                                {isLoadingVoices ? <div className="text-lg text-text-main font-semibold animate-pulse">Loading...</div> : 
                                <select
                                    className="block w-full bg-transparent text-lg text-text-main font-semibold outline-none appearance-none cursor-pointer"
                                    value={selectedVoiceId}
                                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                                    disabled={isLoadingVoices || voices.length === 0}
                                >
                                    {voices.map(v => <option key={v.id} value={v.id} className="bg-surface text-text-main">{v.name}</option>)}
                                </select>
                                }
                            </div>
                        </div>
                        <div className="w-full h-px bg-border"></div>
                        <div className="flex items-center gap-4 text-text-secondary">
                            <GlobeIcon />
                             <div className="flex-grow">
                                <label className="text-sm">{t('textToSpeech.languageLabel')}</label>
                                <p className="text-lg text-text-main font-semibold">{selectedVoice?.language || t('textToSpeech.languageAutoDetect')}</p>
                            </div>
                        </div>
                         <div className="w-full h-px bg-border"></div>
                    </div>
                </aside>
            </div>
        </div>
    );
}