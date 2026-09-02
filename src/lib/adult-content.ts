import { useEffect, useState } from "react";

const key = "mangaflow-adult-enabled";
const changed = "mangaflow-adult-preference-changed";

function read() {
  return localStorage.getItem(key) === "true";
}

export function useAdultContent() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const refresh = () => setEnabled(read());
    refresh();
    window.addEventListener(changed, refresh);
    return () => window.removeEventListener(changed, refresh);
  }, []);

  const setAdultEnabled = (value: boolean) => {
    localStorage.setItem(key, String(value));
    setEnabled(value);
    window.dispatchEvent(new Event(changed));
  };

  return { adultEnabled: enabled, setAdultEnabled };
}
