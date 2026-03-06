"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { isGuestMode } from "@/lib/auth/guestMode";

export const useRequireAuth = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    setGuest(isGuestMode());
  }, []);

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
