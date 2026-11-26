export type MaintenancePhase = "NONE" | "SCHEDULED" | "ACTIVE";

export interface MaintenanceState {
  active: boolean;
  scheduled: boolean;
  phase: MaintenancePhase;
  title?: string;
  message?: string;
  startsAt?: string | null;
  estimatedEnd?: string | null;
}

export const SYSTEM_MAINTENANCE_EVENT = "system:maintenance";

export function normalizeMaintenanceState(raw: any): MaintenanceState {
  const startsAt: string | null = raw?.startsAt ?? raw?.starts_at ?? null;
  const estimatedEnd: string | null = raw?.estimatedEnd ?? raw?.estimated_end ?? null;
  const startsAtMs = startsAt ? new Date(startsAt).getTime() : 0;

  let phase: MaintenancePhase = "NONE";
  if (raw?.active === true || raw?.phase === "ACTIVE") {
    phase = "ACTIVE";
  } else if (
    raw?.scheduled === true ||
    raw?.phase === "SCHEDULED" ||
    (startsAtMs > 0 && startsAtMs > Date.now())
  ) {
    phase = "SCHEDULED";
  }

  return {
    active: phase === "ACTIVE",
    scheduled: phase === "SCHEDULED",
    phase,
    title: raw?.title || "",
    message: raw?.message || "",
    startsAt,
    estimatedEnd,
  };
}

export function emitMaintenanceState(raw: any): void {
  const normalized = normalizeMaintenanceState(raw);
  window.dispatchEvent(new CustomEvent(SYSTEM_MAINTENANCE_EVENT, { detail: normalized }));
}

export function emitMaintenanceFrom503(raw: any): void {
  emitMaintenanceState({
    ...raw,
    active: true,
    scheduled: false,
    phase: "ACTIVE",
  });
}

export function formatMaintenanceCountdown(startsAt?: string | null, nowMs: number = Date.now()): string {
  if (!startsAt) return "00:00";
  const targetMs = new Date(startsAt).getTime();
  const diffSec = Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

let fetchInterceptorInstalled = false;

/**
 * Bọc window.fetch một lần duy nhất cho các request /api/*:
 * Khi nhận HTTP 503 có cờ maintenance=true, kích hoạt MaintenancePage ngay lập tức
 * và thay thông báo lỗi thô bằng câu thân thiện (không để lộ mã 503 cho người dùng).
 */
export function installMaintenanceFetchInterceptor(): void {
  if (fetchInterceptorInstalled || typeof window === "undefined") return;
  fetchInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    if (response.status !== 503) {
      return response;
    }

    const urlStr = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    if (!urlStr.includes("/api/")) {
      return response;
    }

    try {
      const cloned = response.clone();
      const data = await cloned.json();
      if (data && data.maintenance === true) {
        emitMaintenanceFrom503(data);
        const friendlyBody = JSON.stringify({
          ...data,
          message: "Hệ thống đang tạm bảo trì nâng cấp, vui lòng chờ trong giây lát.",
        });
        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/json; charset=utf-8");
        return new Response(friendlyBody, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
    } catch {
      // Nếu body không phải JSON thì trả nguyên response gốc
    }
    return response;
  };
}
