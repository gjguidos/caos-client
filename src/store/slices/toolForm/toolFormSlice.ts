import { createEmptyUIComponentValues } from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
import type {
  ChatInputConfig,
  FormValue,
  FormValues,
  OutputProfilesConfig,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import {
  getProfileDefaults,
  outputProfileField,
} from "@/app/(workspace)/_tool-form/lib/profileValues";
import type { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ToolFormState = {
  isReady: boolean;
  uiComponents: UIComponent[];
  groupLabelMap: Record<string, string>;
  chatInputConfig: ChatInputConfig | null;
  values: FormValues;
  dirtyFields: Record<string, boolean>;
  outputProfiles: OutputProfilesConfig | null;
  isThinking: boolean;
};

const initialState: ToolFormState = {
  isReady: false,
  uiComponents: [],
  groupLabelMap: {},
  chatInputConfig: null,
  values: {},
  dirtyFields: {},
  outputProfiles: null,
  isThinking: false,
};

function applyOutputProfile(
  state: ToolFormState,
  profileKey: string,
  respectUserOverrides: boolean
) {
  const outputProfiles = state.outputProfiles;

  if (!outputProfiles?.apply_values) {
    return;
  }

  const selectedProfile = getProfileDefaults(outputProfiles, profileKey);

  if (!selectedProfile) {
    return;
  }

  const controlledFields =
    outputProfiles.controlled_fields ?? Object.keys(selectedProfile);

  for (const fieldKey of controlledFields) {
    if (!(fieldKey in selectedProfile)) {
      continue;
    }

    if (respectUserOverrides && state.dirtyFields[fieldKey]) {
      continue;
    }

    state.values[fieldKey] = selectedProfile[fieldKey];
  }
}

/**
 * Blank the form back to registry defaults, then lay the default profile over
 * the top. Shared by init and reset so the two can never disagree about what a
 * pristine form looks like; both start from no dirty fields, so nothing is
 * treated as a user override.
 */
function seedFormValues(state: ToolFormState) {
  state.values = createEmptyUIComponentValues(
    state.uiComponents,
    state.chatInputConfig
  );

  state.dirtyFields = {};

  const defaultProfileKey = state.outputProfiles?.default;

  if (defaultProfileKey) {
    state.values[outputProfileField(state.outputProfiles)] = defaultProfileKey;

    applyOutputProfile(state, defaultProfileKey, false);
  }
}

const toolFormSlice = createSlice({
  name: "toolForm",
  initialState,

  reducers: {
    initToolForm(
      state,
      action: PayloadAction<{
        uiComponents?: UIComponent[];
        groupLabelMap?: Record<string, string>;
        chatInputConfig?: ChatInputConfig | null;
        outputProfiles?: OutputProfilesConfig | null;
      }>
    ) {
      const {
        uiComponents = [],
        groupLabelMap = {},
        chatInputConfig = null,
        outputProfiles = null,
      } = action.payload;

      state.uiComponents = uiComponents;
      state.groupLabelMap = groupLabelMap;
      state.chatInputConfig = chatInputConfig;
      state.outputProfiles = outputProfiles;
      state.isReady = true;

      seedFormValues(state);
    },

    clearToolForm(state) {
      state.uiComponents = [];
      state.groupLabelMap = {};
      state.chatInputConfig = null;
      state.values = {};
      state.dirtyFields = {};
      state.outputProfiles = null;
      state.isReady = false;
      state.isThinking = false;
    },

    updateIsThinking(state, action: PayloadAction<boolean>) {
      state.isThinking = action.payload;
    },

    setValue(
      state,
      action: PayloadAction<{
        key: string;
        value: FormValue;
      }>
    ) {
      const { key, value } = action.payload;

      state.values[key] = value;

      // Picking a profile re-applies its defaults rather than marking the
      // profile field dirty: the selection is a choice of preset, not an
      // override of one.
      if (key === outputProfileField(state.outputProfiles)) {
        if (typeof value === "string") {
          applyOutputProfile(
            state,
            value,
            state.outputProfiles?.respect_user_overrides ?? false
          );
        }

        return;
      }

      state.dirtyFields[key] = true;
    },

    resetForm(state) {
      seedFormValues(state);
    },

    setValues(state, action: PayloadAction<FormValues>) {
      state.values = action.payload;
    },
  },
});

export const {
  initToolForm,
  clearToolForm,
  updateIsThinking,
  setValue,
  resetForm,
  setValues,
} = toolFormSlice.actions;

export default toolFormSlice.reducer;

export const selectToolForm = (state: RootState) => state.toolForm;

export const selectUiComponents = (state: RootState) =>
  state.toolForm.uiComponents;
