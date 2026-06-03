import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const SESSION_STORAGE_KEY = "mercedes-session";

export const useSessionStore = create()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      authReady: false,
      authBusy: false,
      authError: "",
      authActive: false,

      setUser: (user) => set({ user }),
      setProfile: (updater) =>
        set((state) => ({
          profile: typeof updater === "function" ? updater(state.profile) : updater,
        })),
      setAuthReady: (authReady) => set({ authReady }),
      setAuthBusy: (authBusy) => set({ authBusy }),
      setAuthError: (authError) => set({ authError }),
      setAuthActive: (authActive) => set({ authActive }),

      clearSession: () => set({ user: null, profile: null, authActive: false }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({ authActive: state.authActive }),
    },
  ),
);

export function hasSessionHint() {
  if (typeof window === "undefined") {
    return false;
  }

  const hasCsrfCookie = document.cookie.includes("insforge_csrf_token=");
  return hasCsrfCookie || useSessionStore.getState().authActive;
}

export function persistSessionHint() {
  useSessionStore.getState().setAuthActive(true);
}

export function clearSessionHint() {
  useSessionStore.getState().setAuthActive(false);
}
