export const speakText = (text: string) => {
  if (!window.speechSynthesis) return;
  
  // Cancel any existing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Find a decent voice
  const voices = window.speechSynthesis.getVoices();
  const enhancedVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha")) || voices[0];
  
  if (enhancedVoice) {
    utterance.voice = enhancedVoice;
  }
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  
  window.speechSynthesis.speak(utterance);
};
