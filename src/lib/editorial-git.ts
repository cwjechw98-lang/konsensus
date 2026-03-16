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
    };
  }

  const compare = await fetchGitHubJson<{
    total_commits: number;
    commits: GitHubCommitResponse[];
    files?: Array<{ filename: string }>;
  }>(`/compare/${encodeURIComponent(input.fromCommit)}...${encodeURIComponent(headCommit.sha)}`);

  const commits = compare.commits.map(normalizeCommit);
  const changedFiles = Array.from(new Set((compare.files ?? []).map((file) => file.filename)));

  return {
    baseCommit: input.fromCommit,
    headCommit: headCommit.sha,
    commitCount: compare.total_commits,
    commits,
    changedFiles,
    statusLines,
  };
}
