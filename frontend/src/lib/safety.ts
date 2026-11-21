import type { Lang } from './i18n'
import type { Category } from './types'

/**
 * "While you wait" guidance shown to the person who reported. Deliberately conservative, widely published
 * first-response advice; it never replaces the 112 call-taker. Hindi and Telugu should be reviewed by native speakers.
 */
type Tips = { heading: string; tips: string[] }

const EN: Record<Category, string[]> = {
  ACCIDENT: [
    'Move yourself out of traffic. Switch on hazard lights and stay behind a barrier if you can.',
    'Do not move injured people unless there is fire or immediate danger.',
    'For heavy bleeding, press firmly on the wound with a clean cloth and keep pressing.',
    'Keep your phone free and stay near the location so responders can find you.',
  ],
  FIRE: [
    'Get out and stay out. Do not go back inside for belongings.',
    'Stay low under smoke and close doors behind you to slow the fire.',
    'Do not use lifts. Use the stairs.',
    'Keep fire engines clear of the road and meet responders at a safe distance.',
  ],
  FLOOD: [
    'Move to higher ground now. Do not walk or drive through floodwater.',
    'Stay away from fallen power lines and switch off mains electricity only if it is safe to do so.',
    'Take your phone, medicines and important documents if you can do so quickly.',
    'Help children and older people first and keep the group together.',
  ],
  MEDICAL: [
    'Keep the person still and comfortable. Do not give food or drink.',
    'If they are not responding and not breathing normally, tell the 112 call-taker and follow their instructions for chest compressions.',
    'Loosen tight clothing and note any medicines or conditions you know about.',
    'Unlock the door and send someone to meet the responders.',
  ],
  OTHER: [
    'Move to a safe place away from the danger.',
    'Keep your phone free and stay where responders can find you.',
    'Write down anything you noticed: people involved, vehicles, hazards.',
    'If someone is in immediate danger, call 112.',
  ],
}

const HI: Record<Category, string[]> = {
  ACCIDENT: [
    'खुद को ट्रैफ़िक से दूर रखें। हैज़र्ड लाइट चालू करें और संभव हो तो बैरियर के पीछे रहें।',
    'आग या तुरंत खतरा न हो तो घायलों को न हिलाएं।',
    'ज़्यादा खून बहे तो साफ़ कपड़े से घाव को कसकर दबाए रखें।',
    'फ़ोन खाली रखें और घटनास्थल के पास रहें ताकि रेस्पॉन्डर आपको ढूंढ सकें।',
  ],
  FIRE: [
    'बाहर निकलें और बाहर ही रहें। सामान के लिए वापस अंदर न जाएं।',
    'धुएं में नीचे झुककर चलें और आग धीमी करने के लिए दरवाज़े बंद करते जाएं।',
    'लिफ़्ट का उपयोग न करें, सीढ़ियों से जाएं।',
    'दमकल के लिए रास्ता खाली रखें और सुरक्षित दूरी पर मिलें।',
  ],
  FLOOD: [
    'तुरंत ऊँची जगह जाएं। बाढ़ के पानी में पैदल या गाड़ी से न जाएं।',
    'गिरे हुए बिजली के तारों से दूर रहें; मेन बिजली तभी बंद करें जब यह सुरक्षित हो।',
    'जल्दी हो सके तो फ़ोन, दवाइयां और ज़रूरी कागज़ात साथ लें।',
    'पहले बच्चों और बुज़ुर्गों की मदद करें और समूह साथ रखें।',
  ],
  MEDICAL: [
    'व्यक्ति को स्थिर और आरामदायक रखें। खाना या पानी न दें।',
    'यदि वे जवाब नहीं दे रहे और सामान्य सांस नहीं ले रहे, तो 112 ऑपरेटर को बताएं और छाती दबाने (CPR) के उनके निर्देश मानें।',
    'तंग कपड़े ढीले करें और जो दवाइयां या बीमारियां पता हों उन्हें नोट करें।',
    'दरवाज़ा खोल दें और किसी को रेस्पॉन्डर को लेने भेजें।',
  ],
  OTHER: [
    'खतरे से दूर किसी सुरक्षित जगह जाएं।',
    'फ़ोन खाली रखें और ऐसी जगह रहें जहां रेस्पॉन्डर आपको ढूंढ सकें।',
    'जो देखा उसे लिख लें: शामिल लोग, वाहन, खतरे।',
    'यदि किसी की जान खतरे में है तो 112 पर कॉल करें।',
  ],
}

const TE: Record<Category, string[]> = {
  ACCIDENT: [
    'ట్రాఫిక్ నుండి దూరంగా వెళ్లండి. హజార్డ్ లైట్లు వేసి, వీలైతే అడ్డంకి వెనుక ఉండండి.',
    'మంటలు లేదా తక్షణ ప్రమాదం ఉంటే తప్ప గాయపడిన వారిని కదిలించకండి.',
    'ఎక్కువ రక్తస్రావం అయితే శుభ్రమైన గుడ్డతో గాయంపై గట్టిగా నొక్కి ఉంచండి.',
    'ఫోన్‌ను ఖాళీగా ఉంచి, రెస్పాండర్లు మిమ్మల్ని కనుగొనేలా ఆ ప్రదేశం దగ్గరే ఉండండి.',
  ],
  FIRE: [
    'బయటకు వచ్చి బయటే ఉండండి. వస్తువుల కోసం తిరిగి లోపలికి వెళ్లకండి.',
    'పొగలో కిందకు వంగి నడవండి, మంట వ్యాపించకుండా తలుపులు మూసుకుంటూ వెళ్లండి.',
    'లిఫ్ట్ వాడకండి, మెట్లు ఉపయోగించండి.',
    'ఫైర్ ఇంజన్లకు దారి ఖాళీగా ఉంచి, సురక్షిత దూరంలో కలవండి.',
  ],
  FLOOD: [
    'వెంటనే ఎత్తైన ప్రదేశానికి వెళ్లండి. వరద నీటిలో నడవకండి, వాహనం నడపకండి.',
    'తెగిపడిన విద్యుత్ తీగలకు దూరంగా ఉండండి; సురక్షితమైతేనే మెయిన్ కరెంట్ ఆపండి.',
    'త్వరగా వీలైతే ఫోన్, మందులు, ముఖ్యమైన పత్రాలు తీసుకెళ్లండి.',
    'ముందుగా పిల్లలు, వృద్ధులకు సహాయం చేసి, అందరూ కలిసి ఉండండి.',
  ],
  MEDICAL: [
    'వ్యక్తిని కదలకుండా సౌకర్యంగా ఉంచండి. ఆహారం, నీరు ఇవ్వకండి.',
    'వారు స్పందించకపోయి, సాధారణంగా శ్వాస తీసుకోకపోతే 112 ఆపరేటర్‌కు చెప్పి, ఛాతీ నొక్కడం (CPR) గురించి వారి సూచనలు పాటించండి.',
    'బిగుతు దుస్తులు సడలించండి; మీకు తెలిసిన మందులు, వ్యాధులు గమనించండి.',
    'తలుపు తెరిచి ఉంచి, రెస్పాండర్లను తీసుకురావడానికి ఒకరిని పంపండి.',
  ],
  OTHER: [
    'ప్రమాదానికి దూరంగా సురక్షిత ప్రదేశానికి వెళ్లండి.',
    'ఫోన్‌ను ఖాళీగా ఉంచి, రెస్పాండర్లు కనుగొనగల చోట ఉండండి.',
    'మీరు గమనించినవి రాసుకోండి: వ్యక్తులు, వాహనాలు, ప్రమాదాలు.',
    'ఎవరికైనా తక్షణ ప్రమాదం ఉంటే 112కు కాల్ చేయండి.',
  ],
}

const HEADING: Record<Lang, string> = {
  en: 'While you wait: stay safe',
  hi: 'प्रतीक्षा करते समय: सुरक्षित रहें',
  te: 'వేచి ఉన్నప్పుడు: సురక్షితంగా ఉండండి',
}
const NOTE: Record<Lang, string> = {
  en: 'General safety guidance only. Always follow the instructions of the 112 call-taker and responders.',
  hi: 'यह केवल सामान्य सुरक्षा सलाह है। हमेशा 112 ऑपरेटर और रेस्पॉन्डर के निर्देश मानें।',
  te: 'ఇది సాధారణ భద్రతా సూచన మాత్రమే. ఎల్లప్పుడూ 112 ఆపరేటర్, రెస్పాండర్ల సూచనలు పాటించండి.',
}
const TIPS: Record<Lang, Record<Category, string[]>> = { en: EN, hi: HI, te: TE }

export function safetyGuidance(category: Category, lang: Lang): Tips & { note: string } {
  const tips = TIPS[lang]?.[category] ?? EN[category] ?? EN.OTHER
  return { heading: HEADING[lang] ?? HEADING.en, tips, note: NOTE[lang] ?? NOTE.en }
}
