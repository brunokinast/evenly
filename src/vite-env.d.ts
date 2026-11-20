/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_EMULATOR_HOST?: string;
  readonly VITE_FIRESTORE_PORT?: string;
}
