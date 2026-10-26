export type Coords = { lat: number; lng: number; accuracy?: number };

/**
 * Single entry point for the device position.
 *
 * Web build: browser Geolocation API (the browser shows its own permission prompt).
 * When we add Capacitor, this is the only place to change: call
 * `Geolocation.checkPermissions()` / `requestPermissions()` then
 * `Geolocation.getCurrentPosition()` from `@capacitor/geolocation` when
 * `Capacitor.isNativePlatform()` is true, and keep this browser path as fallback.
 */
export function getCurrentPosition(timeoutMs = 10000): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Thiết bị không hỗ trợ định vị."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Bạn chưa cho phép truy cập vị trí."
            : err.code === err.TIMEOUT
              ? "Lấy vị trí quá lâu, thử lại nhé."
              : "Không lấy được vị trí.";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

/** Great-circle distance in km. */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
