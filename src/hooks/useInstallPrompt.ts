import { useCallback, useEffect, useState } from "react";

function readStandalone(): boolean {
  const w = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    w.standalone === true
  );
}

export function useInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(readStandalone);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const sync = () => setIsStandalone(readStandalone());
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

  const promptInstall = useCallback(async () => {
    if (!installEvent) return false;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    return choice.outcome === "accepted";
  }, [installEvent]);

  return {
    isStandalone,
    isIos,
    isMobile,
    canPromptInstall: Boolean(installEvent) && !isStandalone,
    promptInstall,
  };
}

