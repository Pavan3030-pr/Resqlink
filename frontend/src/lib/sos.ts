import type { Lang } from './i18n'
import type { Category } from './types'

/** One-tap SOS: the smallest report that is still useful. Priority is decided by the server's AI safety floor and a dispatcher. */
export interface SosPosition { latitude: number; longitude: number; accuracy?: number }

export const SOS_CATEGORIES: Category[] = ['MEDICAL', 'ACCIDENT', 'FIRE', 'FLOOD']

const DESCRIPTION: Record<Lang, string> = {
  en: 'SOS sent with one tap. Urgent help needed at this location. Details not yet provided; please call or message the reporter.',
  hi: 'SOS एक टैप से भेजा गया। इस स्थान पर तुरंत मदद चाहिए। विवरण अभी नहीं दिया गया; कृपया रिपोर्ट करने वाले से संपर्क करें।',
  te: 'ఒక్క ట్యాప్‌తో SOS పంపబడింది. ఈ ప్రదేశంలో తక్షణ సహాయం అవసరం. వివరాలు ఇంకా ఇవ్వలేదు; దయచేసి రిపోర్టర్‌ను సంప్రదించండి.',
}

export function buildSosPayload(pos: SosPosition, category: Category, lang: Lang = 'en', now: Date = new Date()) {
  return {
    category,
    description: DESCRIPTION[lang] ?? DESCRIPTION.en,
    latitude: Number(pos.latitude.toFixed(6)),
    longitude: Number(pos.longitude.toFixed(6)),
    incidentTime: now.toISOString(),
    locationSource: 'GPS' as const,
    ...(pos.accuracy != null && Number.isFinite(pos.accuracy) ? { locationAccuracyMeters: Math.min(100000, Math.max(0, Math.round(pos.accuracy))) } : {}),
  }
}

export const SOS_TEXT: Record<Lang, { button: string; hint: string; choose: string; sending: string; locating: string; noGps: string; cancel: string }> = {
  en: { button: 'SOS: send my location', hint: 'One tap alerts a dispatcher with your GPS position. No typing needed.', choose: 'What is the emergency?', sending: 'Sending SOS…', locating: 'Finding your location…', noGps: 'We could not get your location. Allow location access or use the full report form.', cancel: 'Cancel' },
  hi: { button: 'SOS: मेरी लोकेशन भेजें', hint: 'एक टैप से डिस्पैचर को आपकी GPS लोकेशन मिल जाती है। टाइप करने की ज़रूरत नहीं।', choose: 'आपातकाल क्या है?', sending: 'SOS भेजा जा रहा है…', locating: 'आपकी लोकेशन खोज रहे हैं…', noGps: 'हम आपकी लोकेशन नहीं पा सके। लोकेशन की अनुमति दें या पूरा रिपोर्ट फ़ॉर्म भरें।', cancel: 'रद्द करें' },
  te: { button: 'SOS: నా లొకేషన్ పంపండి', hint: 'ఒక్క ట్యాప్‌తో డిస్పాచర్‌కు మీ GPS స్థానం చేరుతుంది. టైప్ చేయనవసరం లేదు.', choose: 'అత్యవసరం ఏమిటి?', sending: 'SOS పంపుతోంది…', locating: 'మీ లొకేషన్ వెతుకుతోంది…', noGps: 'మీ లొకేషన్ దొరకలేదు. లొకేషన్ అనుమతి ఇవ్వండి లేదా పూర్తి రిపోర్ట్ ఫారమ్ ఉపయోగించండి.', cancel: 'రద్దు చేయండి' },
}
