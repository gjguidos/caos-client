/**
 * What the client knows about the files it uploaded this session.
 *
 * `POST /v1/files` answers with a file's name, mime and size, but only the
 * opaque `file_id` belongs in form state - that id is what goes on the wire, and
 * the server has no route to hand the rest back. So the response is kept here,
 * keyed by id, and anywhere an id would otherwise be displayed reads it instead.
 *
 * A cache rather than run state: it is deliberately not cleared when the
 * workflow or the run changes, so an id stays readable for as long as the tab is
 * open. That is the same lifetime `runInputs` already has - a reloaded run has
 * no submitted inputs of any kind to display.
 */

import type { RootState } from "@/store";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UploadedFile {
  fileId: string;
  /** The name the file was picked under. */
  name: string;
  mime: string;
  size: number;
  /** Object URL for the picked bytes, so an image can be shown as itself. */
  previewUrl?: string;
}

export interface UploadedFilesState {
  byId: Record<string, UploadedFile>;
}

const initialState: UploadedFilesState = { byId: {} };

const uploadedFilesSlice = createSlice({
  name: "uploadedFiles",
  initialState,
  reducers: {
    fileUploaded(state, action: PayloadAction<UploadedFile>) {
      state.byId[action.payload.fileId] = action.payload;
    },
  },
});

export const { fileUploaded } = uploadedFilesSlice.actions;
export default uploadedFilesSlice.reducer;

/** What is known about an uploaded file, or undefined for an id we never saw. */
export const selectUploadedFile = (
  state: RootState,
  fileId: string
): UploadedFile | undefined => state.uploadedFiles.byId[fileId];
