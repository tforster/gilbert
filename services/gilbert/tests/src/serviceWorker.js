// TODO: Make this dynamic
const version = "1.0.0";
/**
 * @description: Handle the on install event for new service workers.
 * @param {Object} event: The on install event.
 * @memberof serviceWorker.js
 */
self.addEventListener("install", (event) => {
  // Start using the new service worker immediately
  event.waitUntil(self.skipWaiting());
});

/**
 * @description: Handle the on activate event for new service workers.
 * @param {Object} event: The on activate event.
 * @memberof serviceWorker.js
 */
self.addEventListener("activate", (event) => {
  // Claim all available clients.  Prevents the case where an old SW is controlling some clients.
  event.waitUntil(self.clients.claim());

  // Notify all clients of the new version
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "update", version: version });
      });
    })
  );
});

