/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth Client ID for Photos Picker API. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
