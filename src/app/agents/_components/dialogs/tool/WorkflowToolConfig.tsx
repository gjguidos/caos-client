import { Button } from "@/components/ui/button";
import { Input } from "@/shared/components/Input/Input";
import { Switch } from "@/app/agents/_components/Switch/Switch";

type WorkflowToolConfigShape = {
  // deterministic guardrails
  max_steps_per_call: number; // 1..1000
  run_ttl_seconds: number | null; // >=60 or null
  allow_inline_workflow: boolean; // should be false in prod
};

interface WorkflowToolConfigProps {
  config: WorkflowToolConfigShape;
  onConfigChange: (newConfig: WorkflowToolConfigShape) => void;
  lockedFields?: Partial<Record<keyof WorkflowToolConfigShape, boolean>>;
}

export function WorkflowToolConfig({
  config,
  onConfigChange,
  lockedFields,
}: WorkflowToolConfigProps) {
  const update = (patch: Partial<WorkflowToolConfigShape>) =>
    onConfigChange({ ...config, ...patch });

  const parseIntSafe = (v: string) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const parseNullableInt = (v: string) => {
    if (v.trim() === "") return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div className="space-y-4 p-2">
      {/* Max Steps Per Call */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">
          Max Steps Per Call
        </h3>
        <Input
          className="mt-1 w-full"
          type="number"
          min={1}
          max={1000}
          value={String(config.max_steps_per_call ?? 50)}
          onChange={(e) =>
            update({ max_steps_per_call: parseIntSafe(e.target.value) })
          }
          disabled={!!lockedFields?.max_steps_per_call}
        />
        <p className="mt-1 text-xs text-gray-500">
          Guardrail to prevent runaway runs. Recommended 25–100.
        </p>
      </div>

      {/* Run TTL */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">Run TTL Seconds</h3>
        <Input
          className="mt-1 w-full"
          type="number"
          min={60}
          value={
            config.run_ttl_seconds === null
              ? ""
              : String(config.run_ttl_seconds)
          }
          placeholder="604800 (7 days) or blank for null"
          onChange={(e) =>
            update({ run_ttl_seconds: parseNullableInt(e.target.value) })
          }
          disabled={!!lockedFields?.run_ttl_seconds}
        />
        <p className="mt-1 text-xs text-gray-500">
          How long paused runs remain retrievable. Blank = null (no TTL if your
          store supports it).
        </p>
      </div>

      {/* Allow Inline Workflow (should be locked off in prod) */}
      <div className="flex items-center justify-between rounded border p-3">
        <div>
          <div className="text-sm font-medium text-gray-700">
            Allow Inline Workflow
          </div>
          <div className="text-xs text-gray-500">
            Disable in production to prevent runtime-injected workflows.
          </div>
        </div>
        <Switch
          checked={!!config.allow_inline_workflow}
          onCheckedChange={(checked: boolean) =>
            update({ allow_inline_workflow: checked })
          }
          disabled={!!lockedFields?.allow_inline_workflow}
        />
      </div>

      {/* Suggested “lockdown” button (optional UX helper) */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() =>
          update({
            allow_inline_workflow: false,
          })
        }
        disabled={!!lockedFields?.allow_inline_workflow}
      >
        Lock Down (Disable Inline)
      </Button>
    </div>
  );
}
