"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setSent(false);

    await signIn("email", {
      email,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setIsLoading(false);
    setSent(true);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      {/* Animated background layer */}
      <div className="fixed inset-0 -z-10 auth-bg-animated">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 30%, rgba(245,158,11,0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 70%, rgba(34,197,94,0.08) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 60%)
            `,
          }}
        />
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#0D1728]/90 p-8 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 mb-4">
              <span className="text-lg font-bold font-mono text-amber-400">VL</span>
            </div>
            <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              VaaniLedger
            </h1>
            <p className="mt-2 text-sm text-slate-400 text-center">{t("auth.description")}</p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm text-slate-400 mb-2" htmlFor="email">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="owner@business.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-amber-400/20"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-50 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  {t("auth.sendLink")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg border border-green-400/20 bg-green-400/[0.06] px-4 py-3"
              >
                <div className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
                <p className="text-sm text-green-400">{t("auth.sent")}</p>
              </motion.div>
            ) : null}
          </form>

          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <p className="text-xs text-slate-600 text-center">
              We&apos;ll send a magic link to your email. No password needed.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
