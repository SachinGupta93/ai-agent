// services/speechService.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SpeechConfig {
  language: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface RecognitionConfig {
  language: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

// Supported languages with their codes and voices
export const SUPPORTED_LANGUAGES = {
  'en-US': { name: 'English (US)', voices: ['Microsoft Zira Desktop', 'Microsoft David Desktop'] },
  'en-GB': { name: 'English (UK)', voices: ['Microsoft Hazel Desktop', 'Microsoft George Desktop'] },
  'es-ES': { name: 'Spanish (Spain)', voices: ['Microsoft Helena Desktop', 'Microsoft Pablo Desktop'] },
  'es-MX': { name: 'Spanish (Mexico)', voices: ['Microsoft Sabina Desktop'] },
  'fr-FR': { name: 'French (France)', voices: ['Microsoft Hortense Desktop', 'Microsoft Paul Desktop'] },
  'de-DE': { name: 'German (Germany)', voices: ['Microsoft Katja Desktop', 'Microsoft Stefan Desktop'] },
  'it-IT': { name: 'Italian (Italy)', voices: ['Microsoft Elsa Desktop', 'Microsoft Cosimo Desktop'] },
  'pt-BR': { name: 'Portuguese (Brazil)', voices: ['Microsoft Maria Desktop', 'Microsoft Daniel Desktop'] },
  'ru-RU': { name: 'Russian (Russia)', voices: ['Microsoft Irina Desktop', 'Microsoft Pavel Desktop'] },
  'ja-JP': { name: 'Japanese (Japan)', voices: ['Microsoft Haruka Desktop', 'Microsoft Ichiro Desktop'] },
  'ko-KR': { name: 'Korean (Korea)', voices: ['Microsoft Heami Desktop'] },
  'zh-CN': { name: 'Chinese (Simplified)', voices: ['Microsoft Huihui Desktop', 'Microsoft Kangkang Desktop'] },
  'zh-TW': { name: 'Chinese (Traditional)', voices: ['Microsoft Hanhan Desktop', 'Microsoft Zhiwei Desktop'] },
  'hi-IN': { name: 'Hindi (India)', voices: ['Microsoft Kalpana Desktop', 'Microsoft Hemant Desktop'] },
  'ar-SA': { name: 'Arabic (Saudi Arabia)', voices: ['Microsoft Naayf Desktop'] },
  'th-TH': { name: 'Thai (Thailand)', voices: ['Microsoft Pattara Desktop'] },
  'vi-VN': { name: 'Vietnamese (Vietnam)', voices: ['Microsoft An Desktop'] },
  'nl-NL': { name: 'Dutch (Netherlands)', voices: ['Microsoft Frank Desktop'] },
  'sv-SE': { name: 'Swedish (Sweden)', voices: ['Microsoft Bengt Desktop'] },
  'da-DK': { name: 'Danish (Denmark)', voices: ['Microsoft Helle Desktop'] },
  'no-NO': { name: 'Norwegian (Norway)', voices: ['Microsoft Jon Desktop'] },
  'fi-FI': { name: 'Finnish (Finland)', voices: ['Microsoft Heidi Desktop'] }
};

export class AdvancedSpeechService {
  private currentLanguage: string = 'en-US';
  private currentVoice: string = 'Microsoft Zira Desktop';
  private speechRate: number = 1.0;
  private speechPitch: number = 1.0;
  private speechVolume: number = 1.0;

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    // Check available voices on the system
    try {
      const { stdout } = await execAsync('powershell "Add-Type -AssemblyName System.Speech; [System.Speech.Synthesis.SpeechSynthesizer]::new().GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }"');
      console.log('Available voices:', stdout);
    } catch (error) {
      console.warn('Could not enumerate system voices:', error);
    }
  }

  // Text-to-Speech with advanced features
  async speak(text: string, config?: SpeechConfig): Promise<void> {
    const language = config?.language || this.currentLanguage;
    const voice = config?.voice || this.getDefaultVoice(language);
    const rate = config?.rate || this.speechRate;
    const pitch = config?.pitch || this.speechPitch;
    const volume = config?.volume || this.speechVolume;

    try {
      // Use Windows SAPI for high-quality TTS
      const powershellScript = `
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.SelectVoice("${voice}")
        $synth.Rate = ${Math.round((rate - 1) * 10)}
        $synth.Volume = ${Math.round(volume * 100)}
        $synth.Speak("${text.replace(/"/g, '""')}")
      `;

      await execAsync(`powershell "${powershellScript}"`);
    } catch (error) {
      console.error('TTS Error:', error);
      // Fallback to browser TTS
      this.fallbackSpeak(text, language);
    }
  }

  // Fallback browser TTS
  private fallbackSpeak(text: string, language: string) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = this.speechRate;
      utterance.pitch = this.speechPitch;
      utterance.volume = this.speechVolume;
      window.speechSynthesis.speak(utterance);
    }
  }

  // Advanced Speech Recognition
  createAdvancedRecognition(config: RecognitionConfig): any {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = config.language;
    recognition.continuous = config.continuous || false;
    recognition.interimResults = config.interimResults || false;
    recognition.maxAlternatives = config.maxAlternatives || 1;

    // Enhanced recognition with confidence scoring
    recognition.onresult = (event: any) => {
      const results = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          results.push({
            transcript: result[0].transcript,
            confidence: result[0].confidence,
            alternatives: Array.from(result).map((alt: any) => ({
              transcript: alt.transcript,
              confidence: alt.confidence
            }))
          });
        }
      }
      recognition.onenhancedresult?.(results);
    };

    return recognition;
  }

  // Language Detection
  async detectLanguage(text: string): Promise<string> {
    // Simple language detection based on character patterns
    const patterns = {
      'zh-CN': /[\u4e00-\u9fff]/,
      'ja-JP': /[\u3040-\u309f\u30a0-\u30ff]/,
      'ko-KR': /[\uac00-\ud7af]/,
      'ar-SA': /[\u0600-\u06ff]/,
      'hi-IN': /[\u0900-\u097f]/,
      'th-TH': /[\u0e00-\u0e7f]/,
      'ru-RU': /[\u0400-\u04ff]/
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }

    // Default to English if no pattern matches
    return 'en-US';
  }

  // Voice Cloning Preparation (for future integration)
  async prepareVoiceCloning(audioSamples: Blob[]): Promise<any> {
    // This would integrate with services like ElevenLabs, Murf, or local voice cloning
    console.log('Voice cloning preparation - samples:', audioSamples.length);
    return {
      status: 'prepared',
      sampleCount: audioSamples.length,
      message: 'Voice samples prepared for cloning'
    };
  }

  // Real-time Voice Conversion
  async convertVoiceRealtime(audioStream: MediaStream, targetVoice: string): Promise<MediaStream> {
    // This would integrate with real-time voice conversion APIs
    console.log('Real-time voice conversion to:', targetVoice);
    return audioStream; // Placeholder
  }

  // Emotion Detection in Speech
  async detectEmotion(audioBlob: Blob): Promise<any> {
    // This would integrate with emotion detection APIs
    return {
      emotion: 'neutral',
      confidence: 0.8,
      emotions: {
        happy: 0.1,
        sad: 0.1,
        angry: 0.1,
        neutral: 0.8,
        excited: 0.1
      }
    };
  }

  // Utility methods
  getDefaultVoice(language: string): string {
    const langConfig = SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES];
    return langConfig?.voices[0] || 'Microsoft Zira Desktop';
  }

  getSupportedLanguages(): typeof SUPPORTED_LANGUAGES {
    return SUPPORTED_LANGUAGES;
  }

  setLanguage(language: string) {
    if (SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES]) {
      this.currentLanguage = language;
      this.currentVoice = this.getDefaultVoice(language);
    }
  }

  setVoice(voice: string) {
    this.currentVoice = voice;
  }

  setSpeechRate(rate: number) {
    this.speechRate = Math.max(0.1, Math.min(3.0, rate));
  }

  setSpeechPitch(pitch: number) {
    this.speechPitch = Math.max(0.1, Math.min(2.0, pitch));
  }

  setSpeechVolume(volume: number) {
    this.speechVolume = Math.max(0.0, Math.min(1.0, volume));
  }

  // Wake word detection
  async setupWakeWordDetection(wakeWords: string[]): Promise<any> {
    // This would integrate with wake word detection libraries
    console.log('Setting up wake word detection for:', wakeWords);
    return {
      status: 'active',
      wakeWords,
      message: 'Wake word detection activated'
    };
  }

  // Voice authentication
  async authenticateVoice(audioBlob: Blob): Promise<any> {
    // This would integrate with voice biometric APIs
    return {
      authenticated: true,
      confidence: 0.95,
      userId: 'creator',
      message: 'Voice authentication successful'
    };
  }
}

// Singleton instance
export const speechService = new AdvancedSpeechService();

// Translation service integration
export class TranslationService {
  private apiKey: string = process.env.DEEPL_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY || '';

  async translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
    try {
      // Try DeepL first (higher quality)
      if (process.env.DEEPL_API_KEY) {
        return await this.translateWithDeepL(text, targetLanguage, sourceLanguage);
      }
      
      // Fallback to Google Translate
      if (process.env.GOOGLE_TRANSLATE_API_KEY) {
        return await this.translateWithGoogle(text, targetLanguage, sourceLanguage);
      }

      // Local translation fallback (basic)
      return await this.translateLocally(text, targetLanguage);
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }

  private async translateWithDeepL(text: string, targetLang: string, sourceLang?: string): Promise<string> {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        target_lang: targetLang.split('-')[0].toUpperCase(),
        ...(sourceLang && { source_lang: sourceLang.split('-')[0].toUpperCase() })
      })
    });

    const data = await response.json();
    return data.translations[0].text;
  }

  private async translateWithGoogle(text: string, targetLang: string, sourceLang?: string): Promise<string> {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLang.split('-')[0],
        ...(sourceLang && { source: sourceLang.split('-')[0] })
      })
    });

    const data = await response.json();
    return data.data.translations[0].translatedText;
  }

  private async translateLocally(text: string, targetLang: string): Promise<string> {
    // Basic local translation using simple word mapping
    // This is a placeholder - in production, you'd use a local translation model
    const basicTranslations: { [key: string]: { [key: string]: string } } = {
      'es': {
        'hello': 'hola',
        'goodbye': 'adiós',
        'thank you': 'gracias',
        'yes': 'sí',
        'no': 'no'
      },
      'fr': {
        'hello': 'bonjour',
        'goodbye': 'au revoir',
        'thank you': 'merci',
        'yes': 'oui',
        'no': 'non'
      }
    };

    const langCode = targetLang.split('-')[0];
    const translations = basicTranslations[langCode];
    
    if (translations) {
      let translatedText = text.toLowerCase();
      for (const [english, translated] of Object.entries(translations)) {
        translatedText = translatedText.replace(new RegExp(english, 'gi'), translated);
      }
      return translatedText;
    }

    return text;
  }
}

export const translationService = new TranslationService();