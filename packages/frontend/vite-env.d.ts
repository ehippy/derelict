/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AUTH_LOGIN_URL: string;
  readonly VITE_DISCORD_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
