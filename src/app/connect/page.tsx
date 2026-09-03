import type { Metadata } from "next";
import { KeyRound, ShieldAlert } from "lucide-react";
import { AUTH_HEADERS, MCP_ENDPOINT, SERVER_NAME, TRANSPORT } from "@/lib/config";
import { CONNECTION_ISSUES } from "@/lib/connect";
import { PageContainer, PageHeader, Section } from "@/components/ui/page";
import { InlineCode } from "@/components/ui/code-block";
import { ConnectTabs } from "@/components/connect-tabs";

export const metadata: Metadata = {
  title: "Connect",
  description: `Configure Codex, Claude Code, Claude Connector, Hermes or any generic MCP client against the ${SERVER_NAME} endpoint.`,
};

export default function ConnectPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Connect"
        title="Connect a client"
        lede={`One endpoint, ${TRANSPORT} transport, two required headers. Pick your client below — every example uses environment-variable placeholders, never a real credential.`}
      />

      <Section title="Endpoint and required headers">
        <div className="card p-4">
          <div className="mb-4">
            <p className="eyebrow mb-1.5">Endpoint</p>
            <InlineCode value={MCP_ENDPOINT} label="MCP endpoint URL" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[AUTH_HEADERS.bearer, AUTH_HEADERS.setupCode].map((header) => (
              <div key={header.header} className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="font-mono text-[12.5px] font-semibold text-fg">{header.header}</p>
                <p className="mt-1 font-mono text-[12.5px] break-all text-accent">
                  {header.valueTemplate}
                </p>
                <p className="mt-1.5 text-[12px] text-faint">
                  Value comes from the{" "}
                  <code className="font-mono">{header.envVar}</code> environment variable.
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2.5 rounded-lg border border-risk-medium/35 bg-risk-medium-soft/50 p-3">
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-risk-medium"
            />
            <p className="text-[13px] text-muted">
              <span className="font-medium text-fg">Both headers are mandatory.</span> A request
              carrying only one is rejected before it reaches {SERVER_NAME} — including a plain
              browser GET. The URL on its own grants nothing.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Client setup"
        description="Configuration, verification, and the failure mode specific to each client."
      >
        <div className="card p-4 sm:p-5">
          <ConnectTabs />
        </div>
      </Section>

      <Section
        title="Handling credentials"
        description="What to do with the real values the placeholders stand in for."
      >
        <div className="card divide-y divide-border">
          {[
            {
              title: "Export them, do not paste them",
              body: "Set DEV_CENTER_TOKEN and DEV_CENTER_SETUP_CODE in your shell or secret manager, and let the client read them by name. Codex supports exactly this via bearer_token_env_var.",
            },
            {
              title: "Never commit a config containing real values",
              body: "Generated client configs hold the literal header values. Treat those files as credential material and keep them out of version control.",
            },
            {
              title: "This dashboard holds nothing",
              body: "It is a static catalog. The browser never calls the MCP endpoint, so there is no token in any bundle, log, screenshot or fixture.",
            },
            {
              title: "Rotate on exposure",
              body: "Both values are bearer credentials: anyone holding them can call every tool, including the write tools. If one leaks, rotate it rather than relying on it being obscure.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 p-4">
              <KeyRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
              <div>
                <p className="text-[13px] font-medium">{item.title}</p>
                <p className="mt-1 text-[13px] text-muted">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Troubleshooting"
        description="Symptoms in the order they are worth checking."
      >
        <div className="scroll-x card">
          <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
            <caption className="sr-only">Common connection problems and their fixes</caption>
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th scope="col" className="w-[30%] px-3 py-2 font-medium text-muted">
                  Symptom
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-muted">
                  Cause
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-muted">
                  Fix
                </th>
              </tr>
            </thead>
            <tbody>
              {CONNECTION_ISSUES.map((issue) => (
                <tr key={issue.symptom} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-3 py-2.5 text-left font-medium">
                    {issue.symptom}
                  </th>
                  <td className="px-3 py-2.5 text-muted">{issue.cause}</td>
                  <td className="px-3 py-2.5 text-muted">{issue.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </PageContainer>
  );
}
