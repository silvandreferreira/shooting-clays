/**
 * New versions of the app (decision #78). A new deployment's service worker takes over as soon as
 * it is installed (`autoUpdate`), but a page keeps running the code it loaded: an installed app
 * left open stayed on the old version until it was closed. So the app looks for a new version
 * when it comes back to the screen, and reloads once when a new version takes control.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // A first install also takes control: only reload when a previous version was running.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
  void navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    })
    .catch(() => {
      // No service worker (e.g. private mode): the app still works online.
    });
}
