import { readFile } from "node:fs/promises";
import path from "node:path";
import { getGitHubRepo, getGitHubToken } from "@/lib/site-config";

export type EditorialCommitSummary = {
  sha: string;
  shortSha: string;
  message: string;
  committedAt: string;
  url: string;
};

export type EditorialChangeSet = {
  baseCommit: string | null;
  headCommit: string;
  commitCount: number;
  commits: EditorialCommitSummary[];
  changedFiles: string[];
  statusLines: string[];
  featureSignals: string[];
  releaseTypeHint: "feature" | "ux" | "ops" | "mixed";
  userFacingScore: number;
};

type GitHubCommitResponse = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    committer: { date: string };
  };
};

function getGitHubHeaders() {
  const token = getGitHubToken();
  return {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeCommit(input: GitHubCommitResponse): EditorialCommitSummary {
  return {
    sha: input.sha,
    shortSha: input.sha.slice(0, 7),
    message: input.commit.message.split("\n")[0]?.trim() || input.sha.slice(0, 7),
    committedAt: input.commit.committer.date,
    url: input.html_url,
  };
}

async function fetchGitHubJson<T>(path: string): Promise<T> {
  const repo = getGitHubRepo();
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    headers: getGitHubHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchGitHubHeadCommit(ref = "main"): Promise<EditorialCommitSummary> {
  const commit = await fetchGitHubJson<GitHubCommitResponse>(`/commits/${encodeURIComponent(ref)}`);
  return normalizeCommit(commit);
}

async function readLatestStatusLines(limit = 12): Promise<string[]> {
  try {
    const content = await readFile(path.join(process.cwd(), "docs", "status.md"), "utf8");
    return content
      .split(/\r?\n/)
      .filter((line) => line.startsWith("| 20"))
      .slice(-limit)
      .map((line) => line.replace(/^\|\s*|\s*\|$/g, "").trim());
  } catch {
    return [];
  }
}

function deriveEditorialSignals(input: {
  commits: EditorialCommitSummary[];
  changedFiles: string[];
}) {
  const buckets = new Map<string, number>();

  const bump = (key: string, score = 1) => {
    buckets.set(key, (buckets.get(key) ?? 0) + score);
  };

  const allText = [
    ...input.commits.map((commit) => commit.message.toLowerCase()),
    ...input.changedFiles.map((file) => file.toLowerCase()),
  ].join("\n");

  if (allText.match(/telegram|bot|channel|editorial|release/)) bump("telegram", 2);
  if (allText.match(/profile|quest|reputation|trust|appeal/)) bump("profile", 2);
  if (allText.match(/arena|challenge|battle/)) bump("arena", 2);
  if (allText.match(/dispute|dashboard|matchmaking|mediation|reminder/)) bump("disputes", 2);
  if (allText.match(/learn|education|material/)) bump("education", 2);
  if (allText.match(/landing|support|boosty|marketing/)) bump("growth", 2);
  if (allText.match(/layout|header|menu|onboarding|loading|skeleton|pending|feed/)) bump("ux", 2);
  if (allText.match(/ops|cron|admin|moderation/)) bump("ops", 2);

  let userFacingScore = 0;
  for (const file of input.changedFiles) {
    if (file.startsWith("src/app/") || file.startsWith("src/components/")) {
      userFacingScore += 2;
    } else if (file.startsWith("docs/ops/") || file.startsWith("supabase/migrations/")) {
      userFacingScore -= 1;
    } else if (file.startsWith("src/lib/")) {
      userFacingScore += 1;
    }
  }

  const sortedSignals = Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([signal]) => signal)
    .slice(0, 4);

  let releaseTypeHint: EditorialChangeSet["releaseTypeHint"] = "feature";
  if (sortedSignals.includes("ops") && userFacingScore <= 1) {
    releaseTypeHint = "ops";
  } else if (sortedSignals.includes("ux") && !sortedSignals.includes("ops")) {
    releaseTypeHint = userFacingScore > 2 ? "ux" : "mixed";
  } else if (sortedSignals.length > 1) {
    releaseTypeHint = "mixed";
  }

  return {
    featureSignals: sortedSignals,
    releaseTypeHint,
    userFacingScore,
  };
}

export async function collectEditorialChanges(input: {
  fromCommit: string | null;
  toCommit?: string;
}): Promise<EditorialChangeSet> {
  const head = input.toCommit ? await fetchGitHubJson<GitHubCommitResponse>(`/commits/${input.toCommit}`) : null;
  const headCommit = head ? normalizeCommit(head) : await fetchGitHubHeadCommit();
  const statusLines = await readLatestStatusLines();

  if (!input.fromCommit) {
    const recent = await fetchGitHubJson<GitHubCommitResponse[]>(
      "/commits?sha=main&per_page=10"
    );

    const commits = recent.map(normalizeCommit);
    return {
      baseCommit: null,
      headCommit: headCommit.sha,
      commitCount: commits.length,
      commits,
      changedFiles: [],
      statusLines,
      ...deriveEditorialSignals({ commits, changedFiles: [] }),
    };
  }

  const compare = await fetchGitHubJson<{
    total_commits: number;
    commits: GitHubCommitResponse[];
    files?: Array<{ filename: string }>;
  }>(`/compare/${encodeURIComponent(input.fromCommit)}...${encodeURIComponent(headCommit.sha)}`);

  const commits = compare.commits.map(normalizeCommit);
  const changedFiles = Array.from(new Set((compare.files ?? []).map((file) => file.filename)));
  const signalData = deriveEditorialSignals({ commits, changedFiles });

  return {
    baseCommit: input.fromCommit,
    headCommit: headCommit.sha,
    commitCount: compare.total_commits,
    commits,
    changedFiles,
    statusLines,
    ...signalData,
  };
}
