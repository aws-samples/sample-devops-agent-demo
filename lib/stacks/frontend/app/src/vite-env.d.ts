/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_REGION: string;
    readonly VITE_STAGE: string;
    readonly VITE_USER_POOL_ID: string;
    readonly VITE_USER_POOL_CLIENT_ID: string;
    readonly VITE_IDENTITY_POOL_ID: string;
    readonly VITE_USER_POOL_DOMAIN_URL: string;
    readonly VITE_CALLBACK_URL: string;
    readonly VITE_REST_API_URL: string;
    readonly VITE_STORAGE_BUCKET_NAME: string;
    readonly VITE_APPSYNC_API_URL: string;
    readonly VITE_MIDWAY: string;
    readonly VITE_BUILD_TIMESTAMP: string;
    readonly VITE_BUILD_VERSION: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module '*.svg' {
    const content: string;
    export default content;
}
