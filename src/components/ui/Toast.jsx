import React from "react";

const ToastContext = React.createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]); // {id, message, type, visible}
  const timers = React.useRef({});

  // Show a new toast (adds to stack)
  const show = React.useCallback((message, opts = {}) => {
    const { type = "info", duration = 2800 } = opts;
    const id = Math.random().toString(36).slice(2) + Date.now();
    // 1. Add with visible: false
    setToasts((prev) => [...prev, { id, message, type, visible: false }]);
    // 2. In next microtask, set visible: true to trigger transition
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, visible: true } : t))
      );
    }, 0);
    // 3. Hide after duration
    timers.current[id] = setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
      );
      timers.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, 320);
    }, duration);
  }, []);

  // Hide a toast by id (optional, not used by default)
  const hide = React.useCallback((id) => {
    if (id && timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );
  }, []);

  React.useEffect(() => {
    // Cleanup on unmount
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, []);

  const value = React.useMemo(() => ({ show, hide }), [show, hide]);

  const palette = (type) =>
    ({
      info: { bg: "#2563eb", fg: "#fff" }, // blue-600
      success: { bg: "#2e7d32", fg: "#fff" }, // green-700
      error: { bg: "#d32f2f", fg: "#fff" }, // red-600
    }[type] || { bg: "#333", fg: "#fff" });

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 130,
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast, idx) => {
          const pal = palette(toast.type);
          return (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              style={{
                background: pal.bg,
                color: pal.fg,
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                opacity: toast.visible ? 1 : 0,
                transform: toast.visible ? `translateY(32px)` : `translateY(0)`,
                transition: toast.visible
                  ? "opacity 340ms cubic-bezier(.4,0,.2,1), transform 480ms cubic-bezier(.4,0,.2,1)"
                  : "opacity 180ms ease, transform 260ms ease",
                pointerEvents: "none",
                maxWidth: "min(92vw, 640px)",
                textAlign: "center",
                lineHeight: 1.3,
                marginTop: idx === 0 ? 0 : 10,
                marginBottom: 0,
                minWidth: 120,
                willChange: "opacity, transform",
              }}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}
