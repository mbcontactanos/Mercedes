export function normalizeWakeWordTranscript(transcript) {
  const cleanedTranscript = String(transcript ?? "")
    .normalize("NFKC")
    .replace(/[.,;:!?¡¿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const loweredTranscript = cleanedTranscript.toLowerCase();
  const wakeWordMatch = loweredTranscript.match(/^(omar|o mar)\b\s*(.*)$/i);

  if (!wakeWordMatch) {
    return {
      cleanedTranscript,
      commandTranscript: cleanedTranscript,
      wakeWordDetected: false,
    };
  }

  return {
    cleanedTranscript,
    commandTranscript: wakeWordMatch[2]?.trim() ?? "",
    wakeWordDetected: true,
  };
}

export function sanitizeVoiceTranscript(transcript) {
  const normalized = String(transcript ?? "")
    .normalize("NFKC")
    .replace(/[.,;:!?¡¿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  const dedupedWords = normalized.split(" ").filter((word, index, words) => {
    const previousWord = words[index - 1];
    return previousWord ? previousWord.toLowerCase() !== word.toLowerCase() : true;
  });

  return dedupedWords.join(" ").trim();
}

export function isMeaningfulVoiceTranscript(transcript) {
  const normalized = sanitizeVoiceTranscript(transcript);

  if (!normalized) {
    return false;
  }

  const lower = normalized.toLowerCase();

  if (/^(omar|o mar|eh|ah|mm|mmm|um|uh|hmm)$/.test(lower)) {
    return false;
  }

  if (normalized.split(" ").length === 1 && normalized.length < 5) {
    return false;
  }

  return true;
}

export function buildMicrophoneConstraints() {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  };
}
