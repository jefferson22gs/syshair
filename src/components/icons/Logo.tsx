import { Scissors } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className = "", showText = true, size = "md" }: LogoProps) => {
  const sizes = {
    sm: { icon: 20, text: "text-lg" },
    md: { icon: 28, text: "text-2xl" },
    lg: { icon: 36, text: "text-3xl" },
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
        <div className="relative bg-gradient-to-br from-primary to-gold-light p-2 rounded-xl">
          <Scissors size={sizes[size].icon} className="text-primary-foreground" />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-display font-bold ${sizes[size].text} text-foreground`}>
            Sys<span className="text-gradient-gold">Hair</span>
          </span>
          <span className="text-xs text-muted-foreground font-medium tracking-widest uppercase">
            BelezaTech
          </span>
        </div>
      )}
    </div>
  );
};
