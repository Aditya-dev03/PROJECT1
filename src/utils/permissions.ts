/**
 * Web Permissions & Device Access Helper
 */

export const requestLocationPermission = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return false;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      (err) => {
        console.warn('Geolocation permission error/denied:', err.message);
        resolve(false);
      },
      { timeout: 5000 }
    );
  });
};

export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  return true; // Web file inputs work natively
};

export const requestCameraPermission = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (e) {
    console.warn('Camera access denied:', e);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
};
