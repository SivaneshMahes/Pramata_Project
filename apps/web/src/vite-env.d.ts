/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public OAuth client ID (not a secret). Leave unset to hide Google sign-in. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
