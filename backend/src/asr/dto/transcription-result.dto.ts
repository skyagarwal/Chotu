export class TranscriptionResultDto {
  text: string;
  language: string;
  confidence: number;
  provider: 'whisper' | 'google' | 'azure' | 'fallback';
  processingTimeMs: number;
  audioDurationSeconds?: number;
  words?: WordTimestamp[];
}

export class WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}
