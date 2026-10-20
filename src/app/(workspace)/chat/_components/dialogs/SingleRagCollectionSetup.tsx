"use client";

import { postCollectionWithProgress } from "../../_api/PostCollectionWithProgress";
import { fetchAgentById } from "@/shared/api/fetch_agents";
import { getUserCollections } from "../../_api/fetch_collections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/Dialog/Dialog";
import { Input } from "@/shared/components/Input/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/shared/components/Select/Select";
import { Textarea } from "@/shared/components/Textarea/Textarea";
import { sanitizeCollectionName } from "@/app/(workspace)/chat/_utils/sanitizeCollectionName";
import clsx from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { FileUploadDropzone } from "./FileUploadDropzone";

type Collection = {
  name: string;
  owner_id: string;
};

export const SetupDialog = ({
  agent_id,
  user_id,
  agent_name,
  setCurrentCollection,
  showSetup,
  setShowSetup,
  setAgentData,
}: {
  showSetup: boolean;
  agent_id: string;
  user_id: string;
  agent_name: string;
  setCurrentCollection: (colName: string) => void;
  setShowSetup: (show: boolean) => void;
  setAgentData?: (agent: any) => void;
}) => {
  const [name, setName] = useState("");
  const [ownedCollections, setOwnedCollections] = useState<
    Record<string, boolean>
  >({});
  const [collectionMeta, setCollectionMeta] = useState<
    Record<string, Collection>
  >({});
  const [existingCollections, setExistingCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [visibility, setVisibility] = useState<"private" | "shared" | "public">(
    "private"
  );
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [vectorMetric, setVectorMetric] = useState("cosine");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const safeName = sanitizeCollectionName(name);

  type CollectionMeta = {
    name: string;
    owner_id: string;
    agent_id: string;
    visibility: "private" | "shared" | "public";
    chunk_overlap: number;
    chunk_size: number;
    prompt_template?: string;
    description?: string;
    vector_metric: string;
    embedding_model: string;
    [key: string]: any; // allow extensibility
  };

  useEffect(() => {
    const loadCollections = async () => {
      try {
        const collections = await getUserCollections<CollectionMeta>();
        if (!collections || !collections.length) return;
        const ownershipMap: Record<string, boolean> = {};

        const metaMap: Record<string, CollectionMeta> = {};
        const names: string[] = [];

        for (const col of collections) {
          ownershipMap[col.name] = col.owner_id === user_id;
          metaMap[col.name] = col;
          names.push(col.name);
        }

        setExistingCollections(names);
        setOwnedCollections(ownershipMap);
        setCollectionMeta(metaMap);
      } catch (err) {
        console.error("Failed to fetch collections:", err);
      }
    };

    loadCollections();
  }, [user_id]);

  const isLocked =
    !!selectedCollection && !ownedCollections[selectedCollection];

  const handleSubmit = async () => {
    const collectionNameToUse = selectedCollection || safeName;
    if (!collectionNameToUse) return;
    setLoading(true);

    try {
      const metadata = {
        name: collectionNameToUse,
        agent_id,
        user_id,
        visibility,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        embedding_model: "openai-embedding-v2",
        vector_metric: vectorMetric,
        prompt_template: prompt,
        description,
      };

      await postCollectionWithProgress({
        agent_id,
        collection_name: collectionNameToUse,
        metadata,
        file: file ?? undefined,
        onProgress: (percent) => setUploadProgress(percent),
      });

      const res = await fetchAgentById(agent_id);
      if (res?.success) {
        setCurrentCollection(collectionNameToUse);
        setAgentData?.(res.data);
      }

      setShowSetup(false);
    } catch (err) {
      console.error("Collection setup failed:", err);
      alert("❌ Failed to upload or link collection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={showSetup} onOpenChange={setShowSetup}>
      <div
        className={clsx(
          "mt-4 space-y-4",
          loading && "pointer-events-none opacity-60"
        )}
      >
        <DialogContent className="max-w-4xl bg-white dark:bg-gray-800">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 bg-black/40">
              <div className="h-3 w-2/3 rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-white">
                {uploadProgress.toFixed(0)}% Uploading PDF…
              </p>
            </div>
          )}

          <DialogHeader>
            <DialogTitle>{agent_name} — Setup Knowledge Base</DialogTitle>
            <DialogDescription>
              Configure a collection and upload a PDF to populate it.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {existingCollections.length > 0 && (
              <div>
                <label className="mb-1 block font-medium">
                  Use Existing Collection
                </label>
                <Select
                  onValueChange={(val) => {
                    setSelectedCollection(val);
                    setName(val); // autofill
                  }}
                >
                  <SelectTrigger>
                    {selectedCollection || "Select existing collection"}
                  </SelectTrigger>
                  <SelectContent>
                    {existingCollections.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCollection && (
                  <p className="mt-1 text-xs text-blue-600">
                    Collection <strong>{selectedCollection}</strong> will be
                    linked to this agent.
                    {file
                      ? " Any uploaded PDF will be appended."
                      : " No upload needed."}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block font-medium">Collection Name</label>
              <Input
                placeholder="e.g., onboarding_docs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!selectedCollection}
              />
              <p className="text-xs text-gray-500">
                Final collection name:{" "}
                <code>{sanitizeCollectionName(name)}</code>
              </p>
            </div>

            <div>
              <label className="mb-1 block font-medium">Prompt Template</label>
              <Textarea
                rows={2}
                placeholder="e.g., Use the context below to answer concisely."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">Description</label>
              <Textarea
                rows={2}
                placeholder="Optional short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">Visibility</label>
              <Select
                value={visibility}
                onValueChange={(val) => setVisibility(val as typeof visibility)}
                disabled={isLocked}
              >
                <SelectTrigger>{visibility}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!selectedCollection && (
              <div className="rounded-lg border p-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-sm font-semibold"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                >
                  Advanced Settings{" "}
                  {showAdvanced ? <ChevronUp /> : <ChevronDown />}
                </button>
                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block font-medium">
                        Chunk Size
                      </label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={chunkSize}
                        onChange={(e) => setChunkSize(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium">
                        Chunk Overlap
                      </label>
                      <Input
                        type="number"
                        placeholder="200"
                        value={chunkOverlap}
                        onChange={(e) =>
                          setChunkOverlap(Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium">
                        Vector Metric
                      </label>
                      <Select
                        value={vectorMetric}
                        onValueChange={setVectorMetric}
                      >
                        <SelectTrigger>{vectorMetric}</SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cosine">cosine</SelectItem>
                          <SelectItem value="euclidean">euclidean</SelectItem>
                          <SelectItem value="dot">dot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <FileUploadDropzone file={file} setFile={setFile} />

            <div className="space-y-2 pt-4">
              <Button
                disabled={(!file && !selectedCollection) || loading}
                onClick={handleSubmit}
              >
                {loading
                  ? "Setting up..."
                  : selectedCollection
                    ? file
                      ? "Append PDF to Collection"
                      : "Use Existing Collection"
                    : "Create and Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </div>
    </Dialog>
  );
};
