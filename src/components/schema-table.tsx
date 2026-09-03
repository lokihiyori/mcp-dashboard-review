import { CircleCheck } from "lucide-react";
import type { ToolInputSchema } from "@/lib/types";
import { SourceBadge } from "@/components/ui/badge";
import { PendingState } from "@/components/ui/states";

/**
 * Renders a tool's parameter contract.
 *
 * Three distinct states, kept distinct on purpose:
 *  - verified parameters,
 *  - verified "this tool takes no arguments",
 *  - pending, meaning the server publishes nothing and nothing was invented.
 */
export function SchemaTable({ schema }: { schema: ToolInputSchema }) {
  if (schema.source === "pending") {
    return <PendingState what="input schema" />;
  }

  if (schema.takesNoArguments) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2/60 px-4 py-3.5">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-risk-low" />
          <div>
            <p className="text-sm font-medium text-fg">No parameters</p>
            <p className="mt-0.5 text-sm text-muted">
              {schema.note ?? "This tool accepts no arguments."} Call it with an empty
              arguments object.
            </p>
          </div>
        </div>
        <SourceBadge source={schema.source} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="scroll-x card">
        <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
          <caption className="sr-only">Input parameters</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th scope="col" className="px-3 py-2 font-medium text-muted">
                Parameter
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-muted">
                Type
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-muted">
                Required
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-muted">
                Default
              </th>
            </tr>
          </thead>
          <tbody>
            {schema.fields.map((field) => (
              <tr key={field.name} className="border-b border-border last:border-b-0">
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <code className="font-mono text-[12.5px] font-semibold text-fg">
                    {field.name}
                  </code>
                  {field.description ? (
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {field.description}
                    </span>
                  ) : null}
                </th>
                <td className="px-3 py-2">
                  <code className="font-mono text-[12.5px] text-muted">{field.type}</code>
                </td>
                <td className="px-3 py-2">
                  {field.required ? (
                    <span className="font-medium text-accent">Required</span>
                  ) : (
                    <span className="text-faint">Optional</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {field.defaultValue ? (
                    <code className="font-mono text-[12.5px] text-muted">
                      {field.defaultValue}
                    </code>
                  ) : (
                    <span className="text-faint" aria-label="No default">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={schema.source} />
        <p className="text-[12px] text-faint">
          Types, requirements and defaults are read from the server&rsquo;s advertised schema.
          Per-parameter prose is not published by the server, so none is shown.
        </p>
      </div>

      {schema.note ? (
        <p className="rounded-md border border-border bg-surface-2/60 px-3 py-2 text-[12.5px] text-muted">
          {schema.note}
        </p>
      ) : null}
    </div>
  );
}
