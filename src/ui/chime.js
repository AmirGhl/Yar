/**
 * زنگ کوتاه پایان تایمر، ساخته‌شده با Web Audio — بدون فایل صوتی.
 * سه نت نرم و رو به بالا؛ آن‌قدر آرام که در کتابخانه هم آزار ندهد.
 */

let context = null;

export function playChime() {
  try {
    context ??= new AudioContext();
    const start = context.currentTime + 0.02;
    [659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const at = start + index * 0.16;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.16, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 1);
    });
  } catch {
    // مرورگر صدا را مسدود کرده یا Web Audio در دسترس نیست — توست کافی است
  }
}
