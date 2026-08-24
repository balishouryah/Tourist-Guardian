import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { translateText } from '../../../services/translationService';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', voiceCode: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voiceCode: 'hi-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', voiceCode: 'mr-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', voiceCode: 'bn-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', voiceCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', voiceCode: 'te-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', voiceCode: 'gu-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', voiceCode: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', voiceCode: 'ml-IN' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', voiceCode: 'pa-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', voiceCode: 'ur-IN' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', voiceCode: 'or-IN' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', voiceCode: 'as-IN' }
];

// States for the translator
const STATUS = {
  READY: 'READY',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  TRANSLATING: 'TRANSLATING',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR'
};

export default function LiveVoiceTranslator() {
  const navigate = useNavigate();

  const [fromLang, setFromLang] = useState('en');
  const [toLang, setToLang] = useState('hi');

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [status, setStatus] = useState(STATUS.READY);
  const [errorMessage, setErrorMessage] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [isBraveBrowser, setIsBraveBrowser] = useState(false);
  const [voiceNetworkFailed, setVoiceNetworkFailed] = useState(false);

  // Use refs for values that callbacks need to read (avoids stale closures)
  const fromLangRef = useRef(fromLang);
  const toLangRef = useRef(toLang);
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const retryCountRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => { fromLangRef.current = fromLang; }, [fromLang]);
  useEffect(() => { toLangRef.current = toLang; }, [toLang]);

  // Check browser support on mount
  useEffect(() => {
    // Detect Brave browser
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      navigator.brave.isBrave().then((isBrave) => {
        if (isBrave) {
          setIsBraveBrowser(true);
        }
      }).catch(() => { });
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSpeechSupported(false);
      setErrorMessage("Voice input isn't supported by this browser. You can type your message instead.");
    }
    if (!('speechSynthesis' in window)) {
      setTtsSupported(false);
    }

    return () => {
      // Cleanup on unmount
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_e) { /* ignore */ }
        recognitionRef.current = null;
      }
      isRecognizingRef.current = false;
    };
  }, []);

  const handleTranslation = useCallback(async (text, source, target) => {
    if (!text || !text.trim()) return;

    setStatus(STATUS.TRANSLATING);
    try {
      const translated = await translateText(text, source, target);
      setOutputText(translated);
      setStatus(STATUS.COMPLETE);
    } catch (_err) {
      setOutputText('');
      setStatus(STATUS.ERROR);
      setErrorMessage('Translation failed. Please try again.');
    }
  }, []);

  const handleStartListening = useCallback(() => {
    if (!speechSupported) {
      setErrorMessage("Voice input isn't supported by this browser. You can type your message instead.");
      return;
    }

    // Prevent excessive retries (max 3 before asking user to use text)
    if (retryCountRef.current >= 3) {
      setVoiceNetworkFailed(true);
      setSpeechSupported(false);
      setErrorMessage('Voice recognition is not available in this browser. Please use the text input below to translate.');
      setStatus(STATUS.ERROR);
      return;
    }

    // Prevent duplicate recognition instances
    if (isRecognizingRef.current) {
      try { recognitionRef.current?.abort(); } catch (_e) { /* ignore */ }
    }

    setErrorMessage(null);
    setVoiceNetworkFailed(false);

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Configure — use continuous + interimResults for better UX
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Set the recognition language from the current ref value
      const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === fromLangRef.current);
      recognition.lang = selectedLang?.voiceCode || 'en-IN';

      recognition.onstart = () => {
        isRecognizingRef.current = true;
        setStatus(STATUS.LISTENING);
        setErrorMessage(null);
        setInputText('');
        setOutputText('');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Show interim results while speaking
        if (interimTranscript && !finalTranscript) {
          setInputText(interimTranscript);
          setStatus(STATUS.LISTENING);
        }

        // When we get a final result, process it
        if (finalTranscript) {
          setInputText(finalTranscript);
          setStatus(STATUS.PROCESSING);
          // Read current language values from refs (not stale closure)
          handleTranslation(finalTranscript, fromLangRef.current, toLangRef.current);
        }
      };

      recognition.onerror = (event) => {
        isRecognizingRef.current = false;

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setErrorMessage('Microphone access denied. Please allow microphone permission in your browser settings, or type your message instead.');
          setSpeechSupported(false);
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech detected. Please try again and speak clearly.');
        } else if (event.error === 'network') {
          retryCountRef.current += 1;
          setVoiceNetworkFailed(true);
          // Brave and some privacy browsers block Chrome's cloud speech backend.
          // This is NOT an internet failure — it's a browser limitation.
          setErrorMessage(
            'Voice recognition is not available in this browser. ' +
            'Brave and some privacy-focused browsers block the speech recognition service. ' +
            'Please use Google Chrome for voice input, or type your message below.'
          );
        } else if (event.error !== 'aborted') {
          setErrorMessage(`Speech recognition error: ${event.error}. You can type your message instead.`);
        }

        setStatus(STATUS.ERROR);
      };

      recognition.onend = () => {
        isRecognizingRef.current = false;
        // Only reset to READY if we haven't already moved to PROCESSING/TRANSLATING/COMPLETE
        setStatus(prev => {
          if (prev === STATUS.LISTENING) {
            return STATUS.READY;
          }
          return prev;
        });
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      isRecognizingRef.current = false;
      setStatus(STATUS.ERROR);
      setErrorMessage('Could not start speech recognition. Please type your message instead.');
    }
  }, [speechSupported, handleTranslation]);

  const handleStopListening = useCallback(() => {
    if (recognitionRef.current && isRecognizingRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_e) { /* ignore */ }
      isRecognizingRef.current = false;
      setStatus(prev => prev === STATUS.LISTENING ? STATUS.READY : prev);
    }
  }, []);

  const handleSwapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
  };

  const handleTextTranslate = () => {
    if (inputText.trim()) {
      handleTranslation(inputText, fromLang, toLang);
    }
  };

  const playTranslation = () => {
    if (!outputText || !ttsSupported) {
      if (!ttsSupported) setErrorMessage('Text-to-speech is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(outputText);
    const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === toLang);
    utterance.lang = selectedLang?.voiceCode || 'en-IN';
    utterance.rate = 0.9;

    utterance.onerror = () => {
      setErrorMessage('Could not play audio. The voice for this language may not be available on your device.');
    };

    window.speechSynthesis.speak(utterance);
  };

  const isListening = status === STATUS.LISTENING;
  const isProcessing = status === STATUS.PROCESSING || status === STATUS.TRANSLATING;
  const fromLangObj = SUPPORTED_LANGUAGES.find(l => l.code === fromLang);
  const toLangObj = SUPPORTED_LANGUAGES.find(l => l.code === toLang);

  return (
    <div style={{ flex: 1, padding: '20px', background: 'var(--background)', paddingBottom: '120px', maxWidth: '500px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'pointer', color: 'var(--on-background)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Live Voice Translator</h1>
      </div>

      <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, marginBottom: '20px', marginLeft: '36px' }}>
        Speak naturally and translate instantly.
      </p>

      {/* Language Selectors */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', background: 'var(--surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--outline-variant)', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: '6px', letterSpacing: '0.5px' }}>FROM</label>
          <select
            value={fromLang}
            onChange={(e) => setFromLang(e.target.value)}
            style={{ width: '100%', padding: '10px 8px', borderRadius: '10px', border: '1px solid var(--outline-variant)', background: 'var(--background)', fontSize: 15, color: 'var(--on-surface)' }}
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.name} ({l.nativeName})</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSwapLanguages}
          style={{ background: 'var(--primary-container)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginBottom: '2px' }}
          title="Swap languages"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--on-primary-container)' }}>swap_horiz</span>
        </button>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: '6px', letterSpacing: '0.5px' }}>TO</label>
          <select
            value={toLang}
            onChange={(e) => setToLang(e.target.value)}
            style={{ width: '100%', padding: '10px 8px', borderRadius: '10px', border: '1px solid var(--outline-variant)', background: 'var(--background)', fontSize: 15, color: 'var(--on-surface)' }}
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.name} ({l.nativeName})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Privacy Notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', padding: '8px 12px', background: 'var(--surface-variant)', borderRadius: '8px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--on-surface-variant)' }}>lock</span>
        <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Your conversation is processed only to provide translation.</span>
      </div>

      {/* Brave Browser Notice */}
      {isBraveBrowser && speechSupported && !voiceNetworkFailed && (
        <div style={{ background: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: 13 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0, marginTop: '1px' }}>info</span>
          <span>You are using Brave. Voice input may not work because Brave blocks cloud-based speech recognition for privacy. You can type your message instead, or try Google Chrome for voice input.</span>
        </div>
      )}

      {/* Error / Info Messages */}
      {errorMessage && (
        <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: voiceNetworkFailed ? '12px' : '0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0, marginTop: '1px' }}>warning</span>
            <span>{errorMessage}</span>
          </div>
          {voiceNetworkFailed && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => { retryCountRef.current = 0; setVoiceNetworkFailed(false); setSpeechSupported(true); setErrorMessage(null); setStatus(STATUS.READY); }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--on-error-container)', background: 'transparent', color: 'var(--on-error-container)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Text Input Fallback */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder={`Type in ${fromLangObj?.name || 'your language'}...`}
            value={inputText}
            onChange={(e) => { setInputText(e.target.value); setErrorMessage(null); }}
            style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--outline-variant)', fontSize: 16, background: 'var(--surface)', color: 'var(--on-surface)' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTextTranslate(); }}
          />
          <button
            onClick={handleTextTranslate}
            disabled={!inputText.trim() || isProcessing}
            style={{
              padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: inputText.trim() && !isProcessing ? 'var(--primary)' : 'var(--surface-variant)',
              color: inputText.trim() && !isProcessing ? 'white' : 'var(--on-surface-variant)',
              cursor: inputText.trim() && !isProcessing ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center'
            }}
          >
            <span className="material-symbols-outlined">translate</span>
          </button>
        </div>
      </div>

      {/* Voice Input Button */}
      {speechSupported && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={isListening ? handleStopListening : handleStartListening}
            disabled={isProcessing}
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: isListening ? '#ef4444' : isProcessing ? 'var(--surface-variant)' : 'var(--primary)',
              color: 'white',
              border: isListening ? '4px solid rgba(239,68,68,0.3)' : '4px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isProcessing ? 'default' : 'pointer',
              boxShadow: isListening ? '0 0 0 8px rgba(239,68,68,0.15), 0 4px 16px rgba(0,0,0,0.2)' : '0 4px 16px rgba(0,0,0,0.15)',
              marginBottom: '12px',
              transition: 'all 0.3s ease',
              animation: isListening ? 'mic-pulse 2s ease-in-out infinite' : 'none'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 40 }}>
              {isListening ? 'mic' : isProcessing ? 'hourglass_top' : 'mic_none'}
            </span>
          </button>

          <div style={{ fontWeight: 700, fontSize: 13, color: isListening ? '#ef4444' : 'var(--on-surface-variant)', letterSpacing: '0.5px' }}>
            {isListening ? 'LISTENING — Speak now...' : isProcessing ? 'PROCESSING...' : 'TAP TO SPEAK'}
          </div>
        </div>
      )}

      {/* Output Area */}
      {(inputText || outputText || isProcessing) && (
        <div style={{ background: 'var(--surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--outline-variant)' }}>
          {/* Spoken text section */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-variant)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '6px', letterSpacing: '0.5px' }}>
              SPOKEN TEXT — {fromLangObj?.name}
            </div>
            <div style={{ fontSize: 16, color: 'var(--on-surface)', minHeight: '24px', fontStyle: isListening ? 'italic' : 'normal', opacity: isListening && !inputText ? 0.5 : 1 }}>
              {inputText || (isListening ? 'Listening...' : '...')}
            </div>
          </div>

          {/* Translation section */}
          <div style={{ padding: '20px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
              TRANSLATION — {toLangObj?.name}
            </div>
            {isProcessing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--on-surface-variant)', padding: '8px 0' }}>
                <div style={{ width: '20px', height: '20px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 15 }}>Translating...</span>
              </div>
            ) : (
              <div style={{ fontSize: 22, color: 'var(--on-surface)', fontWeight: 500, minHeight: '36px', lineHeight: 1.4 }}>
                {outputText}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {outputText && !isProcessing && (
            <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--outline-variant)', display: 'flex', gap: '10px' }}>
              {ttsSupported && (
                <button
                  onClick={playTranslation}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '12px', borderRadius: '12px', border: '1px solid var(--outline-variant)',
                    background: 'var(--surface)', color: 'var(--on-surface)', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>volume_up</span>
                  Play
                </button>
              )}

              {speechSupported && (
                <button
                  onClick={handleStartListening}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '12px', borderRadius: '12px', border: 'none',
                    background: 'var(--primary)', color: 'white', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>mic</span>
                  Speak Again
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes mic-pulse { 
          0%, 100% { transform: scale(1); } 
          50% { transform: scale(1.08); } 
        }
      `}</style>
    </div>
  );
}
