
interface EmptyResourceStateProps {
  title: string;
  description: string;
}

export function EmptyResourceState({
  title,
  description,
}: Readonly<EmptyResourceStateProps>) {
  return (
    <div
      className="mx-auto max-w-[600px] rounded-lg bg-muted px-8 py-8 text-center"
      role="status"
      aria-live="polite"
    >
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
