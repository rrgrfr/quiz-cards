let exitGuard: (() => boolean) | null = null;

/** Ask before leaving a screen with unsaved work (D-065). */
export function setExitGuard(guard: (() => boolean) | null): void {
  exitGuard = guard;
}

export function canLeave(): boolean {
  return exitGuard ? exitGuard() : true;
}

export function clearExitGuard(): void {
  exitGuard = null;
}
