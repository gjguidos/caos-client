export {};

declare global {
  interface Window {
    __ENV__?: {
      NEXT_PUBLIC_API_BASE?: string;
      NEXT_PUBLIC_ENABLE_LOGGING?: string;
      NEXT_PUBLIC_APP_VERSION?: string;
      // add other runtime public keys here as needed
      [key: string]: unknown;
    };
  }
}
