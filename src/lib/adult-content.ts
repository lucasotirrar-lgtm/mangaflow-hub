import { useEffect, useState } from "react";
import { safeStorage } from "@/lib/safe-storage";

const key = "mangaflow-adult-enabled";
const changed = "mangaflow-adult-preference-changed";

function read() {
  return safeStorage.getItem(key) === "true";
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
    safeStorage.setItem(key, String(value));
    setEnabled(value);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(changed));
    }
  };

  return { adultEnabled: enabled, setAdultEnabled };
}
