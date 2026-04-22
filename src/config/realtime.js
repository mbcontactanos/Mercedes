export const ADMIN_PEER_ID = "mercedes-admin-hub";
export const LEGACY_ADMIN_PEER_ID = ADMIN_PEER_ID;
export const ADMIN_HUB_CHANNEL = "ops:admin-hubs";
export const ADMIN_HUB_EVENT = "admin_hub_presence";
export const ADMIN_HUB_HEARTBEAT_MS = 3000;
export const ADMIN_HUB_STALE_MS = 9000;
export const APPROVAL_REQUESTS_CHANNEL = "ops:approval-requests";
export const APPROVAL_REQUEST_EVENT = "approval_request_created";

function createPeerSuffix() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

function sanitizePeerFragment(value) {
  return (
    String(value ?? "admin")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "admin"
  );
}

export function createAdminPeerId(userId) {
  return `${ADMIN_PEER_ID}-${sanitizePeerFragment(userId)}-${createPeerSuffix()}`;
}

export function isAdminHubFresh(entry, now = Date.now()) {
  return Boolean(entry?.peerId) && now - Number(entry?.timestamp ?? 0) <= ADMIN_HUB_STALE_MS;
}
