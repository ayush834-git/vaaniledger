"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight, Loader2, UserCircle2 } from "lucide-react";

import { enableGuestMode } from "@/lib/auth/guestMode";

export default function AuthPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { if (status === "authenticated") router.replace("/dashboard"); }, [router, status]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsLoading(true); setSent(false);
    await signIn("email", { email, redirect: false, callbackUrl: "/dashboard" });
    setIsLoading(false); setSent(true);
  };

  const onContinueAsGuest = () => {
    enableGuestMode();
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="fixed inset-0 -z-10 auth-bg-animated">
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse at 20% 30%, rgba(255,85,0,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0,168,107,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(212,0,106,0.06) 0%, transparent 60%)`,
        }} />
      </div>

      <motion.div initial={{ y: 30, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full max-w-md">
        <div className="rounded-2xl border border-accent/12 bg-white p-8 shadow-soft">
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 mb-4">
              <span className="text-lg font-bold font-mono text-accent">VL</span>
            </div>
            <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">VaaniLedger</h1>
            <p className="mt-2 text-sm text-textSecondary text-center">{t("auth.description")}</p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm text-textSecondary mb-2" htmlFor="email">{t("auth.email")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary/50" />
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@business.com" required
                  className="w-full rounded-xl border border-accent/12 bg-white py-3 pl-10 pr-4 text-sm text-textPrimary outline-none transition placeholder:text-textSecondary/50 focus:border-accent/40 focus:ring-2 focus:ring-accent/15" />
              </div>
            </div>
            <motion.button type="submit" disabled={isLoading} whileTap={{ scale: 0.97 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-[#CC4400] disabled:opacity-50 shadow-glow">
              {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" />{t("auth.sending")}</>) : (<>{t("auth.sendLink")}<ArrowRight className="h-4 w-4" /></>)}
            </motion.button>
            {sent ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-lg border border-income/20 bg-income/[0.06] px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-income shrink-0" />
                <p className="text-sm text-income">{t("auth.sent")}</p>
              </motion.div>
            ) : null}
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-accent/[0.08]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-textSecondary/60">{t("auth.orDivider")}</span>
            </div>
          </div>

          {/* Guest Mode Button */}
          <motion.button
            type="button"
            onClick={onContinueAsGuest}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-accent/20 bg-accent/[0.03] py-3 text-sm font-semibold text-accent transition-all hover:border-accent/40 hover:bg-accent/[0.06]"
          >
            <UserCircle2 className="h-4 w-4" />
            {t("auth.continueAsGuest")}
          </motion.button>
          <p className="mt-2 text-[11px] text-textSecondary/50 text-center">{t("auth.guestNote")}</p>

          <div className="mt-6 border-t border-accent/[0.08] pt-4">
            <p className="text-xs text-textSecondary/60 text-center">{t("auth.noPassword")}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
