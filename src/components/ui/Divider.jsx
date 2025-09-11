import React from "react";
import styles from "./Divider.module.css";

export default function Divider({ className = "", style, ...rest }) {
  return (
    <div
      className={`${styles.divider}${className ? " " + className : ""}`}
      style={style}
      aria-hidden="true"
      {...rest}
    />
  );
}
