import { cn } from "@/lib/utils/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export const Button = ({ className, variant = "primary", ...props }: ButtonProps) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-accent text-bg hover:brightness-110"
          : "border border-white/10 bg-transparent text-textSecondary hover:bg-white/10 hover:text-textPrimary",
        className,
      )}
      {...props}
    />
  );
};