/**
 * translationService.js
 * 
 * Translation abstraction for Tourist Guardian.
 * 
 * ONLINE: Uses the MyMemory Translation API (https://mymemory.translated.net/)
 *   — Free tier, no API key required, supports 50+ languages including all major Indian languages.
 *   — Rate limit: ~5000 chars/day for anonymous usage. Sufficient for hackathon demo.
 *   — No secret keys exposed in frontend.
 *
 * OFFLINE: Falls back to a curated local phrasebook of high-value tourist safety phrases.
 *   — Covers emergency/police/hospital/help phrases in 10 Indian languages.
 *   — Clearly returns the local result without pretending it's AI.
 */

// BCP-47 locale codes used by MyMemory API
const LANG_CODES = {
  en: 'en',
  hi: 'hi',
  mr: 'mr',
  bn: 'bn',
  ta: 'ta',
  te: 'te',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  ur: 'ur',
  or: 'or',
  as: 'as'
};

// Offline phrasebook — curated tourist safety phrases with real translations
const OFFLINE_PHRASEBOOK = {
  'where is the nearest police station': {
    hi: 'निकटतम पुलिस स्टेशन कहाँ है?',
    mr: 'सर्वांत जवळचे पोलीस स्टेशन कुठे आहे?',
    bn: 'নিকটতম থানা কোথায়?',
    ta: 'அருகிலுள்ள காவல் நிலையம் எங்கே?',
    te: 'సమీపంలోని పోలీసు స్టేషన్ ఎక్కడ ఉంది?',
    gu: 'નજીકનું પોલીસ સ્ટેશન ક્યાં છે?',
    kn: 'ಹತ್ತಿರದ ಪೊಲೀಸ್ ಠಾಣೆ ಎಲ್ಲಿದೆ?',
    ml: 'ഏറ്റവും അടുത്തുള്ള പോലീസ് സ്റ്റേഷൻ എവിടെയാണ്?',
    pa: 'ਸਭ ਤੋਂ ਨੇੜੇ ਦਾ ਪੁਲਿਸ ਸਟੇਸ਼ਨ ਕਿੱਥੇ ਹੈ?',
    ur: 'قریب ترین پولیس اسٹیشن کہاں ہے؟'
  },
  'i need help': {
    hi: 'मुझे मदद चाहिए',
    mr: 'मला मदत हवी आहे',
    bn: 'আমার সাহায্য দরকার',
    ta: 'எனக்கு உதவி தேவை',
    te: 'నాకు సహాయం కావాలి',
    gu: 'મને મદદ જોઈએ છે',
    kn: 'ನನಗೆ ಸಹಾಯ ಬೇಕು',
    ml: 'എനിക്ക് സഹായം വേണം',
    pa: 'ਮੈਨੂੰ ਮਦਦ ਦੀ ਲੋੜ ਹੈ',
    ur: 'مجھے مدد کی ضرورت ہے'
  },
  'please call the police': {
    hi: 'कृपया पुलिस को बुलाइए',
    mr: 'कृपया पोलिसांना बोलवा',
    bn: 'দয়া করে পুলিশ ডাকুন',
    ta: 'தயவுசெய்து போலீசை அழையுங்கள்',
    te: 'దయచేసి పోలీసులను పిలవండి',
    gu: 'કૃપા કરીને પોલીસને બોલાવો',
    kn: 'ದಯವಿಟ್ಟು ಪೊಲೀಸರನ್ನು ಕರೆಯಿರಿ',
    ml: 'ദയവായി പോലീസിനെ വിളിക്കൂ',
    pa: 'ਕਿਰਪਾ ਕਰਕੇ ਪੁਲਿਸ ਨੂੰ ਬੁਲਾਓ',
    ur: 'براہ کرم پولیس کو بلائیں'
  },
  'where is the nearest hospital': {
    hi: 'निकटतम अस्पताल कहाँ है?',
    mr: 'सर्वांत जवळचे रुग्णालय कुठे आहे?',
    bn: 'নিকটতম হাসপাতাল কোথায়?',
    ta: 'அருகிலுள்ள மருத்துவமனை எங்கே?',
    te: 'సమీపంలోని ఆసుపత్రి ఎక్కడ ఉంది?',
    gu: 'નજીકની હોસ્પિટલ ક્યાં છે?',
    kn: 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ?',
    ml: 'ഏറ്റവും അടുത്തുള്ള ആശുപത്രി എവിടെയാണ്?',
    pa: 'ਸਭ ਤੋਂ ਨੇੜੇ ਦਾ ਹਸਪਤਾਲ ਕਿੱਥੇ ਹੈ?',
    ur: 'قریب ترین ہسپتال کہاں ہے؟'
  },
  'i am lost': {
    hi: 'मैं खो गया हूँ',
    mr: 'मी हरवलो/हरवले आहे',
    bn: 'আমি হারিয়ে গেছি',
    ta: 'நான் வழி தவறிவிட்டேன்',
    te: 'నేను దారి తప్పాను',
    gu: 'હું ખોવાઈ ગયો છું',
    kn: 'ನಾನು ದಾರಿ ತಪ್ಪಿದ್ದೇನೆ',
    ml: 'എനിക്ക് വഴി തെറ്റി',
    pa: 'ਮੈਂ ਗੁਆਚ ਗਿਆ ਹਾਂ',
    ur: 'میں کھو گیا ہوں'
  },
  'i feel unsafe': {
    hi: 'मुझे असुरक्षित लग रहा है',
    mr: 'मला असुरक्षित वाटत आहे',
    bn: 'আমি অনিরাপদ বোধ করছি',
    ta: 'எனக்கு பாதுகாப்பின்மை உணர்கிறேன்',
    te: 'నాకు అసురక్షితంగా అనిపిస్తోంది',
    gu: 'મને અસુરક્ષિત લાગે છે',
    kn: 'ನನಗೆ ಅಸುರಕ್ಷಿತ ಅನಿಸುತ್ತಿದೆ',
    ml: 'എനിക്ക് സുരക്ഷിതമല്ലെന്ന് തോന്നുന്നു',
    pa: 'ਮੈਨੂੰ ਅਸੁਰੱਖਿਅਤ ਮਹਿਸੂਸ ਹੋ ਰਿਹਾ ਹੈ',
    ur: 'مجھے غیر محفوظ محسوس ہو رہا ہے'
  },
  'thank you': {
    hi: 'धन्यवाद',
    mr: 'धन्यवाद',
    bn: 'ধন্যবাদ',
    ta: 'நன்றி',
    te: 'ధన్యవాదాలు',
    gu: 'આભાર',
    kn: 'ಧನ್ಯವಾದ',
    ml: 'നന്ദി',
    pa: 'ਧੰਨਵਾਦ',
    ur: 'شکریہ'
  },
  'hello': {
    hi: 'नमस्ते',
    mr: 'नमस्कार',
    bn: 'নমস্কার',
    ta: 'வணக்கம்',
    te: 'నమస్కారం',
    gu: 'નમસ્તે',
    kn: 'ನಮಸ್ಕಾರ',
    ml: 'നമസ്കാരം',
    pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
    ur: 'السلام علیکم'
  },
  'what is your name': {
    hi: 'आपका नाम क्या है?',
    mr: 'तुमचे नाव काय आहे?',
    bn: 'আপনার নাম কী?',
    ta: 'உங்கள் பெயர் என்ன?',
    te: 'మీ పేరు ఏమిటి?',
    gu: 'તમારું નામ શું છે?',
    kn: 'ನಿಮ್ಮ ಹೆಸರೇನು?',
    ml: 'നിങ്ങളുടെ പേരെന്താണ്?',
    pa: 'ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?',
    ur: 'آپ کا نام کیا ہے؟'
  },
  'how much does this cost': {
    hi: 'इसकी कीमत कितनी है?',
    mr: 'याची किंमत किती आहे?',
    bn: 'এটার দাম কত?',
    ta: 'இது எவ்வளவு?',
    te: 'ఇది ఎంత?',
    gu: 'આ કેટલાનું છે?',
    kn: 'ಇದರ ಬೆಲೆ ಎಷ್ಟು?',
    ml: 'ഇതിന്റെ വില എത്രയാണ്?',
    pa: 'ਇਸ ਦੀ ਕੀਮਤ ਕਿੰਨੀ ਹੈ?',
    ur: 'اس کی قیمت کتنی ہے؟'
  },
  'where is the bathroom': {
    hi: 'बाथरूम कहाँ है?',
    mr: 'स्नानगृह कुठे आहे?',
    bn: 'বাথরুম কোথায়?',
    ta: 'கழிவறை எங்கே?',
    te: 'బాత్రూమ్ ఎక్కడ ఉంది?',
    gu: 'બાથરૂમ ક્યાં છે?',
    kn: 'ಶೌಚಾಲಯ ಎಲ್ಲಿದೆ?',
    ml: 'ബാത്ത്റൂം എവിടെയാണ്?',
    pa: 'ਬਾਥਰੂਮ ਕਿੱਥੇ ਹੈ?',
    ur: 'باتھ روم کہاں ہے؟'
  },
  'i am a tourist': {
    hi: 'मैं एक पर्यटक हूँ',
    mr: 'मी एक पर्यटक आहे',
    bn: 'আমি একজন পর্যটক',
    ta: 'நான் ஒரு சுற்றுலா பயணி',
    te: 'నేను ఒక పర్యాటకుడిని',
    gu: 'હું એક પ્રવાસી છું',
    kn: 'ನಾನು ಪ್ರವಾಸಿ',
    ml: 'ഞാൻ ഒരു വിനോദസഞ്ചാരിയാണ്',
    pa: 'ਮੈਂ ਇੱਕ ਸੈਲਾਨੀ ਹਾਂ',
    ur: 'میں ایک سیاح ہوں'
  },
  'can you help me': {
    hi: 'क्या आप मेरी मदद कर सकते हैं?',
    mr: 'तुम्ही मला मदत करू शकता का?',
    bn: 'আপনি কি আমাকে সাহায্য করতে পারেন?',
    ta: 'நீங்கள் எனக்கு உதவ முடியுமா?',
    te: 'మీరు నాకు సహాయం చేయగలరా?',
    gu: 'શું તમે મને મદદ કરી શકો છો?',
    kn: 'ನೀವು ನನಗೆ ಸಹಾಯ ಮಾಡಬಹುದೇ?',
    ml: 'നിങ്ങൾക്ക് എന്നെ സഹായിക്കാമോ?',
    pa: 'ਕੀ ਤੁਸੀਂ ਮੇਰੀ ਮਦਦ ਕਰ ਸਕਦੇ ਹੋ?',
    ur: 'کیا آپ میری مدد کر سکتے ہیں؟'
  }
};

/**
 * Normalize input for phrasebook lookup
 */
function normalize(text) {
  return text.toLowerCase().trim()
    .replace(/[.,!?;:'"]+$/g, '')  // strip trailing punctuation
    .replace(/\s+/g, ' ');          // collapse whitespace
}

/**
 * Try the MyMemory free translation API (no key required).
 * Returns null on failure so caller can fall back.
 */
async function translateOnline(text, fromLang, toLang) {
  const from = LANG_CODES[fromLang] || fromLang;
  const to = LANG_CODES[toLang] || toLang;
  const langpair = `${from}|${to}`;
  
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const result = data.responseData.translatedText;
      // MyMemory sometimes returns the input unchanged when it can't translate
      if (result.toLowerCase().trim() === text.toLowerCase().trim()) {
        return null;
      }
      return result;
    }
    return null;
  } catch (_err) {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Translates text from one language to another.
 * 
 * Strategy:
 *   1. Check offline phrasebook first (instant, works offline)
 *   2. Try MyMemory API (real translation, free, no API key)
 *   3. Fall back to phrasebook partial match
 *   4. Return original text with a note if nothing works
 * 
 * @param {string} text - The text to translate
 * @param {string} fromLang - Source language code (e.g., 'en')
 * @param {string} toLang - Target language code (e.g., 'hi')
 * @returns {Promise<string>} - The translated text
 */
export async function translateText(text, fromLang, toLang) {
  if (!text || !text.trim()) return '';
  if (fromLang === toLang) return text;
  
  const normalizedInput = normalize(text);
  
  // 1. Exact phrasebook match (instant, works offline)
  if (OFFLINE_PHRASEBOOK[normalizedInput]?.[toLang]) {
    return OFFLINE_PHRASEBOOK[normalizedInput][toLang];
  }
  
  // 2. Try online translation (real translation via MyMemory)
  if (navigator.onLine) {
    const onlineResult = await translateOnline(text, fromLang, toLang);
    if (onlineResult) {
      return onlineResult;
    }
  }
  
  // 3. Partial phrasebook match — find the closest key
  for (const [key, translations] of Object.entries(OFFLINE_PHRASEBOOK)) {
    if (normalizedInput.includes(key) || key.includes(normalizedInput)) {
      if (translations[toLang]) {
        return translations[toLang];
      }
    }
  }
  
  // 4. No translation available
  if (!navigator.onLine) {
    return `⚠ Offline — translation unavailable for this phrase. Connect to the internet for full translation support.`;
  }
  
  return `⚠ Translation unavailable for this phrase. Try a simpler sentence.`;
}
