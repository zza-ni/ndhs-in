import React from "react";

export function Card({
  as: As = "div",
  className = "",
  style,
  children,
  ...rest
}) {
  return (
    <As
      className={`card${className ? " " + className : ""}`}
      style={style}
      {...rest}
    >
      {children}
    </As>
  );
}

export function CardHeader({ className = "", style, children, ...rest }) {
  return (
    <div
      className={`card-header${className ? " " + className : ""}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  as: As = "h3",
  className = "",
  style,
  children,
  ...rest
}) {
  return (
    <As
      className={`card-title${className ? " " + className : ""}`}
      style={style}
      {...rest}
    >
      {children}
    </As>
  );
}

export function CardBody({ className = "", style, children, ...rest }) {
  return (
    <div
      className={`card-body${className ? " " + className : ""}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}
