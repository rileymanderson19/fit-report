"use client";

import { ReactNode } from "react";
import { openCalendlyPopup } from "@/libs/calendly";

interface CalendlyButtonProps {
  children: ReactNode;
  className?: string;
}

const CalendlyButton = ({ children, className }: CalendlyButtonProps) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        openCalendlyPopup();
      }}
      className={className}
    >
      {children}
    </button>
  );
};

export default CalendlyButton;
