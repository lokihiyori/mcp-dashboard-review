"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/ui/page";
import { ErrorState } from "@/components/ui/states";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Message only. Never log request headers or anything credential-shaped.
    console.error("Dashboard render error:", error.message);
  }, [error]);

  return (
    <PageContainer>
      <div className="py-10">
        <ErrorState
          title="Something went wrong rendering this page"
          description="The catalog is static, so this is a rendering fault rather than a failed request to the MCP server. Retrying is safe."
          action={
            <button
              type="button"
              onClick={reset}
              className="mt-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-border-strong"
            >
              Try again
            </button>
          }
        />
      </div>
    </PageContainer>
  );
}
