import { socialApi } from "@/lib/api";

/** VAPID public key (URL-safe base64) → `Uint8Array` for `PushManager.subscribe`. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the app service worker, subscribes to Web Push with the server VAPID key,
 * and POSTs the subscription to `/api/social/push/subscribe/`.
 */
export async function subscribeToPushNotifications(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Push is not supported in this browser." };
  }
  const { data: vapid } = await socialApi.vapidPublicKey();
  if (!vapid.enabled || !vapid.public_key) {
    return {
      ok: false,
      error: "Push is not configured on the server (add VAPID keys).",
    };
  }
  let perm: NotificationPermission = "default";
  try {
    perm = await Notification.requestPermission();
  } catch {
    perm = "denied";
  }
  if (perm !== "granted") {
    return { ok: false, error: "Notification permission was not granted." };
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  await reg.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid.public_key),
  });
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "Could not read push subscription." };
  }
  await socialApi.pushSubscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
  return { ok: true };
}
