import type { ToolCategory } from "@/lib/types";
import { EXAMPLE_PROJECT, EXAMPLE_SKILL } from "@/lib/examples";

/**
 * Task-first routing: "I want to do X" → the tools that do X, in order.
 *
 * Every step names a real tool from the catalog; a unit test asserts that.
 */
export interface WorkflowStep {
  /** Tool name, which is also the deep-link slug. */
  tool: string;
  action: string;
  detail: string;
}

export interface Workflow {
  id: string;
  /** Phrased as the question a user actually arrives with. */
  question: string;
  title: string;
  summary: string;
  category: ToolCategory;
  steps: WorkflowStep[];
  outcome: string;
  /** Shown on the Overview page as one of the three headline workflows. */
  featured: boolean;
  promptExample: string;
}

export const WORKFLOWS: Workflow[] = [
  {
    id: "find-project-paths",
    question: "Where does this project actually live?",
    title: "Find project paths",
    summary:
      "Resolve a project's source and deployment roots, and the device it is bound to, before touching any files.",
    category: "topology",
    featured: true,
    promptExample:
      `Use dev-center to find the source and deployment roots for the ${EXAMPLE_PROJECT} project, and tell me which device they are on.`,
    steps: [
      {
        tool: "project_roots",
        action: "Resolve the roots",
        detail:
          "Pass project_id for one project, or omit it to list every project the pool knows about.",
      },
      {
        tool: "project_context",
        action: "Verify the paths still exist",
        detail:
          "When the recorded path may be stale, this adds a local path check alongside the topology.",
      },
    ],
    outcome:
      "You have the current source and deployment roots from the pool, rather than a path remembered from a previous session.",
  },
  {
    id: "save-a-decision",
    question: "How do I make sure this decision is not lost?",
    title: "Save a project decision",
    summary:
      "Append a distilled record so the reasoning survives the session and is readable from any other client.",
    category: "info-center",
    featured: true,
    promptExample:
      "Save a decision record for the dashboard project explaining why we chose a static export, and what it rules out.",
    steps: [
      {
        tool: "info_save",
        action: "Append the record",
        detail:
          "project, record_type, title and summary are required. Put the reasoning in the optional body as Markdown.",
      },
      {
        tool: "info_list",
        action: "Confirm it landed",
        detail: "A cheap metadata listing that shows the new record without fetching bodies.",
      },
    ],
    outcome:
      "The decision and its reasoning are in append-only shared memory, attributed to a project and a date.",
  },
  {
    id: "recover-context",
    question: "What was I doing on this project?",
    title: "Recover project context",
    summary:
      "Rehydrate a project you have not touched in weeks: past records plus current topology, in one or two calls.",
    category: "info-center",
    featured: true,
    promptExample:
      `Pull everything dev-center knows about the ${EXAMPLE_PROJECT} project — past decisions, roots, devices — and verify the paths.`,
    steps: [
      {
        tool: "project_context",
        action: "Get the combined view",
        detail:
          "One call returns matching records, root and device topology, and local path checks. Start here.",
      },
      {
        tool: "info_read",
        action: "Drill into specifics",
        detail:
          "When you need the full body of particular records, search by keywords with a project filter.",
      },
      {
        tool: "info_list",
        action: "Browse instead of searching",
        detail: "When you do not know what to search for, list metadata and pick from titles.",
      },
    ],
    outcome:
      "You start from what was already decided instead of re-deriving it, and you know which recorded paths still resolve.",
  },
  {
    id: "publish-a-skill",
    question: "How do I share a skill with every client?",
    title: "Create and publish a Skill",
    summary:
      "The authoring pipeline. Each stage is a gate: publishing refuses a skill that was never scaffolded and packaged.",
    category: "skills",
    featured: false,
    promptExample:
      `Scaffold a Codex skill called ${EXAMPLE_SKILL}, package it, then publish it to the dev-center registry.`,
    steps: [
      {
        tool: "skill_scaffold",
        action: "Create the package",
        detail: "Produces a SKILL.md package under the control-plane root. Name is required.",
      },
      {
        tool: "skill_package",
        action: "Validate and archive",
        detail:
          "The validation gate. It must succeed at least once — publishing checks for an archive.",
      },
      {
        tool: "skill_publish",
        action: "Move it into the shared registry",
        detail:
          "Highest-risk step on the server: the skill becomes visible to every connected client. Review the content first.",
      },
      {
        tool: "skill_list",
        action: "Confirm it is discoverable",
        detail: "The published skill should now appear in the registry listing.",
      },
    ],
    outcome:
      "A validated skill any client can find with skill_list and read in full with skill_get.",
  },
  {
    id: "browse-registry",
    question: "What skills already exist?",
    title: "Browse the registry",
    summary:
      "Check what has been published before authoring something new — and read a published skill in full.",
    category: "skills",
    featured: false,
    promptExample:
      "List the skills published in the dev-center registry, then show me the full content of the most relevant one.",
    steps: [
      {
        tool: "skill_list",
        action: "List everything published",
        detail:
          "Takes no arguments. Returns name, description and publish date for every registry entry.",
      },
      {
        tool: "skill_get",
        action: "Read one in full",
        detail: "Fetches the complete SKILL.md by exact name, taken from the listing.",
      },
    ],
    outcome:
      "You reuse what already exists instead of authoring a near-duplicate, and you have its full instructions.",
  },
];

export const FEATURED_WORKFLOWS = WORKFLOWS.filter((workflow) => workflow.featured);

/** Quick-start steps shown on the Overview page. */
export const QUICK_START = [
  {
    title: "Connect a client",
    body: "Pick your client on the Connect page and copy its configuration. Both required headers are included in every example.",
    href: "/connect",
    linkLabel: "Connection setup",
  },
  {
    title: "Prove auth works",
    body: "Call pool_info. It takes no arguments, so a successful response means both headers were accepted.",
    href: "/tools/pool_info",
    linkLabel: "pool_info",
  },
  {
    title: "Browse project files",
    body: "Open a connected file source to browse folders and preview working files without downloading them.",
    href: "/files",
    linkLabel: "Files",
  },
  {
    title: "Follow a workflow",
    body: "Task-first routes for finding paths, saving decisions, recovering context, and publishing skills.",
    href: "/guide",
    linkLabel: "Dev Guide",
  },
] as const;
