"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Old catalog bookmarks lead to Files; documentation deep links still work. */
export default function RetiredCatalogPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/files"); }, [router]);
  return <p className="p-8 text-sm text-muted">The tool catalog has been replaced by <Link className="text-accent" href="/files">Files</Link>. Tool documentation remains in the <Link className="text-accent" href="/guide">Dev Guide</Link>.</p>;
}
