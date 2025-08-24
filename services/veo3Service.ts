import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import type { VideoGenerationOptions } from '../types.ts';
import { Resolution } from '../types.ts';
import { LOADING_MESSAGES } from "../constants.ts";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });

export const generateVideoV3 = async (
    apiKey: string,
    options: VideoGenerationOptions,
    onProgressUpdate: (message: string) => void
): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key is not provided. Please enter it in the header.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const isPreviewModel = options.model.includes('-preview');

    const config: any = {
        numberOfVideos: 1,
        aspectRatio: options.aspectRatio,
        soundEnabled: options.soundEnabled,
    };

    // VEO 3 release models do not support the resolution parameter, only preview models do.
    if (isPreviewModel) {
        config.resolutionHeightPixels = options.resolution === Resolution.FullHD ? 1080 : 720;
    }

    const request: any = {
        model: options.model,
        prompt: options.prompt,
        config: config
    };

    if (options.image) {
        onProgressUpdate("Encoding reference image...");
        const imageBytes = await fileToBase64(options.image.file);
        request.image = {
            imageBytes,
            mimeType: options.image.file.type,
        };
    }
    
    onProgressUpdate(`Sending request to ${options.model} model...`);
    let operation = await ai.models.generateVideos(request);
    
    let messageIndex = 0;

    while (!operation.done) {
        onProgressUpdate(LOADING_MESSAGES[messageIndex % LOADING_MESSAGES.length]);
        messageIndex++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    
    onProgressUpdate("Finalizing video download...");
    const result = operation as GenerateVideosOperation;
    const downloadLink = result.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!downloadLink) {
        throw new Error("Video URI not found in the API response.");
    }

    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video file. Status: ${videoResponse.statusText}`);
    }

    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
};