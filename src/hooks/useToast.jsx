import { useState, useCallback } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info", duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
