'use client';

import { useEffect } from 'react';

// The "new order" chime for the staff screens (Beverage Cart, Clubhouse, Lane).
//
// Phones only let a page make sound after the person has tapped something, so a
// single audio context is created and woken up from a real tap (starting a shift,
// or the first touch anywhere on a staff screen) and then reused for every chime.
// It is never created outside a tap, and nothing here touches the Notification API.
// If the phone hasn't allowed sound yet (or the app was just backgrounded), the
// chime is skipped and the on-screen "new order" toast still shows.

let audioContext: AudioContext | null = null;

function getContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null;
}

// Call from inside a tap/click handler.
export function unlockStaffAlertSound() {
  try {
    if (!audioContext) {
      const Ctx = getContextClass();
      if (!Ctx) return;
      audioContext = new Ctx();
    }
    if (audioContext.state !== 'running') void audioContext.resume();

    // A silent blip completes the unlock on iOS.
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.02);
  } catch {
    // Sound just stays off; the toast still shows.
  }
}

// Plays a clear two-tone chime. Returns false (and plays nothing) if sound isn't unlocked.
export function playStaffAlertSound(): boolean {
  const ctx = audioContext;
  if (!ctx || ctx.state !== 'running') return false;
  try {
    const start = ctx.currentTime;
    [880, 1175].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = start + i * 0.22;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.6, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    return true;
  } catch {
    return false;
  }
}

// Keeps sound ready while a staff screen is open: any tap (re)wakes the audio context,
// including after the phone has been locked or the app backgrounded.
export function useStaffAlertSound() {
  useEffect(() => {
    const wake = () => unlockStaffAlertSound();
    document.addEventListener('pointerdown', wake, { passive: true });
    document.addEventListener('touchend', wake, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', wake);
      document.removeEventListener('touchend', wake);
    };
  }, []);
}
