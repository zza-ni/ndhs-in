import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ToastProvider } from "./components/ui/Toast.jsx";
import "./initApp.js";

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);

// 앱이 마운트되면 프리로더 제거
try {
  const pre = document.getElementById("preloader");
  if (pre) pre.classList.remove("visible");
  sessionStorage.removeItem("appReloading");
} catch {}
