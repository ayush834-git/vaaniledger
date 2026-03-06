"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useSyncExternalStore } from "react";

import { isGuestMode } from "@/lib/auth/guestMode";

/**
 * useSyncExternalStore-compatible subscriber for guest mode.
 * localStorage is the "external store"; we re-check on storage events.
 */
const subscribeToGuestMode = (onStoreChange: () => void) => {
  // Listen for storage changes from other tabs
  window.addEventListener("storage", onStoreChange);
  // Listen for a custom event we fire after enableGuestMode / disableGuestMode
  window.addEventListener("vaaniledger:guest-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("vaaniledger:guest-change", onStoreChange);
  };
};

const getGuestSnapshot = () => isGuestMode();
const getServerSnapshot = () => false;

export const useRequireAuth = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Synchronously read guest mode from localStorage — no hydration race
  const guest = useSyncExternalStore(
    subscribeToGuestMode,
    getGuestSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (status === "unauthenticated" && !guest) {
      router.replace("/auth");
    }
  }, [router, status, guest]);

  return {
    session,
    status,
    isAuthenticated: status === "authenticated" || guest,
    isGuest: guest,
  };
};
