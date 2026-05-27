import { useState, useEffect } from "react";

export function useTimer(endTime) {
  function calc(end) {
    const endMs = end?.toDate ? end.toDate().getTime() : new Date(end).getTime();
    const diff = Math.max(0, endMs - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
      total: diff,
      ended: diff === 0,
      urgent: diff > 0 && diff < 3600000,
    };
  }

  const [timeLeft, setTimeLeft] = useState(() => calc(endTime));

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(calc(endTime)), 1000);
    return () => clearInterval(t);
  }, [endTime]);

  return timeLeft;
}
