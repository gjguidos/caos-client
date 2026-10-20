import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import React from "react";
import { server } from "./src/mocks/server";
import {
  getAgentMocks,
  getAuthMocks,
  getCurrentNavigationMocks,
  resetAgentMocks,
  resetAuthMocks,
  resetNavigationMocks,
  resetWebSocketMocks,
} from "./src/test-utils/test-utils";

// Polyfill Blob.prototype.text for jsdom (not implemented in jsdom 27)
if (!Blob.prototype.text) {
  Blob.prototype.text = function (this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read blob"));
      reader.readAsText(this);
    });
  };
}

// Polyfill matchMedia for jsdom — Skapa's viewport hooks (used by Modal) need it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;
}

// jsdom implements neither half of the object-URL API. A stable fake URL per
// call is enough for anything that only stores or renders the string.
URL.createObjectURL ??= (() => {
  let next = 0;
  return () => `blob:mock/${++next}`;
})();
URL.revokeObjectURL ??= () => {};

// global mocks for convenience
Element.prototype.scrollIntoView = vi.fn();

// jsdom ships no ResizeObserver; Radix primitives (Checkbox, Switch) observe
// their indicator's size on mount and throw without it.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
const mockGetPublicApiBase = () => "http://localhost:8000/api";
vi.mock("@/shared/lib/getApiClient", () => ({
  getPublicApiBase: mockGetPublicApiBase,
  default: mockGetPublicApiBase,
}));
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", props),
}));
vi.mock("next/navigation", () => ({
  useParams: () => getCurrentNavigationMocks().params,
  useSearchParams: () =>
    new URLSearchParams(getCurrentNavigationMocks().searchParams),
  usePathname: () => getCurrentNavigationMocks().pathname,
  useRouter: () => ({
    push: getCurrentNavigationMocks().push,
    replace: getCurrentNavigationMocks().replace,
    back: getCurrentNavigationMocks().back,
    forward: getCurrentNavigationMocks().forward,
    refresh: getCurrentNavigationMocks().refresh,
    prefetch: getCurrentNavigationMocks().prefetch,
  }),
}));
vi.mock("@/shared/auth/hooks/useAuth", () => ({
  useAuth: () => getAuthMocks(),
}));
vi.mock("@/shared/api/fetch_agents", () => ({
  fetchAgentById: vi.fn(() => Promise.resolve(getAgentMocks().fetchAgentById)),
}));

// Establish API mocking, reset handlers after each test case and clean up after the tests are finished.
beforeAll(() => server.listen());
afterEach(() => {
  cleanup(); // Unmount React components from Testing Library
  server.resetHandlers();
  resetNavigationMocks();
  resetAuthMocks();
  resetAgentMocks();
  resetWebSocketMocks();
});
afterAll(() => server.close());
