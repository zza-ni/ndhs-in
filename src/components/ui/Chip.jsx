import React from "react";

export function Chip({ size = "sm", className = "", children, ...rest }) {
  const cn = `chip chip-${size}${className ? " " + className : ""}`;
  return (
    <span className={cn} {...rest}>
      {children}
    </span>
  );
}

export function TagChip({ className = "", children, ...rest }) {
  return (
    <span className={`tag-chip${className ? " " + className : ""}`} {...rest}>
      {children}
    </span>
  );
}
