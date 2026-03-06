"use client";

const GUEST_MODE_KEY = "vaaniledger.guestMode";
const CHANGE_EVENT = "vaaniledger:guest-change";

/**
 * Check if the user is currently in guest mode.
 */
export const isGuestMode = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GUEST_MODE_KEY) === "true";
};

/**
 * Enable guest mode — allows using the app without signing in.
 */
export const enableGuestMode = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_MODE_KEY, "true");
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

/**
 * Disable guest mode — for when the user signs in or explicitly exits.
 */
export const disableGuestMode = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_MODE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
};
