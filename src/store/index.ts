import agentTypesReducer from "@/store/slices/registry/agentTypeSlice";
import rolesReducer from "@/store/slices/registry/roleSlice";
import rulepacksReducer from "@/store/slices/registry/rulePackSlice";
import soulsReducer from "@/store/slices/registry/soulSlice";
import toolsReducer from "@/store/slices/registry/toolsSlice";
import toastReducer from "@/store/slices/toast/toastSlice";
import toolFormReducer from "@/store/slices/toolForm/toolFormSlice";
import workflowRunReducer from "@/store/slices/workflowRun/workflowRunSlice";
import uploadedFilesReducer from "@/store/slices/uploadedFiles/uploadedFilesSlice";
import { configureStore } from "@reduxjs/toolkit";

// One store per ReduxProvider mount. A module-level instance would be shared
// across concurrent server renders.
export const makeStore = () =>
  configureStore({
    reducer: {
      tools: toolsReducer,
      souls: soulsReducer,
      roles: rolesReducer,
      agentTypes: agentTypesReducer,
      rulepacks: rulepacksReducer,
      toolForm: toolFormReducer,
      workflowRun: workflowRunReducer,
      uploadedFiles: uploadedFilesReducer,
      toast: toastReducer,
    },
    devTools: process.env.NODE_ENV !== "production" && {
      name: "agentverse-DEV",
    },
  });

// 🔁 Types for usage across app
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
