/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BUILD_NUMBER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}