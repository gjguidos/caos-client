import type { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RegistryEntry } from "./registryEntry";

export type RoleProfile = RegistryEntry;

type RolesState = { list: RoleProfile[] };

const initialRolesState: RolesState = { list: [] };

const rolesSlice = createSlice({
  name: "roles",
  initialState: initialRolesState,
  reducers: {
    setRoles(state, action: PayloadAction<RoleProfile[] | undefined>) {
      state.list = action.payload ?? [];
    },
  },
});

export const { setRoles } = rolesSlice.actions;
export default rolesSlice.reducer;

export const selectRoles = (state: RootState) => state.roles.list;
