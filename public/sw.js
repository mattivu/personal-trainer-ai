const DEFAULT_TITLE = "Personal Trainer AI";
const DEFAULT_URL = "/dashboard";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title =
    typeof payload.title === "string" && payload.title.trim().length > 0
      ? payload.title
      : DEFAULT_TITLE;
  const body =
    typeof payload.body === "string" && payload.body.trim().length > 0
      ? payload.body
      : "";
  const url =
    typeof payload.url === "string" && payload.url.startsWith("/")
      ? payload.url
      : DEFAULT_URL;
  const icon =
    typeof payload.icon === "string" && payload.icon.length > 0
      ? payload.icon
      : "/icon";
  const badge =
    typeof payload.badge === "string" && payload.badge.length > 0
      ? payload.badge
      : "/icon";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    event.notification?.data &&
    typeof event.notification.data.url === "string" &&
    event.notification.data.url.startsWith("/")
      ? event.notification.data.url
      : DEFAULT_URL;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      return self.clients.openWindow(url);
    }),
  );
});
