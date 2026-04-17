import { createClient } from "@insforge/sdk";

const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL;
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

if (!baseUrl || !anonKey) {
  throw new Error("Missing InsForge environment variables. Define VITE_INSFORGE_BASE_URL and VITE_INSFORGE_ANON_KEY.");
}

export const insforge = createClient({
  baseUrl,
  anonKey,
});

export const insforgeAdmin = createClient({
  baseUrl,
  anonKey,
  isServerMode: true,
});
