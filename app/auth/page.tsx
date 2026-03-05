"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageSection } from "@/components/ui/PageSection";

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
    <PageSection title={t("auth.title")} subtitle={t("auth.description")}>
      <Card className="mx-auto max-w-md">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-textSecondary" htmlFor="email">
            {t("auth.email")}
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@business.com"
            required
          />
          <Button className="w-full" disabled={isLoading} type="submit">
            {isLoading ? "Sending..." : t("auth.sendLink")}
          </Button>
          {sent ? <p className="text-sm text-income">{t("auth.sent")}</p> : null}
        </form>
      </Card>
    </PageSection>
  );
}
