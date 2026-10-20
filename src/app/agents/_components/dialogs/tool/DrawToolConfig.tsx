import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/Select/Select";

const SIZE_OPTIONS = [
  "256x256",
  "512x512",
  "1024x1024",
  "1792x1024",
  "1024x1792",
];
const STYLE_OPTIONS = [
  "realistic",
  "cartoon",
  "watercolor",
  "pixel-art",
  "anime",
  "oil-painting",
  "3d-render",
  "escher",
];

/**
 * Defaults live here, not on the server: a tool has no typed config any more,
 * so an agent that has never been configured arrives with `{}`. What this
 * dialog writes is merged into the tool's CLI flags as defaults.
 */
const DEFAULTS = {
  default_size: "1024x1024",
  style: "realistic",
} as const;

type DrawToolConfigShape = {
  default_size?: string;
  style?: string;
};

interface DrawToolConfigProps {
  config: DrawToolConfigShape;
  onConfigChange: (newConfig: DrawToolConfigShape) => void;
}

export function DrawToolConfig({
  config,
  onConfigChange,
}: DrawToolConfigProps) {
  const size = config.default_size ?? DEFAULTS.default_size;
  const style = config.style ?? DEFAULTS.style;

  const update = (patch: DrawToolConfigShape) =>
    onConfigChange({ ...config, ...patch });

  return (
    <div className="space-y-4 p-2">
      <div>
        <h3 className="text-sm font-medium text-gray-500">Resolution</h3>
        <Select
          value={size}
          onValueChange={(value) => update({ default_size: value })}
        >
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder="Select resolution" />
          </SelectTrigger>
          <SelectContent>
            {SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500">Style</h3>
        <Select
          value={style}
          onValueChange={(value) => update({ style: value })}
        >
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            {STYLE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option
                  .split("-")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
