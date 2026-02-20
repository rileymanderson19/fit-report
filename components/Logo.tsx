"use client";

import Link from "next/link";

interface LogoProps {
  variant?: "icon" | "full";
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark";
  className?: string;
  href?: string;
}

const sizeConfig = {
  sm: { icon: 20, textClass: "text-sm font-bold", gap: "gap-1.5" },
  md: { icon: 24, textClass: "text-lg font-bold", gap: "gap-2" },
  lg: { icon: 32, textClass: "text-xl font-extrabold", gap: "gap-2.5" },
};

function LogoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <rect width="32" height="32" rx="8" fill="#2563EB" />
      <rect x="7" y="8" width="18" height="3" rx="1.5" fill="white" />
      <rect x="7" y="15" width="13" height="3" rx="1.5" fill="white" />
      <rect x="7" y="22" width="8" height="3" rx="1.5" fill="white" />
    </svg>
  );
}

export default function Logo({
  variant = "full",
  size = "md",
  theme = "light",
  className = "",
  href,
}: LogoProps) {
  const config = sizeConfig[size];
  const textColor = theme === "dark" ? "text-white" : "text-gray-900";

  const content = (
    <span className={`flex items-center ${config.gap} ${className}`}>
      <LogoIcon size={config.icon} />
      {variant === "full" && (
        <span className={`font-display ${config.textClass} whitespace-nowrap`}>
          <span className="text-blue-600">Fit</span>
          <span className={textColor}>Report</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}

export { LogoIcon };
