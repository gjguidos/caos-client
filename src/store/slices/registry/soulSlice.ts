import type { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RegistryEntry } from "./registryEntry";

export type SoulProfile = RegistryEntry;

type SoulsState = { list: SoulProfile[] };

const initialSoulsState: SoulsState = { list: [] };

const soulsSlice = createSlice({
  name: "souls",
  initialState: initialSoulsState,
  reducers: {
    setSouls(state, action: PayloadAction<SoulProfile[] | undefined>) {
      state.list = action.payload ?? [];
    },
  },
});

export const { setSouls } = soulsSlice.actions;
export default soulsSlice.reducer;

export const selectSouls = (state: RootState) => state.souls.list;
