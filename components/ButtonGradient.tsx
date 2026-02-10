"use client";

import React from "react";

const ButtonGradient = ({
  title = "Gradient Button",
  onClick = () => {},
}: {
  title?: string;
  onClick?: () => void;
}) => {
  return (
    <button className="btn-primary px-6 py-2.5 rounded-lg font-medium animate-shimmer" onClick={onClick}>
      {title}
    </button>
  );
};

export default ButtonGradient;
