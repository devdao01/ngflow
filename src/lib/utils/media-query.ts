import { signal } from '@angular/core';

/**
 * Signal-backed replacement for `MediaQuery` from 'svelte/reactivity'.
 * `current` is reactive when read inside a computed/effect/template.
 */
export class MediaQuerySignal {
  private readonly matches = signal(false);

  constructor(query: string, fallback?: boolean) {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mql = window.matchMedia(query);
      this.matches.set(mql.matches);
      mql.addEventListener('change', (event) => this.matches.set(event.matches));
    } else if (fallback !== undefined) {
      this.matches.set(fallback);
    }
  }

  get current(): boolean {
    return this.matches();
  }
}
