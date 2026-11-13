import { useCallback, useEffect, useRef, useState } from "react";
import type { PingResult } from "../../shared/types";
import { api } from "./api";
import type { Identity } from "./api";

const PING_MS = 20_000;

export type GeoState = "idle" | "asking" | "on" | "denied" | "unavailable";

// Watches location while the app is open and pings the server every 20s.
export function useNearby(identity: Identity) {
  const [geo, setGeo] = useState<GeoState>("idle");
  const [result, setResult] = useState<PingResult | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pos = useRef<GeolocationPosition | null>(null);
  const watchId = useRef<number | null>(null);
  const inFlight = useRef(false);

  const ping = useCallback(async () => {
    const p = pos.current;
    if (!p || inFlight.current || document.hidden) return;
    inFlight.current = true;
    try {
      setResult(await api.ping(identity, p.coords.latitude, p.coords.longitude, p.coords.accuracy));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      inFlight.current = false;
    }
  }, [identity]);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) return setGeo("unavailable");
    if (watchId.current != null) return;
    setGeo((g) => (g === "on" ? g : "asking"));
    let first = true;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        pos.current = p;
        setAccuracy(Math.round(p.coords.accuracy));
        setGeo("on");
        if (first) {
          first = false;
          void ping();
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeo("denied");
          if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
  }, [ping]);

  // Start straight away if permission was already given.
  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((s) => {
        if (s.state === "granted") start();
        if (s.state === "denied") setGeo("denied");
      })
      .catch(() => {});
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [start]);

  useEffect(() => {
    if (geo !== "on") return;
    const t = setInterval(ping, PING_MS);
    const onVis = () => !document.hidden && ping();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [geo, ping]);

  return { geo, start, result, accuracy, error, refresh: ping };
}
