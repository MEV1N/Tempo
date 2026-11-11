import { apiRequest } from '../api/client';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Check for updates periodically
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available
            // eslint-disable-next-line no-console
            console.log('[PWA] New version of Tempo available.');
          }
        };
      }
    };

    return registration;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn(`[PWA] Service worker registration failed: ${err.message}`);
    return null;
  }
}

/**
 * Converts a base64 URL-safe VAPID public key into a Uint8Array buffer required by PushManager.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks current push notification permission and active subscription.
 */
export async function getPushSubscriptionState(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  endpoint?: string;
}> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return { supported: false, permission: 'denied', subscribed: false };
  }

  const permission = Notification.permission;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return {
    supported: true,
    permission,
    subscribed: !!subscription,
    endpoint: subscription?.endpoint,
  };
}

/**
 * Subscribes the current device to Web Push notifications.
 */
export async function subscribeToPush(): Promise<{ success: boolean; message?: string }> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return { success: false, message: 'Web Push is not supported on this browser' };
  }

  // 1. Request browser notification permission explicitly
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, message: 'Push notification permission was denied' };
  }

  // 2. Fetch VAPID public key from backend
  const res = await apiRequest<{ publicKey: string }>('/api/notifications/vapid-public-key');
  if (!res?.publicKey) {
    return { success: false, message: 'Failed to retrieve VAPID public key from server' };
  }

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(res.publicKey);

  // 3. Subscribe with PushManager
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as unknown as BufferSource,
  });

  const subJson = subscription.toJSON();

  // 4. Register subscription on the backend
  await apiRequest('/api/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
      expirationTime: subscription.expirationTime,
    }),
  });

  return { success: true };
}

/**
 * Unsubscribes the current device from Web Push notifications.
 */
export async function unsubscribeFromPush(): Promise<{ success: boolean }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { success: false };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await apiRequest('/api/notifications/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => {});

    await subscription.unsubscribe();
  }

  return { success: true };
}
