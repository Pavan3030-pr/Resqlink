import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { IncidentStatus } from './types'

export type Lang = 'en' | 'hi' | 'te'
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
]

type Dict = Record<string, string>

// Citizen-facing strings. Hindi and Telugu were written for this project and should be reviewed by native speakers.
const DICT: Record<Lang, Dict> = {
  en: {
    reportTitle: 'Report an emergency', reportSubtitle: 'Share what happened and where. A dispatcher will review it.',
    whatHappened: 'What happened', type: 'Emergency type', description: 'Description',
    descriptionHint: 'Number of people, injuries, vehicles, hazards, anything that helps responders. You can write in any language.',
    landmark: 'Landmark or address (optional)', contactName: 'Contact name', contactPhone: 'Contact phone',
    photo: 'Photo (optional)', photoHint: 'Choose a JPEG or PNG. It is shrunk before sending to save data.',
    where: 'Where', useMyLocation: 'Use my location', locating: 'Locating…',
    locationHelp: 'Your browser asks for permission before sharing GPS. You can also tap the map to place the pin.',
    submit: 'Submit report', submitting: 'Submitting…', cancel: 'Cancel', myReports: 'My reports',
    emergencyNotice: 'If someone is in immediate danger, call 112 first. ResQLink is a prototype and does not replace official emergency services.',
    cat_ACCIDENT: 'Accident', cat_FIRE: 'Fire', cat_FLOOD: 'Flood', cat_MEDICAL: 'Medical emergency', cat_OTHER: 'Other',
    accuracy: 'Accuracy', lowAccuracy: 'Low accuracy. Tap the map to place the pin exactly.', gps: 'GPS', mapPin: 'Map pin',
    call112: 'Call 112', immediateDanger: 'In immediate danger?', optionalDetails: 'Contact and landmark (optional)',
    addPhoto: 'Take or choose a photo', removePhoto: 'Remove photo', preparingPhoto: 'Preparing photo…',
    needLocation: 'Choose the location before sending.', noLocation: 'No location yet', locationSet: 'Location set',
    reference: 'Your reference number', yourReport: 'Your report', updates: 'Updates', autoUpdates: 'This page updates automatically.',
    step_received: 'Received', step_verified: 'Verified', step_help: 'Help on the way', step_resolved: 'Resolved', waitingToSend: 'Waiting to send',
  },
  hi: {
    reportTitle: 'आपातकाल की सूचना दें', reportSubtitle: 'बताएं क्या हुआ और कहाँ। एक डिस्पैचर इसकी समीक्षा करेगा।',
    whatHappened: 'क्या हुआ', type: 'आपातकाल का प्रकार', description: 'विवरण',
    descriptionHint: 'लोगों की संख्या, चोटें, वाहन, खतरे — जो भी मददगार हो। आप किसी भी भाषा में लिख सकते हैं।',
    landmark: 'स्थान या पता (वैकल्पिक)', contactName: 'संपर्क का नाम', contactPhone: 'संपर्क फ़ोन',
    photo: 'फोटो (वैकल्पिक)', photoHint: 'JPEG या PNG चुनें। डेटा बचाने के लिए भेजने से पहले इसे छोटा किया जाता है।',
    where: 'कहाँ', useMyLocation: 'मेरी लोकेशन उपयोग करें', locating: 'खोज रहे हैं…',
    locationHelp: 'GPS साझा करने से पहले आपका ब्राउज़र अनुमति मांगेगा। आप नक्शे पर टैप करके पिन भी लगा सकते हैं।',
    submit: 'रिपोर्ट भेजें', submitting: 'भेजा जा रहा है…', cancel: 'रद्द करें', myReports: 'मेरी रिपोर्ट',
    emergencyNotice: 'यदि किसी की जान खतरे में है तो पहले 112 पर कॉल करें। ResQLink एक प्रोटोटाइप है और आधिकारिक आपातकालीन सेवाओं का विकल्प नहीं है।',
    cat_ACCIDENT: 'दुर्घटना', cat_FIRE: 'आग', cat_FLOOD: 'बाढ़', cat_MEDICAL: 'चिकित्सा आपातकाल', cat_OTHER: 'अन्य',
    accuracy: 'सटीकता', lowAccuracy: 'सटीकता कम है। पिन सही जगह लगाने के लिए नक्शे पर टैप करें।', gps: 'GPS', mapPin: 'नक्शे का पिन',
    call112: '112 पर कॉल करें', immediateDanger: 'तुरंत खतरे में हैं?', optionalDetails: 'संपर्क और स्थान (वैकल्पिक)',
    addPhoto: 'फोटो लें या चुनें', removePhoto: 'फोटो हटाएं', preparingPhoto: 'फोटो तैयार हो रही है…',
    needLocation: 'भेजने से पहले लोकेशन चुनें।', noLocation: 'अभी लोकेशन नहीं चुनी', locationSet: 'लोकेशन चुनी गई',
    reference: 'आपका संदर्भ नंबर', yourReport: 'आपकी रिपोर्ट', updates: 'अपडेट', autoUpdates: 'यह पेज अपने आप अपडेट होता है।',
    step_received: 'प्राप्त', step_verified: 'सत्यापित', step_help: 'मदद रास्ते में', step_resolved: 'सुलझ गया', waitingToSend: 'भेजने की प्रतीक्षा',
  },
  te: {
    reportTitle: 'అత్యవసర పరిస్థితిని నివేదించండి', reportSubtitle: 'ఏమి జరిగిందో, ఎక్కడ జరిగిందో తెలియజేయండి. డిస్పాచర్ దీన్ని పరిశీలిస్తారు.',
    whatHappened: 'ఏమి జరిగింది', type: 'అత్యవసర రకం', description: 'వివరణ',
    descriptionHint: 'వ్యక్తుల సంఖ్య, గాయాలు, వాహనాలు, ప్రమాదాలు — సహాయపడే ఏదైనా. మీరు ఏ భాషలోనైనా రాయవచ్చు.',
    landmark: 'ల్యాండ్‌మార్క్ లేదా చిరునామా (ఐచ్ఛికం)', contactName: 'సంప్రదింపు పేరు', contactPhone: 'సంప్రదింపు ఫోన్',
    photo: 'ఫోటో (ఐచ్ఛికం)', photoHint: 'JPEG లేదా PNG ఎంచుకోండి. డేటా ఆదా చేయడానికి పంపే ముందు చిన్నదిగా చేస్తారు.',
    where: 'ఎక్కడ', useMyLocation: 'నా లొకేషన్ ఉపయోగించండి', locating: 'వెతుకుతోంది…',
    locationHelp: 'GPS పంచుకునే ముందు మీ బ్రౌజర్ అనుమతి అడుగుతుంది. మీరు మ్యాప్‌పై ట్యాప్ చేసి పిన్ కూడా ఉంచవచ్చు.',
    submit: 'నివేదిక పంపండి', submitting: 'పంపుతోంది…', cancel: 'రద్దు చేయండి', myReports: 'నా నివేదికలు',
    emergencyNotice: 'ఎవరి ప్రాణానికైనా ప్రమాదం ఉంటే ముందుగా 112కు కాల్ చేయండి. ResQLink ఒక ప్రోటోటైప్ మాత్రమే; అధికారిక అత్యవసర సేవలకు ప్రత్యామ్నాయం కాదు.',
    cat_ACCIDENT: 'ప్రమాదం', cat_FIRE: 'అగ్నిప్రమాదం', cat_FLOOD: 'వరద', cat_MEDICAL: 'వైద్య అత్యవసరం', cat_OTHER: 'ఇతర',
    accuracy: 'కచ్చితత్వం', lowAccuracy: 'కచ్చితత్వం తక్కువగా ఉంది. పిన్‌ను సరిగ్గా ఉంచడానికి మ్యాప్‌పై ట్యాప్ చేయండి.', gps: 'GPS', mapPin: 'మ్యాప్ పిన్',
    call112: '112కు కాల్ చేయండి', immediateDanger: 'తక్షణ ప్రమాదంలో ఉన్నారా?', optionalDetails: 'సంప్రదింపు, ల్యాండ్‌మార్క్ (ఐచ్ఛికం)',
    addPhoto: 'ఫోటో తీయండి లేదా ఎంచుకోండి', removePhoto: 'ఫోటో తొలగించండి', preparingPhoto: 'ఫోటో సిద్ధమవుతోంది…',
    needLocation: 'పంపే ముందు లొకేషన్ ఎంచుకోండి.', noLocation: 'ఇంకా లొకేషన్ ఎంచుకోలేదు', locationSet: 'లొకేషన్ ఎంచుకోబడింది',
    reference: 'మీ రిఫరెన్స్ నంబర్', yourReport: 'మీ నివేదిక', updates: 'అప్‌డేట్లు', autoUpdates: 'ఈ పేజీ ఆటోమేటిక్‌గా అప్‌డేట్ అవుతుంది.',
    step_received: 'అందింది', step_verified: 'ధృవీకరించబడింది', step_help: 'సహాయం దారిలో', step_resolved: 'పరిష్కారమైంది', waitingToSend: 'పంపడానికి వేచి ఉంది',
  },
}

const STATUS: Record<Lang, Partial<Record<IncidentStatus, [string, string]>>> = {
  en: {},
  hi: {
    REPORTED: ['रिपोर्ट मिल गई', 'हमें आपकी रिपोर्ट मिल गई है और हम उसे समीक्षा के लिए तैयार कर रहे हैं।'],
    AI_ANALYZED: ['रिपोर्ट मिल गई', 'हमें आपकी रिपोर्ट मिल गई है और हम उसे समीक्षा के लिए तैयार कर रहे हैं।'],
    AWAITING_VERIFICATION: ['डिस्पैचर आपकी रिपोर्ट देख रहा है', 'सत्यापित होते ही आपको सूचना मिलेगी।'],
    VERIFIED: ['रिपोर्ट सत्यापित', 'आपकी रिपोर्ट सत्यापित हो गई है। रेस्पॉन्डर नियुक्त किया जा रहा है।'],
    ASSIGNED: ['मदद भेजी जा रही है', 'रेस्पॉन्डर नियुक्त हो गए हैं और उन्हें सूचित किया जा रहा है।'],
    RESPONDER_ACCEPTED: ['मदद रास्ते में है', 'एक रेस्पॉन्डर ने कार्य स्वीकार किया है और घटनास्थल की ओर बढ़ रहा है।'],
    ON_SCENE: ['रेस्पॉन्डर घटनास्थल पर हैं', 'रिस्पॉन्स टीम घटनास्थल पर पहुँच गई है।'],
    RESOLVED: ['घटना सुलझ गई', 'रेस्पॉन्डर के अनुसार स्थिति सुलझ गई है। रिपोर्ट करने के लिए धन्यवाद।'],
    CLOSED: ['घटना बंद', 'यह घटना पूर्ण हो चुकी है।'],
    REJECTED: ['रिपोर्ट सत्यापित नहीं हो सकी', 'यदि अब भी किसी को मदद चाहिए तो अपने स्थानीय आपातकालीन नंबर (भारत में 112) पर कॉल करें।'],
    DUPLICATE: ['मौजूदा रिपोर्ट के साथ जोड़ा गया', 'इसी घटना की दूसरी रिपोर्ट पहले से है, इसलिए रेस्पॉन्डर को जानकारी है।'],
  },
  te: {
    REPORTED: ['నివేదిక అందింది', 'మీ నివేదిక మాకు అందింది; సమీక్షకు సిద్ధం చేస్తున్నాము.'],
    AI_ANALYZED: ['నివేదిక అందింది', 'మీ నివేదిక మాకు అందింది; సమీక్షకు సిద్ధం చేస్తున్నాము.'],
    AWAITING_VERIFICATION: ['డిస్పాచర్ మీ నివేదికను పరిశీలిస్తున్నారు', 'ధృవీకరించగానే మీకు తెలియజేస్తాము.'],
    VERIFIED: ['నివేదిక ధృవీకరించబడింది', 'మీ నివేదిక ధృవీకరించబడింది. రెస్పాండర్‌ను నియమిస్తున్నారు.'],
    ASSIGNED: ['సహాయం పంపుతున్నారు', 'రెస్పాండర్లను నియమించి, వారికి తెలియజేస్తున్నారు.'],
    RESPONDER_ACCEPTED: ['సహాయం దారిలో ఉంది', 'ఒక రెస్పాండర్ అంగీకరించి సంఘటనా స్థలానికి వెళ్తున్నారు.'],
    ON_SCENE: ['రెస్పాండర్లు సంఘటనా స్థలంలో ఉన్నారు', 'రెస్పాన్స్ బృందం ఆ ప్రదేశానికి చేరుకుంది.'],
    RESOLVED: ['సంఘటన పరిష్కారమైంది', 'పరిస్థితి పరిష్కారమైందని రెస్పాండర్లు తెలిపారు. నివేదించినందుకు ధన్యవాదాలు.'],
    CLOSED: ['సంఘటన ముగిసింది', 'ఈ సంఘటన పూర్తయింది.'],
    REJECTED: ['నివేదికను ధృవీకరించలేకపోయాము', 'ఇంకా ఎవరికైనా సహాయం కావాలంటే మీ స్థానిక అత్యవసర నంబర్‌కు (భారతదేశంలో 112) కాల్ చేయండి.'],
    DUPLICATE: ['ఇప్పటికే ఉన్న నివేదికతో కలిపాము', 'ఇదే సంఘటనపై మరో నివేదిక ఉంది, కాబట్టి రెస్పాండర్లకు సమాచారం ఉంది.'],
  },
}

const KEY = 'resqlink.lang'

export function detectLang(stored: string | null, navigatorLang: string | undefined): Lang {
  if (stored === 'en' || stored === 'hi' || stored === 'te') return stored
  const n = (navigatorLang ?? 'en').toLowerCase()
  if (n.startsWith('hi')) return 'hi'
  if (n.startsWith('te')) return 'te'
  return 'en'
}

export function translate(lang: Lang, key: string): string {
  return DICT[lang][key] ?? DICT.en[key] ?? key
}

/** Returns [title, text] in the chosen language, or undefined to fall back to the English message. */
export function statusText(lang: Lang, status: IncidentStatus): [string, string] | undefined {
  return STATUS[lang][status]
}

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }
const I18nContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => translate('en', k) })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return detectLang(localStorage.getItem(KEY), navigator.language) } catch { return 'en' }
  })
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(KEY, l) } catch { /* storage unavailable */ }
    document.documentElement.lang = l
  }, [])
  const value = useMemo(() => ({ lang, setLang, t: (k: string) => translate(lang, k) }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
