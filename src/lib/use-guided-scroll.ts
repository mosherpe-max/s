'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { revealElement } from '@/lib/scroll-into-view';

const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'image', 'color']);

// Whether an on-screen keyboard is actually taking up room: the visible part of the page has shrunk well below the
// screen. A focused field alone is not enough, because on an iPhone closing the keyboard leaves focus in Stripe's card
// fields, and the bottom bar would then stay hidden for good. Without the visual viewport API, assume it is open.
export function keyboardTakesRoom(visibleHeight: number | undefined, screenHeight: number, windowHeight: number): boolean {
  if (!visibleHeight) return true;
  return visibleHeight < 0.75 * Math.max(screenHeight, windowHeight);
}

// Something the patron types into (Stripe's card fields are iframes, so those count too).
export function isTypingTarget(el: Element | null): el is HTMLElement {
  if (!el) return false;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'IFRAME') return true;
  if (el.tagName === 'INPUT') return !NON_TEXT_INPUTS.has((el as HTMLInputElement).type);
  return (el as HTMLElement).isContentEditable === true;
}

const USER_SCROLL_QUIET_MS = 1000;

// Makes a form screen follow the patron so they never have to scroll to keep going:
//  - the field they tap into is brought into view, above the on-screen keyboard, and stays there as the keyboard
//    finishes opening;
//  - goTo(element) brings the next section into view when a step is finished, unless the patron has just scrolled
//    on their own (they stay in charge);
//  - keyboardOpen is true while a field has focus on a touch device and the on-screen keyboard is taking up room, so
//    a bottom bar can get out of its way (a desktop browser has no keyboard to make room for).
export function useGuidedScroll(options: { topInsetSelector?: string } = {}): { goTo: (el: HTMLElement | null) => void; keyboardOpen: boolean } {
  const { topInsetSelector } = options;
  const [typing, setTyping] = useState(false);
  const [roomTaken, setRoomTaken] = useState(true);
  const lastUserScrollRef = useRef(0);
  const insetSelectorRef = useRef(topInsetSelector);
  insetSelectorRef.current = topInsetSelector;

  const topInset = useCallback(() => {
    const header = insetSelectorRef.current ? document.querySelector(insetSelectorRef.current) : null;
    return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
  }, []);

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    const reveal = () => {
      const el = document.activeElement;
      if (isTypingTarget(el)) revealElement(el, { topInset: topInset() });
    };
    const refresh = () => {
      // Read after the browser has moved focus, so tabbing from one field to the next is seen as typing throughout.
      setTimeout(() => setTyping(isTypingTarget(document.activeElement) && !!window.matchMedia?.('(pointer: coarse)').matches), 0);
    };
    const onFocusIn = (e: FocusEvent) => {
      refresh();
      if (!isTypingTarget(e.target as Element)) return;
      clearTimers();
      // Once now, then again as the keyboard animates open (its timing differs between phones).
      timers = [0, 300, 700].map(ms => setTimeout(reveal, ms));
    };
    const measure = () => setRoomTaken(keyboardTakesRoom(window.visualViewport?.height, window.screen?.height ?? 0, window.innerHeight));
    const onViewportResize = () => { measure(); if (isTypingTarget(document.activeElement)) reveal(); };
    const markUserScroll = () => { lastUserScrollRef.current = Date.now(); };

    measure();
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', refresh);
    window.addEventListener('blur', refresh);     // focus moving into a Stripe iframe
    window.addEventListener('focus', refresh);
    window.visualViewport?.addEventListener('resize', onViewportResize);
    window.addEventListener('wheel', markUserScroll, { passive: true });
    window.addEventListener('touchmove', markUserScroll, { passive: true });
    return () => {
      clearTimers();
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', refresh);
      window.removeEventListener('blur', refresh);
      window.removeEventListener('focus', refresh);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
      window.removeEventListener('wheel', markUserScroll);
      window.removeEventListener('touchmove', markUserScroll);
    };
  }, [topInset]);

  const goTo = useCallback((el: HTMLElement | null) => {
    if (!el || Date.now() - lastUserScrollRef.current < USER_SCROLL_QUIET_MS) return;
    // Wait a beat so a section that has just appeared has its final size.
    setTimeout(() => revealElement(el, { topInset: topInset(), margin: 12 }), 120);
  }, [topInset]);

  return { goTo, keyboardOpen: typing && roomTaken };
}
