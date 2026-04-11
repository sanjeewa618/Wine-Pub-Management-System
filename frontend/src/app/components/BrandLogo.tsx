import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  textClassName?: string;
}

const sizeStyles: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "w-[44px] sm:w-[52px]",
  md: "w-[52px] sm:w-[60px]",
  lg: "w-[64px] sm:w-[72px]",
};

export const BrandLogo = ({ size = "md", className = "", textClassName = "text-[#E3C06A]" }: BrandLogoProps) => {
  const logoWidth = sizeStyles[size];

  return (
    <div className={`inline-flex items-center gap-2 shrink-0 whitespace-nowrap ${className}`.trim()}>
      <img
        src="/images/logo2.png"
        alt="HeaveN8"
        className={`${logoWidth} h-auto object-contain flex-none`}
      />
      <span className={`font-serif text-[0.98rem] sm:text-[1.12rem] md:text-[1.2rem] font-bold tracking-wide leading-none ${textClassName}`.trim()}>
        HeaveN<span className="text-[#800000]">8</span>
      </span>
    </div>
  );
};
