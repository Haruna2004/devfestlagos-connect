// Install-to-home-screen helpers.
// Chrome fires `beforeinstallprompt` once, early, so we catch it at startup and keep it.

type BIPEvent = Event & { prompt: () => Promise<void> };

let deferred: BIPEvent | null = null;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as BIPEvent;
});

export const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

// Only worth asking if the app isn't installed and the browser can do it.
export const canInstall = () => !isStandalone() && (isIOS() || deferred != null);

export async function nativeInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  deferred = null;
  return true;
}

const ASKED = "connect.installAsked";
export const alreadyAsked = () => {
  try {
    return localStorage.getItem(ASKED) === "1";
  } catch {
    return true;
  }
};
export const markAsked = () => {
  try {
    localStorage.setItem(ASKED, "1");
  } catch {
    // ignore
  }
};
