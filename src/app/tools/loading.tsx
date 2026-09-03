import { PageContainer } from "@/components/ui/page";
import { Skeleton, ToolCardSkeleton } from "@/components/ui/states";

export default function ToolsLoading() {
  return (
    <PageContainer>
      <div className="mb-8">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="mb-5 h-28 w-full rounded-lg" />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index}>
            <ToolCardSkeleton />
          </li>
        ))}
      </ul>
      <span className="sr-only" role="status">
        Loading tool catalog
      </span>
    </PageContainer>
  );
}
