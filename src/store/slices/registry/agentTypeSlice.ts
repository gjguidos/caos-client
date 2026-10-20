import type { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { DefaultToolRef, RegistryEntry } from "./registryEntry";

export type AgentTypeProfile = RegistryEntry & {
  default_tools?: DefaultToolRef[];
};

type AgentTypesState = { list: AgentTypeProfile[] };

const initialAgentTypesState: AgentTypesState = { list: [] };

const agentTypesSlice = createSlice({
  name: "agentTypes",
  initialState: initialAgentTypesState,
  reducers: {
    setAgentTypes(
      state,
      action: PayloadAction<AgentTypeProfile[] | undefined>
    ) {
      state.list = action.payload ?? [];
    },
  },
});

export const { setAgentTypes } = agentTypesSlice.actions;
export default agentTypesSlice.reducer;

export const selectAgentTypes = (state: RootState) => state.agentTypes.list;
