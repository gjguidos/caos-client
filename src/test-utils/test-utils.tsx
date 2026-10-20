import workflowRunReducer from "@/store/slices/workflowRun/workflowRunSlice";
import uploadedFilesReducer from "@/store/slices/uploadedFiles/uploadedFilesSlice";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import type { SoulProfile } from "@/store/slices/registry/soulSlice";
import type { RoleProfile } from "@/store/slices/registry/roleSlice";
import type { RulePack } from "@/store/slices/registry/rulePackSlice";
import type { AgentTypeProfile } from "@/store/slices/registry/agentTypeSlice";
import { configureStore } from "@reduxjs/toolkit";
import { TooltipProvider } from "@/shared/components/Tooltip/Tooltip";
import { render, RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import { vi } from "vitest";

const defaultPreloadedState = {
  tools: { list: [] },
  agents: { list: [] },
  souls: { list: [] },
  roles: { list: [] },
  rulepacks: { list: [] },
  agentTypes: { list: [] },
  toolForm: {
    isReady: false,
    uiComponents: null,
    groupLabelMap: {},
    values: {},
    isThinking: false,
  },
  // Taken from the reducer rather than restated, so adding a field to the slice
  // can't silently leave the test store with a stale shape.
  workflowRun: workflowRunReducer(undefined, { type: "@@INIT" }),
  uploadedFiles: uploadedFilesReducer(undefined, { type: "@@INIT" }),
};

// The registry lists infer as `never[]` from the empty default above, which
// rejects real fixtures (e.g. `ToolDefinition[]`). Widen just those lists to
// their real element types; everything else keeps its inferred mock shape.
type RootState = Omit<
  typeof defaultPreloadedState,
  "tools" | "souls" | "roles" | "rulepacks" | "agentTypes"
> & {
  tools: { list: ToolDefinition[] };
  souls: { list: SoulProfile[] };
  roles: { list: RoleProfile[] };
  rulepacks: { list: RulePack[] };
  agentTypes: { list: AgentTypeProfile[] };
};

export function createMockStore(preloadedState: Partial<RootState> = {}) {
  return configureStore({
    reducer: {
      tools: (state: RootState["tools"] = { list: [] }) => state,
      agents: (state = { list: [] }) => state,
      souls: (state: RootState["souls"] = { list: [] }) => state,
      roles: (state: RootState["roles"] = { list: [] }) => state,
      rulepacks: (state: RootState["rulepacks"] = { list: [] }) => state,
      agentTypes: (state: RootState["agentTypes"] = { list: [] }) => state,
      toolForm: (
        state = {
          isReady: false,
          uiComponents: null,
          groupLabelMap: {},
          values: {},
          isThinking: false,
        }
      ) => state,
      workflowRun: workflowRunReducer,
      uploadedFiles: uploadedFilesReducer,
    },
    preloadedState: { ...defaultPreloadedState, ...preloadedState },
  });
}

type AppStore = ReturnType<typeof createMockStore>;

interface NavigationMocks {
  params?: Record<string, string>;
  searchParams?: Record<string, string>;
  pathname?: string;
  push?: ReturnType<typeof vi.fn>;
  replace?: ReturnType<typeof vi.fn>;
  back?: ReturnType<typeof vi.fn>;
  forward?: ReturnType<typeof vi.fn>;
  refresh?: ReturnType<typeof vi.fn>;
  prefetch?: ReturnType<typeof vi.fn>;
}

const defaultNavigationMocks: Required<NavigationMocks> = {
  params: {},
  searchParams: {},
  pathname: "/",
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

let currentNavigationMocks: Required<NavigationMocks> = {
  ...defaultNavigationMocks,
};

function setupNavigationMocks(mocks: NavigationMocks = {}) {
  currentNavigationMocks = {
    ...defaultNavigationMocks,
    ...mocks,
    push: mocks.push ?? vi.fn(),
    replace: mocks.replace ?? vi.fn(),
    back: mocks.back ?? vi.fn(),
    forward: mocks.forward ?? vi.fn(),
    refresh: mocks.refresh ?? vi.fn(),
    prefetch: mocks.prefetch ?? vi.fn(),
  };
  return currentNavigationMocks;
}

export function getCurrentNavigationMocks() {
  return currentNavigationMocks;
}

export function resetNavigationMocks() {
  currentNavigationMocks = { ...defaultNavigationMocks };
}

interface AuthMocks {
  userId?: string | null;
  isAuthLoading?: boolean;
  session?: {
    sub?: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
  } | null;
  roles?: string[];
  isSuperAdmin?: boolean;
  adminGroupIds?: string[];
  userGroupIds?: string[];
  /** Gates every build affordance: create, edit and delete. */
  canCreateAgent?: boolean;
}

// Defaults to the plain-user persona, so a component under test only shows
// build affordances when a test opts into them.
const defaultAuthMocks: Required<AuthMocks> = {
  userId: "test-user-id",
  isAuthLoading: false,
  session: { sub: "test-user-id", name: "Test User" },
  roles: ["agentverse-user"],
  isSuperAdmin: false,
  adminGroupIds: [],
  userGroupIds: [],
  canCreateAgent: false,
};

let currentAuthMocks: Required<AuthMocks> = { ...defaultAuthMocks };

function setupAuthMocks(mocks: AuthMocks = {}) {
  currentAuthMocks = { ...defaultAuthMocks, ...mocks };
  return currentAuthMocks;
}

export function getAuthMocks() {
  return currentAuthMocks;
}

export function resetAuthMocks() {
  currentAuthMocks = { ...defaultAuthMocks };
}

// Agent API Mocks, its a server action so we can't intercept with MSW
interface AgentMocks {
  fetchAgentById?: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  };
}

const defaultMockAgentData = {
  id: "agent-123",
  name: "Test Agent",
  role_name: "assistant",
  tools: [],
  collections: [],
  personality_key: "friendly_assistant",
};

const defaultAgentMocks: Required<AgentMocks> = {
  fetchAgentById: { success: true, data: defaultMockAgentData },
};

let currentAgentMocks: Required<AgentMocks> = { ...defaultAgentMocks };

function setupAgentMocks(mocks: AgentMocks = {}) {
  currentAgentMocks = { ...defaultAgentMocks, ...mocks };
  return currentAgentMocks;
}

export function getAgentMocks() {
  return currentAgentMocks;
}

export function resetAgentMocks() {
  currentAgentMocks = { ...defaultAgentMocks };
}

interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
  navigation?: NavigationMocks;
  auth?: AuthMocks;
  agent?: AgentMocks;
}

function AllProviders({
  children,
  store,
}: {
  children: ReactNode;
  store: AppStore;
}) {
  return (
    <Provider store={store}>
      {/* Mirrors the root layout, so no test has to know a component uses a tooltip. */}
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </Provider>
  );
}

/* Custom render that wraps components with all providers
and allows navigation and auth mocks to be set up per test
see the README for usage examples 
*/
function customRender(
  ui: ReactElement,
  {
    preloadedState = {},
    store = createMockStore(preloadedState),
    navigation,
    auth,
    agent,
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  const navMocks = navigation
    ? setupNavigationMocks(navigation)
    : currentNavigationMocks;
  const authMocks = auth ? setupAuthMocks(auth) : currentAuthMocks;
  const agentMocks = agent ? setupAgentMocks(agent) : currentAgentMocks;

  return {
    store,
    navigation: navMocks,
    auth: authMocks,
    agent: agentMocks,
    ...render(ui, {
      wrapper: ({ children }) => (
        <AllProviders store={store}>{children}</AllProviders>
      ),
      ...renderOptions,
    }),
  };
}

// Re-export everything from testing-library and override render method
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
export { customRender as render };

// Re-export WebSocket test utilities
export * from "./websocket-test-utils";
