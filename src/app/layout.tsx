import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { THEME_INIT_SCRIPT } from "@/components/theme-toggle";
import { SERVER_NAME } from "@/lib/config";
import { LiveMcpProvider } from "@/components/live-mcp-provider";

export const metadata: Metadata = {
  title: {
    default: `${SERVER_NAME} — MCP Tools Dashboard`,
    template: `%s — ${SERVER_NAME} MCP`,
  },
  description: `Live tool discovery, read-only files and development documentation for the ${SERVER_NAME} MCP server.`,
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <LiveMcpProvider><AppShell>{children}</AppShell></LiveMcpProvider>
      </body>
    </html>
  );
}
