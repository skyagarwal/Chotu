import { Injectable, Logger } from '@nestjs/common';

export interface ToneResult {
  tone: 'happy' | 'angry' | 'urgent' | 'neutral' | 'frustrated' | 'polite' | 'confused';
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: number; // 0-1 scale
  confidence: number;
  indicators: string[]; // Keywords that led to this classification
}

@Injectable()
export class ToneAnalyzerService {
  private readonly logger = new Logger(ToneAnalyzerService.name);

  /**
   * Analyze tone and sentiment of user message
   * Detects emotions, urgency, and sentiment for routing decisions
   */
  async analyzeTone(text: string, language: string = 'en'): Promise<ToneResult> {
    const lowerText = text.toLowerCase();
    const indicators: string[] = [];
    
    // Emotion detection patterns
    const patterns = {
      angry: {
        keywords: ['worst', 'terrible', 'useless', 'pathetic', 'disgusting', 'horrible', 'awful'],
        punctuation: /!{2,}/, // Multiple exclamation marks
        caps: /[A-Z]{4,}/, // Multiple caps words
      },
      frustrated: {
        keywords: ['still waiting', 'again', 'why', 'not working', 'never', 'always late'],
        phrases: ['how many times', 'every time', 'once again'],
      },
      urgent: {
        keywords: ['asap', 'immediately', 'urgent', 'emergency', 'now', 'fast', 'quickly', 'hurry'],
        phrases: ['as soon as possible', 'right now', 'right away'],
      },
      happy: {
        keywords: ['thank', 'thanks', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'perfect'],
        emojis: /[😊😁👍❤️]/,
      },
      polite: {
        keywords: ['please', 'kindly', 'could you', 'would you', 'may i', 'sorry'],
      },
      confused: {
        keywords: ['what', 'how', 'which', 'confused', 'understand', 'explain'],
        punctuation: /\?{2,}/, // Multiple question marks
      },
    };

    // Hindi/Hinglish emotion detection
    const hindiPatterns = {
      angry: ['ganda', 'bekar', 'bakwas', 'kharab'],
      frustrated: ['phir se', 'dobara', 'kyun', 'kab tak'],
      urgent: ['jaldi', 'turant', 'abhi'],
      happy: ['achha', 'badhiya', 'mast', 'zabardast', 'shukriya'],
      polite: ['please', 'kripya', 'meherbani'],
    };

    // Detect angry tone
    if (
      patterns.angry.keywords.some(kw => lowerText.includes(kw)) ||
      patterns.angry.punctuation.test(text) ||
      patterns.angry.caps.test(text)
    ) {
      indicators.push('anger_keywords', 'strong_punctuation');
      return {
        tone: 'angry',
        sentiment: 'negative',
        urgency: 0.9,
        confidence: 0.85,
        indicators,
      };
    }

    // Detect frustrated tone
    if (patterns.frustrated.keywords.some(kw => lowerText.includes(kw))) {
      indicators.push('frustration_keywords');
      return {
        tone: 'frustrated',
        sentiment: 'negative',
        urgency: 0.7,
        confidence: 0.80,
        indicators,
      };
    }

    // Detect urgent tone
    if (
      patterns.urgent.keywords.some(kw => lowerText.includes(kw)) ||
      patterns.urgent.phrases.some(phrase => lowerText.includes(phrase))
    ) {
      indicators.push('urgency_keywords');
      return {
        tone: 'urgent',
        sentiment: 'neutral',
        urgency: 0.85,
        confidence: 0.90,
        indicators,
      };
    }

    // Detect happy tone
    if (patterns.happy.keywords.some(kw => lowerText.includes(kw))) {
      indicators.push('positive_keywords');
      return {
        tone: 'happy',
        sentiment: 'positive',
        urgency: 0.2,
        confidence: 0.85,
        indicators,
      };
    }

    // Detect polite tone
    if (patterns.polite.keywords.some(kw => lowerText.includes(kw))) {
      indicators.push('polite_keywords');
      return {
        tone: 'polite',
        sentiment: 'positive',
        urgency: 0.3,
        confidence: 0.75,
        indicators,
      };
    }

    // Detect confused tone
    if (
      patterns.confused.keywords.some(kw => lowerText.includes(kw)) ||
      patterns.confused.punctuation.test(text)
    ) {
      indicators.push('confusion_keywords');
      return {
        tone: 'confused',
        sentiment: 'neutral',
        urgency: 0.4,
        confidence: 0.70,
        indicators,
      };
    }

    // Check Hindi/Hinglish patterns
    for (const [tone, keywords] of Object.entries(hindiPatterns)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        indicators.push(`hindi_${tone}`);
        return {
          tone: tone as any,
          sentiment: ['angry', 'frustrated'].includes(tone) ? 'negative' : 
                     ['happy', 'polite'].includes(tone) ? 'positive' : 'neutral',
          urgency: tone === 'urgent' ? 0.85 : tone === 'angry' ? 0.9 : 0.5,
          confidence: 0.75,
          indicators,
        };
      }
    }

    // Default: neutral tone
    return {
      tone: 'neutral',
      sentiment: 'neutral',
      urgency: 0.5,
      confidence: 0.60,
      indicators: ['no_strong_indicators'],
    };
  }

  /**
   * Determine if message needs escalation based on tone
   */
  needsEscalation(toneResult: ToneResult): boolean {
    return (
      (toneResult.tone === 'angry' && toneResult.urgency > 0.8) ||
      (toneResult.tone === 'frustrated' && toneResult.urgency > 0.7)
    );
  }

  /**
   * Determine priority level for routing
   */
  getPriority(toneResult: ToneResult): 'high' | 'medium' | 'low' {
    if (toneResult.urgency >= 0.8) return 'high';
    if (toneResult.urgency >= 0.5) return 'medium';
    return 'low';
  }
}
