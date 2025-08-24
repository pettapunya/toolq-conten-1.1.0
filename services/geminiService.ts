import { GoogleGenAI, Type, GenerateContentResponse, GenerateImagesResponse, GenerateVideosOperation } from "@google/genai";
import { Scene } from "../types.ts";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const checkApiKey = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("API Key is not provided. Please enter it in the header.");
    }
};

const promptEnhanceSchema = {
    type: Type.OBJECT,
    properties: {
        subject: { type: Type.STRING, description: "The main subject or focus of the prompt." },
        action: { type: Type.STRING, description: "The primary action the subject is performing." },
        environment: { type: Type.STRING, description: "The setting, background, or location." },
        style: { type: Type.STRING, description: "Artistic style, mood, or aesthetic (e.g., photorealistic, cinematic, anime)." },
        composition: { type: Type.STRING, description: "The shot type and camera details (e.g., close-up, wide shot, low angle)." },
        lighting: { type: Type.STRING, description: "A detailed description of the scene's lighting." },
        details: { 
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Additional descriptive details to make the scene more vivid."
        }
    }
};

const storyEnhanceSchema = {
    type: Type.OBJECT,
    properties: {
        enhanced_story: { type: Type.STRING, description: "The full enhanced story text with rich visual details, sensory descriptions, and cinematic language." },
        key_visuals: { 
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of key visual moments or striking elements from the story that could be turned into scenes."
        },
        suggested_mood: { type: Type.STRING, description: "The overall mood or tone of the story (e.g., mysterious, joyful, tense)." }
    }
};

const creativeTextEnhanceSchema = {
    type: Type.OBJECT,
    properties: {
        enhanced_text: { type: Type.STRING, description: "The enhanced, more descriptive and evocative version of the original text." },
        key_themes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of key themes or ideas present in the text."
        }
    }
};

const handleJsonResponse = (response: GenerateContentResponse) => {
    let resultText = response.text.trim();
    try {
        // Prettify the JSON string
        return JSON.stringify(JSON.parse(resultText), null, 2);
    } catch (e) {
        console.error("Failed to parse or stringify enhanced JSON. Returning raw text.", e);
        return resultText; // Return raw text if parsing/stringifying fails
    }
}


export const enhancePrompt = async (apiKey: string, prompt: string, language: 'en' | 'id', format: 'normal' | 'json'): Promise<string> => {
    checkApiKey(apiKey);
    if (!prompt) throw new Error("Prompt to enhance is missing.");
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const languageText = language === 'id' ? 'Indonesian' : 'English';
        const formatInstruction = format === 'json'
            ? 'The final output must be a structured JSON object based on the defined schema. Do not include any text outside of the JSON.'
            : 'The final output should be only the enhanced prompt, ready to be used.';
        
        const systemInstruction = `You are an expert prompt engineer specializing in AI video and image generation. Your task is to take a user's prompt and enhance it. Make it more descriptive, detailed, and evocative. Add specific details about subjects, actions, environment, lighting, camera angles, composition, and overall mood or style. Your response must be in ${languageText}. ${formatInstruction}`;

        const config: any = { systemInstruction };
        if (format === 'json') {
            config.responseMimeType = 'application/json';
            config.responseSchema = promptEnhanceSchema;
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Enhance this prompt: "${prompt}"`,
            config
        });

        return format === 'json' ? handleJsonResponse(response) : response.text.trim();
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        throw new Error("Failed to enhance prompt. Please check your API key and the console for more details.");
    }
};

export const enhanceCreativeText = async (
    apiKey: string,
    text: string,
    context: string,
    language: 'en' | 'id', 
    format: 'normal' | 'json'
): Promise<string> => {
    checkApiKey(apiKey);
    if (!text) throw new Error("Text to enhance is missing.");
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const languageText = language === 'id' ? 'Indonesian' : 'English';
        const formatInstruction = format === 'json'
            ? 'The final output must be a structured JSON object based on the defined schema. Do not include any text outside of the JSON.'
            : 'The final output should be only the enhanced text itself, without any preamble or explanation.';

        const systemInstruction = `You are a creative assistant. Your task is to take a user's text and enhance it. Make it more descriptive, detailed, and evocative, according to the following context: "${context}". Your response must be in ${languageText}. ${formatInstruction}`;
        
        const config: any = { systemInstruction };
        if (format === 'json') {
            config.responseMimeType = 'application/json';
            config.responseSchema = creativeTextEnhanceSchema;
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Enhance this text: "${text}"`,
            config
        });

        return format === 'json' ? handleJsonResponse(response) : response.text.trim();
    } catch (error) {
        console.error("Error enhancing creative text:", error);
        throw new Error("Failed to enhance text. Please check your API key and the console for more details.");
    }
};

export const enhanceTextForSpeech = async (apiKey: string, text: string): Promise<string> => {
    checkApiKey(apiKey);
    if (!text) throw new Error("Text to enhance is missing.");
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const systemInstruction = "You are a creative writer and dialogue expert. Your task is to take the user's text and enhance it to sound more natural and engaging when spoken aloud. You can fix grammar, improve flow, and make the language more vivid, but do not change the core meaning or the speaker structure (if present). The final output should be only the enhanced text, ready for text-to-speech synthesis.";

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Enhance this text for speech: "${text}"`,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error enhancing text for speech:", error);
        throw new Error("Failed to enhance text. Please check your API key and the console for more details.");
    }
};


export const enhanceStory = async (apiKey: string, story: string, language: 'en' | 'id', format: 'normal' | 'json'): Promise<string> => {
    checkApiKey(apiKey);
    if (!story) throw new Error("Story to enhance is missing.");
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const languageText = language === 'id' ? 'Indonesian' : 'English';
        const formatInstruction = format === 'json'
            ? 'The final output must be a structured JSON object based on the defined schema. Do not include any text outside of the JSON.'
            : 'The final output should be only the enhanced story text.';

        const systemInstruction = `You are an expert screenwriter and storyteller. Your task is to take a user's story or narrative and enhance it for visual media. Embellish the story with rich visual details, sensory descriptions, character emotions, and cinematic language. Flesh out the scenes without changing the core plot. The goal is to make the story more vivid and ready for storyboarding. Your response must be in ${languageText}. ${formatInstruction}`;

        const config: any = { systemInstruction };
        if (format === 'json') {
            config.responseMimeType = 'application/json';
            config.responseSchema = storyEnhanceSchema;
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Enhance this story: "${story}"`,
            config
        });

        return format === 'json' ? handleJsonResponse(response) : response.text.trim();
    } catch (error) {
        console.error("Error enhancing story:", error);
        throw new Error("Failed to enhance story. Please check your API key and the console for more details.");
    }
};

export const generateAffiliateScript = async (
    apiKey: string,
    productLink: string,
    languageStyle: string,
    writingLength: string,
    numVariations: number
): Promise<string> => {
    checkApiKey(apiKey);
    if (!productLink) throw new Error("Product link is missing.");

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `You are an expert affiliate content creator. Your task is to generate compelling marketing scripts for a product.
        
        Product Link: ${productLink}
        
        Instructions:
        1. Use Google Search to find information about the product at the provided link. Analyze its features, benefits, and target audience.
        2. Generate ${numVariations} unique script variation(s).
        3. The language style must be: ${languageStyle}.
        4. The desired length for each script is: ${writingLength}.
        5. The scripts should be engaging, persuasive, and designed to drive conversions. Highlight key selling points.
        
        Begin the generation now.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        return response.text.trim();

    } catch (error) {
        console.error("Error generating affiliate script:", error);
        throw new Error("Failed to generate script. Please check your product link, API key, and the console for more details.");
    }
};


export const generatePromptIdeas = async (
    apiKey: string,
    idea: string,
    model: string,
    promptType: string,
    composition: string,
    language: string,
    imageFile?: File | null
): Promise<string> => {
    checkApiKey(apiKey);
    try {
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Based on the following user idea, and optionally the provided image, generate a detailed and creative prompt suitable for an AI media generator.
        
        User Idea: "${idea}"
        
        Constraints:
        - Target Model: Veo/Imagen
        - Prompt Type: ${promptType}
        - Desired Composition: ${composition}
        - Language: ${language}
        
        Generate a single, high-quality prompt that is ready to be used.`;
        
        let contents;
        if (imageFile) {
            const imagePart = await fileToGenerativePart(imageFile);
            contents = { parts: [imagePart, { text: prompt }] };
        } else {
            contents = { parts: [{ text: prompt }] };
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, 
            contents: contents,
        });

        return response.text;
    } catch (error) {
        console.error("Error generating prompt ideas:", error);
        return "Failed to generate ideas. Please check your API key and the console for more details.";
    }
};

export const generatePromptIdeasAsJson = async (
    apiKey: string,
    idea: string,
    model: string,
    imageFile?: File | null
): Promise<string> => {
    checkApiKey(apiKey);
    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Based on the following user idea, and optionally the provided image, generate a structured JSON prompt. The JSON should be suitable for creating a detailed prompt for an AI image/video generator. Include keys like subject, action, location, style, composition, and details.
        
        User Idea: "${idea}"`;
        
        let contents;
        if (imageFile) {
            const imagePart = await fileToGenerativePart(imageFile);
            contents = { parts: [imagePart, { text: prompt }] };
        } else {
            contents = { parts: [{ text: prompt }] };
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, 
            contents: contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING, description: "The main subject of the idea." },
                        action: { type: Type.STRING, description: "What the subject is doing." },
                        location: { type: Type.STRING, description: "The setting or background." },
                        style: { type: Type.STRING, description: "Artistic style (e.g., photorealistic, anime, digital art)." },
                        composition: { type: Type.STRING, description: "The shot type (e.g., close-up, wide shot)." },
                        details: { 
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Additional descriptive details."
                        }
                    }
                }
            }
        });

        return JSON.stringify(JSON.parse(response.text), null, 2);
    } catch (error) {
        console.error("Error generating JSON prompt ideas:", error);
        return "Failed to generate JSON ideas. Please check your API key and the console for more details.";
    }
};

export const analyzeImageForPrompt = async (apiKey: string, imageFile: File): Promise<string> => {
    checkApiKey(apiKey);
    try {
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = await fileToGenerativePart(imageFile);
        const prompt = "Describe this image in detail, creating a descriptive prompt that could be used to generate a similar image with an AI model like Imagen or Veo.";
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, {text: prompt}] },
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing image for prompt:", error);
        throw new Error("Failed to analyze image. Please check your API key and the console for more details.");
    }
};

export const analyzeImageForJsonPrompt = async (apiKey: string, imageFile: File): Promise<string> => {
    checkApiKey(apiKey);
    try {
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = await fileToGenerativePart(imageFile);
        const prompt = "Analyze this image and describe its contents in a structured JSON format. The JSON should be suitable for creating a detailed prompt for an AI image/video generator. Include keys like subject, action, location, style, composition, and details.";
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, {text: prompt}] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING, description: "The main subject of the image." },
                        action: { type: Type.STRING, description: "What the subject is doing." },
                        location: { type: Type.STRING, description: "The setting or background." },
                        style: { type: Type.STRING, description: "Artistic style (e.g., photorealistic, anime, digital art)." },
                        composition: { type: Type.STRING, description: "The shot type (e.g., close-up, wide shot)." },
                        details: { 
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Additional descriptive details."
                        }
                    }
                }
            }
        });
        
        return JSON.stringify(JSON.parse(response.text), null, 2);
    } catch (error) {
        console.error("Error analyzing image for JSON prompt:", error);
        throw new Error("Failed to analyze image for a JSON prompt. Check your API key.");
    }
};

export const analyzeImageForMetadata = async (apiKey: string, imageFile: File): Promise<string> => {
    checkApiKey(apiKey);
    try {
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = await fileToGenerativePart(imageFile);
        const prompt = "Analyze this image and generate a suitable title, a short description, and an array of relevant keywords for it.";

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, {text: prompt}] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        keywords: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        
        return response.text;
    } catch (error) {
        console.error("Error analyzing image for metadata:", error);
        throw new Error("Failed to analyze image for metadata. Check your API key.");
    }
};


export const generateImage = async (
    apiKey: string,
    prompt: string,
    aspectRatio: string,
    isTransparent: boolean,
    isHighQuality: boolean,
    resolution?: 'standard' | '2k' | '4k' | '8k'
): Promise<string> => {
    checkApiKey(apiKey);
    try {
        const ai = new GoogleGenAI({ apiKey });
        let finalPrompt = prompt;

        if (resolution) {
            switch (resolution) {
                case '2k': finalPrompt += ", 2K resolution, high detail, sharp focus"; break;
                case '4k': finalPrompt += ", 4K resolution, ultra detailed, photorealistic"; break;
                case '8k': finalPrompt += ", 8K resolution, masterpiece, hyper-detailed"; break;
                default: // standard
                    if (isHighQuality) {
                        finalPrompt += ", high quality, detailed";
                    }
                    break;
            }
        } else if (isHighQuality) {
            finalPrompt += ", 4k, photorealistic, ultra detailed";
        }

        const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
        const response: GenerateImagesResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: finalPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: mimeType,
                aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        });

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const dataUrl = `data:${mimeType};base64,${base64ImageBytes}`;
        const blob = await(await fetch(dataUrl)).blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image. Please check your prompt and API key.");
    }
};

export const generateImages = async (
    apiKey: string,
    prompt: string,
    aspectRatio: string,
    numberOfImages: number,
    isTransparent: boolean,
    isHighQuality: boolean
): Promise<string[]> => {
    checkApiKey(apiKey);
    try {
        const ai = new GoogleGenAI({ apiKey });
        let finalPrompt = prompt;
        if (isHighQuality) {
            finalPrompt += ", 4k, photorealistic, ultra detailed";
        }
        
        const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
        const allResults: string[] = [];
        const BATCH_SIZE = 8; // A safe batch size to avoid timeouts. Imagen 3's max is 16.

        let remainingImages = numberOfImages;

        while (remainingImages > 0) {
            const imagesInThisBatch = Math.min(remainingImages, BATCH_SIZE);

            const response: GenerateImagesResponse = await ai.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: finalPrompt,
                config: {
                    numberOfImages: imagesInThisBatch,
                    outputMimeType: mimeType,
                    aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
                },
            });
            
            // Process results in parallel for this batch
            const batchResultPromises = response.generatedImages.map(async (img) => {
                const dataUrl = `data:${mimeType};base64,${img.image.imageBytes}`;
                const blob = await(await fetch(dataUrl)).blob();
                return URL.createObjectURL(blob);
            });
            const batchResults = await Promise.all(batchResultPromises);
            allResults.push(...batchResults);

            remainingImages -= imagesInThisBatch;
        }

        return allResults;

    } catch (error) {
        console.error("Error generating images:", error);
        throw new Error("Failed to generate images. Please check your prompt and API key.");
    }
};

export const upscaleImage = async (apiKey: string, imageFile: File, aspectRatio: string, megapixels: number): Promise<string> => {
    checkApiKey(apiKey);
    if (!imageFile) throw new Error("File for upscaling is not provided.");

    try {
        const descriptivePrompt = await analyzeImageForPrompt(apiKey, imageFile);
        // Construct a highly specific prompt for upscaling, emphasizing quality and resolution.
        const upscalePrompt = `${descriptivePrompt}, ultra-high resolution, ${megapixels}MP, 8k, professional photography, sharp focus, intricate details, photorealistic`;
        // Call generateImage with isHighQuality set to false, as we've constructed our own high-quality prompt.
        return await generateImage(apiKey, upscalePrompt, aspectRatio, false, false);
    } catch (error) {
        console.error("Error upscaling image:", error);
        throw new Error("Failed to upscale image. This may be due to an issue with analyzing or regenerating the image.");
    }
};


export const generateVideo = async (
    apiKey: string,
    prompt: string,
    model: string,
    aspectRatio: string,
    duration: number,
    withSound: boolean,
    referenceImage: File | null,
    onProgress: (message: string) => void
): Promise<string> => {
    checkApiKey(apiKey);
    try {
        const ai = new GoogleGenAI({ apiKey });
        onProgress("Initializing video generation...");

        const config = {
            numberOfVideos: 1,
            aspectRatio: aspectRatio as "16:9" | "9:16" | "4:3" | "3:4" | "1:1",
            duration,
            withSound,
        };
        
        let image;
        if (referenceImage) {
            const imagePart = await fileToGenerativePart(referenceImage);
            image = { imageBytes: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
        }

        onProgress(`Sending prompt to ${model}...`);
        let operation: GenerateVideosOperation = await ai.models.generateVideos({
            model: model,
            prompt: prompt,
            image: image,
            config,
        });

        onProgress("Video generation started. This may take a few minutes...");
        onProgress(`Polling for results every 10 seconds. Operation name: ${operation.name}`);

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            onProgress("Checking operation status...");
            operation = await ai.operations.getVideosOperation({ operation: operation });
            
            if (operation.metadata?.progressPercentage) {
                 onProgress(`Progress: ${(operation.metadata.progressPercentage as number).toFixed(2)}%`);
            }
        }
        
        if (operation.error) {
            throw new Error(`Operation failed: ${operation.error.message}`);
        }

        onProgress("Generation complete! Fetching video...");
        
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation succeeded, but no download link was found.");
        }

        const videoUrlWithKey = `${downloadLink}&key=${apiKey}`;
        
        onProgress("Downloading video data...");
        const response = await fetch(videoUrlWithKey);
        if (!response.ok) {
            throw new Error(`Failed to fetch video from storage. Status: ${response.statusText}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        onProgress("Video ready for preview.");

        return objectUrl;

    } catch (error) {
        console.error("Error generating video:", error);
        onProgress(`Error: ${(error as Error).message}`);
        throw error;
    }
};

export const generateStoryboardScenes = async (
    apiKey: string, 
    story: string, 
    numberOfScenes: number,
    visualStyle: string,
    dialogueLanguage: string,
    genre: string,
    targetAudience: string,
    referenceImage?: File | null
): Promise<Scene[]> => {
    checkApiKey(apiKey);
    if (!story) throw new Error("Story is missing.");
    if (!numberOfScenes) throw new Error("Number of scenes is missing.");

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const imageInstruction = referenceImage ? "Consider the style, mood, and content of the provided reference image when creating the prompts. " : "";

        const systemInstruction = `You are an expert screenwriter and storyboard director. Your task is to read the following story and break it down into exactly ${numberOfScenes} distinct scenes for a video.
        
Story Constraints:
- Genre: ${genre}
- Target Audience: ${targetAudience}
- Desired Visual Style: ${visualStyle}
- Dialogue Language: ${dialogueLanguage}

${imageInstruction}

For each scene, provide a detailed breakdown with the following structure:
- "setting": Describe the environment and location in visual detail.
- "characters": List each character and their specific actions or expressions in that scene.
- "camera": Specify the camera shot, angle, and any movement.
- "dialogue": Write any dialogue spoken. If none, write "None".
- "duration": Estimate a duration in seconds, typically between 3 to 8 seconds.

The entire output must be a valid JSON array of scene objects, adhering to the specified schema. Ensure all character actions and dialogue are in ${dialogueLanguage}.`;

        const textPrompt = `Here is the story: "${story}"`;
        
        let contents;
        if (referenceImage) {
            const imagePart = await fileToGenerativePart(referenceImage);
            contents = { parts: [imagePart, { text: textPrompt }] };
        } else {
            contents = { parts: [{ text: textPrompt }] };
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sceneNumber: { type: Type.INTEGER },
                            duration: { type: Type.INTEGER, description: "Estimated duration in seconds, between 3 and 8." },
                            setting: { type: Type.STRING, description: "A detailed description of the scene's setting and environment." },
                            characters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of actions or descriptions for each character present in the scene, formatted as 'Character: Action.'." },
                            camera: { type: Type.STRING, description: "Camera shot type, angle, and movement (e.g., 'Medium shot, eye level, static')." },
                            dialogue: { type: Type.STRING, description: "Any dialogue spoken in the scene. Use 'None' if no dialogue." }
                        },
                        required: ["sceneNumber", "duration", "setting", "characters", "camera", "dialogue"],
                    },
                },
            },
        });

        const resultText = response.text.trim();
        const scenes: Scene[] = JSON.parse(resultText);
        return scenes;

    } catch (error) {
        console.error("Error generating storyboard scenes:", error);
        throw new Error("Failed to generate storyboard scenes. Please check your story and API key.");
    }
};

export const translateText = async (apiKey: string, text: string, targetLanguage: 'indonesian' | 'english'): Promise<string> => {
    checkApiKey(apiKey);
    if (!text) return "";
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following text to ${targetLanguage}. Output only the translated text, without any additional comments or formatting. Text to translate: "${text}"`,
        });
        return response.text.trim();
    } catch (error) {
        console.error(`Error translating text to ${targetLanguage}:`, error);
        return text; // Fallback to original text on error
    }
};