import { SelectOption, Resolution } from './types.ts';

type TFunction = (key: string) => string;

export const getGeneratorModels = (t: TFunction): SelectOption[] => [
  { value: 'veo-3.0-generate-001', label: t('models.veo3_new') },
  { value: 'veo-3.0-fast-generate-001', label: t('models.veo3_fast') },
  { value: 'veo-3.0-generate-preview', label: t('models.veo3') },
  { value: 'veo-3.0-fast-generate-preview', label: t('models.veo3_fast_preview') },
  { value: 'veo-2.0-generate-001', label: t('models.veo') },
  { value: 'imagen-3.0-generate-002', label: t('models.imagen') },
];

export const getFilmmakerModels = (t: TFunction): SelectOption[] => [
  { value: 'veo-3.0-generate-001', label: t('models.veo3_new') },
  { value: 'veo-3.0-fast-generate-001', label: t('models.veo3_fast') },
  { value: 'veo-3.0-generate-preview', label: t('models.veo3') },
  { value: 'veo-3.0-fast-generate-preview', label: t('models.veo3_fast_preview') },
  { value: 'veo-2.0-generate-001', label: t('models.veo') },
];

export const getVeoModels = (t: TFunction): SelectOption[] => [
  { value: 'veo-3.0-generate-001', label: 'Veo 3' },
  { value: 'veo-3.0-fast-generate-001', label: 'Veo 3 Fast' },
  { value: 'veo-3.0-generate-preview', label: 'Veo 3 Preview' },
  { value: 'veo-3.0-fast-generate-preview', label: 'Veo 3 Fast Preview' },
  { value: 'veo-2.0-generate-001', label: 'Veo 2' },
];

export const getAspectRatios = (t: TFunction): SelectOption[] => [
  { value: '16:9', label: t('aspectRatios.landscape') },
  { value: '9:16', label: t('aspectRatios.portrait') },
  { value: '4:3', label: t('aspectRatios.standard') },
  { value: '3:4', label: t('aspectRatios.tall') },
  { value: '1:1', label: t('aspectRatios.square') },
];

export const getVideoQualities = (t: TFunction): SelectOption[] => [
    { value: 'high', label: t('qualities.high') },
    { value: 'standard', label: t('qualities.standard') },
];

export const getResolutions = (t: TFunction): SelectOption[] => [
    { value: Resolution.FullHD, label: t('resolutions.fullHd') },
    { value: Resolution.HD, label: t('resolutions.hd') },
];

export const getStyles = (t: TFunction): SelectOption[] => [
    { value: 'photorealistic', label: t('styles.photorealistic') },
    { value: 'cinematic', label: t('styles.cinematic') },
    { value: 'digital-art', label: t('styles.digitalArt') },
    { value: 'anime', label: t('styles.anime') },
    { value: 'fantasy', label: t('styles.fantasy') },
    { value: 'chibi-style', label: t('styles.chibi') },
    { value: 'pixar-disney-inspired', label: t('styles.pixar') },
    { value: 'cartoon-animal', label: t('styles.cartoonAnimal') },
    { value: '2d-animation', label: t('styles.anim2d') },
    { value: '3d-animation', label: t('styles.anim3d') },
    { value: 'stop-motion', label: t('styles.stopMotion') },
    { value: 'motion-graphic', label: t('styles.motionGraphic') },
    { value: 'silhouette-shadow', label: t('styles.silhouette') },
    { value: 'toon-shader', label: t('styles.toonShader') },
    { value: 'cell-shading', label: t('styles.cellShading') },
    { value: 'cyberpunk', label: t('styles.cyberpunk') },
    { value: 'vaporwave', label: t('styles.vaporwave') },
    { value: 'ghibli-style', label: t('styles.ghibli') },
    { value: 'paper-cut-out', label: t('styles.paperCut') },
    { value: 'kawaii-pastel', label: t('styles.kawaii') },
];

export const getPromptHelperModels = (t: TFunction): SelectOption[] => [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

export const getPromptTypes = (t: TFunction): SelectOption[] => [
    { value: 'normal', label: t('promptTypes.normal') },
    { value: 'veo-split-screen', label: t('promptTypes.veoSplit') },
    { value: 'veo-character', label: t('promptTypes.veoChar') },
    { value: 'vertical-video', label: t('promptTypes.vertical') },
    { value: 'json-structured', label: t('promptTypes.json') },
];

export const getCompositions = (t: TFunction): SelectOption[] => [
    { value: 'normal', label: t('compositions.normal') },
    { value: 'wide-shot', label: t('compositions.wide') },
    { value: 'medium-shot', label: t('compositions.medium') },
    { value: 'close-up', label: t('compositions.closeup') },
    { value: 'dutch-angle', label: t('compositions.dutch') },
];

export const getLanguages = (t: TFunction): SelectOption[] => [
    { value: 'english', label: 'English' },
    { value: 'indonesian', label: 'Indonesian' },
];

export const getVisualStyles = (t: TFunction): SelectOption[] => [
    { value: '3D cartoon cinematic', label: t('visualStyles.3d_cartoon_cinematic') },
    { value: 'photorealistic cinematic', label: t('visualStyles.photorealistic_cinematic') },
    { value: 'anime style cinematic', label: t('visualStyles.anime_style_cinematic') },
    { value: 'stylized animation', label: t('visualStyles.stylized_animation') },
    { value: 'documentary style', label: t('visualStyles.documentary_style') },
];

export const getDialogueLanguages = (): SelectOption[] => [
    { value: 'id-ID', label: 'id-ID' },
    { value: 'en-US', label: 'en-US' },
    { value: 'es-ES', label: 'es-ES' },
    { value: 'fr-FR', label: 'fr-FR' },
    { value: 'ja-JP', label: 'ja-JP' },
];

export const getGenres = (t: TFunction): SelectOption[] => [
    { value: 'adventure', label: t('genres.adventure') },
    { value: 'comedy', label: t('genres.comedy') },
    { value: 'drama', label: t('genres.drama') },
    { value: 'fantasy', label: t('genres.fantasy') },
    { value: 'sci-fi', label: t('genres.sci_fi') },
    { value: 'horror', label: t('genres.horror') },
    { value: 'romance', label: t('genres.romance') },
    { value: 'mystery', label: t('genres.mystery') },
];

export const getTargetAudiences = (t: TFunction): SelectOption[] => [
    { value: 'family', label: t('targetAudiences.family') },
    { value: 'children', label: t('targetAudiences.children') },
    { value: 'teen', label: t('targetAudiences.teen') },
    { value: 'adult', label: t('targetAudiences.adult') },
];


export const LOADING_MESSAGES = [
    "Warming up the AI model...",
    "Analyzing prompt nuances...",
    "Allocating creative resources...",
    "Consulting with digital muses...",
    "Painting pixels onto the digital canvas...",
    "Rendering cinematic shots...",
    "Composing the visual symphony...",
    "Adding a touch of AI magic...",
    "Finalizing the masterpiece..."
];