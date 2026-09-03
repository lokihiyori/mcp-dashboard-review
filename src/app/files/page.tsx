import { Suspense } from "react";
import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { FilesBrowser } from "@/components/files-browser";

export const metadata: Metadata = { title: "Files", description: "Read-only live directory browsing for generated tools, Skills, information records and build artifacts." };
export default function FilesPage() {
  return <PageContainer className="max-w-7xl"><PageHeader eyebrow="Workspace" title="Files" lede="Browse server folders and preview their contents. Generated projects, published Skills, information records and artifacts — in one place." /><Suspense fallback={<p className="text-sm text-muted">Preparing the file browser…</p>}><FilesBrowser /></Suspense></PageContainer>;
}
