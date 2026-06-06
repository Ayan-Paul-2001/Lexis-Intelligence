export type TranscriptionMode = 'dialogue' | 'lyrical';

/**
 * Universal rule: detect the spoken language and always write in its native script.
 * Zero hardcoding — the model decides entirely from the audio.
 */
const NATIVE_SCRIPT_RULE = `
LANGUAGE & SCRIPT RULE (mandatory — apply to every word):
- Identify every language spoken in the audio.
- Write each word exactly as a native writer of that language would write it — using its proper Unicode script.
- NEVER transliterate or romanize words from a non-Latin-script language.
- NEVER translate any word into a different language.
- For mixed-language audio, switch scripts word-by-word as the speaker switches languages.
`;

/**
 * Optimized dialogue mode prompt with full speaker diarization strategy.
 */
const DIALOGUE_PROMPT = `You are an expert audio transcriptionist and speaker diarization specialist.
Your task: produce a COMPLETE, VERBATIM, speaker-diarized transcript of the entire audio recording.
${NATIVE_SCRIPT_RULE}

═══ STEP 1 — SPEAKER ANALYSIS (do this mentally before writing) ═══
Before transcribing, carefully listen through the audio and identify:
- The EXACT number of distinct speakers present.
- Each speaker's unique voice characteristics (pitch, accent, speech pattern).
- Any names spoken in the audio — use real names as speaker labels wherever possible.
- Approximate speaking time and turn-taking patterns.

═══ STEP 2 — DIARIZATION RULES ═══
- Assign a permanent label to each speaker: their real name if said aloud, otherwise "Speaker 1", "Speaker 2", etc. (or localized equivalents in the audio's language).
- Never switch a speaker's label mid-transcript.
- Each new speaker turn starts on its own line, formatted exactly as: **[Label]:** followed by their speech.
- If two speakers overlap or talk simultaneously, write: [cross-talk] and capture both sides as best as possible on separate lines.
- If a speaker is unidentifiable (background voice, unclear), use **Unknown:**.

═══ STEP 3 — TRANSCRIPTION RULES ═══
- VERBATIM only — transcribe every single word, filler word (uh, um, hmm), false start, and repetition exactly as spoken.
- Do NOT paraphrase, clean up grammar, or summarize any part.
- Capture non-verbal sounds inline in brackets when meaningful: [laughs], [sighs], [clears throat], [long pause], [crying], [music playing], etc.
- Preserve sentence-ending punctuation per the speaker's natural intonation (. ? !).
- Never skip or truncate any portion — the transcript must cover the audio from first word to last.

═══ STEP 4 — OUTPUT FORMAT ═══
Use clean Markdown. Example structure:

**Speaker 1:** Good morning, how are you doing today?

**Speaker 2:** I'm doing well, thank you for asking! [laughs]

**Speaker 1:** That's great. So let's get started with—

**Speaker 2:** [interrupts] Actually, can I say something first?

If the audio contains a title, introduction, or host announcement at the start, include it with an appropriate label.
Begin the transcript immediately after this instruction — no preamble, no explanation.`;

/**
 * Optimized lyrical/plain mode prompt.
 */
const LYRICAL_PROMPT = `You are an expert audio transcriptionist.
Your task: produce a COMPLETE, VERBATIM plain-text transcript of the entire audio recording — no speaker labels.
${NATIVE_SCRIPT_RULE}

RULES:
1. Write every spoken word exactly as heard — verbatim, including fillers, repetitions, and false starts.
2. Do NOT add speaker labels, headers, or attribution of any kind.
3. Do NOT summarize, paraphrase, or omit any portion.
4. Represent natural breath-pauses and topic shifts as paragraph breaks.
5. Include meaningful non-verbal sounds inline in brackets: [music], [laughter], [applause], [pause], etc.
6. Punctuate naturally based on spoken intonation.
7. Continue transcribing until the very last word of the audio.

Output clean, readable paragraphs — like song lyrics or a script without character names.
Begin the transcript immediately — no preamble.`;

export async function transcribeAudio(
  base64Audio: string,
  mimeType: string,
  mode: TranscriptionMode = 'dialogue'
): Promise<string> {

  const prompt = mode === 'dialogue' ? DIALOGUE_PROMPT : LYRICAL_PROMPT;

  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Audio,
        mimeType,
        prompt
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.text || "No transcription available.";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Transcription error:", message);
    throw new Error(`Transcription failed: ${message}`);
  }
}

export async function transcribeYoutube(
  youtubeUrl: string,
  mode: TranscriptionMode = 'dialogue'
): Promise<string> {
  const prompt = mode === 'dialogue' ? DIALOGUE_PROMPT : LYRICAL_PROMPT;

  try {
    const response = await fetch('/api/transcribe-youtube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        youtubeUrl,
        prompt
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.text || "No transcription available.";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("YouTube transcription error:", message);
    throw new Error(`YouTube transcription failed: ${message}`);
  }
}
