// @ts-check

// The `sync-guard` check. A required check on every destination of the skills sync: it decides,
// from a pull request's metadata alone, whether the PR may merge without a person.
//
//   a sync PR   head branch `skills-sync/<version>` in this repository: passes only when the
//               release GitHub App opened it, every changed path (and, for a rename, its
//               previous path) is in the allowlist, and nothing under `.github/` changes;
//   any other   passes when no changed path is in the allowlist or the protected list; one that
//               touches either passes only with an approving review of a maintainer on its
//               current head commit.
//
// It runs on `pull_request_target`, so the definition that runs is the default branch's, never
// the PR's. It reads the PR, its files, its reviews and the reviewers' permission through the
// REST API; it never checks out or executes the PR's code and holds no secret. It fails closed:
// an API error, or a file list that is not the whole of the PR, is a failure.
//
// This file is self-contained on purpose: every destination runs an identical copy of it.
//
//   GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER   the PR to judge
//   SYNC_GUARD_ALLOWLIST                         the generated paths: globs, comma or newline separated
//   SYNC_GUARD_PROTECTED                         optional: hand-maintained paths that need a
//                                                maintainer's review, same syntax
//   SYNC_GUARD_APP_LOGIN                         the release App's bot login

import { pathToFileURL } from "node:url";

/** The permission levels that make a reviewer a maintainer. */
const MAINTAINER = new Set(["write", "maintain", "admin"]);
/** Branch prefix of a sync PR. */
const SYNC_BRANCH_PREFIX = "skills-sync/";
/** Page size of every list call; the files endpoint stops at 3,000 files (30 pages). */
const PER_PAGE = 100;
const MAX_PAGES = 40;

/**
 * @typedef {{ filename: string, previous_filename?: string }} PrFile
 * @typedef {{ user: { login: string } | null, state: string, commit_id?: string }} PrReview
 * @typedef {{
 *   user: { login: string } | null,
 *   head: { ref: string, sha: string, repo: { full_name: string } | null },
 *   base: { repo: { full_name: string } },
 *   changed_files: number,
 * }} PullRequest
 * @typedef {{ pass: boolean, reasons: string[] }} Verdict
 */

/**
 * Whether a path is covered by a glob of the allowlist: `dir/**` covers everything under
 * `dir/`, any other pattern is an exact path.
 * @param {string[]} allowlist
 * @param {string | undefined} path
 */
export function matches(allowlist, path) {
	if (typeof path !== "string" || path === "") return false;
	return allowlist.some((glob) =>
		glob.endsWith("/**") ? path.startsWith(glob.slice(0, -2)) : path === glob,
	);
}

/** @param {string | undefined | null} login */
const norm = (login) => (login ?? "").toLowerCase();

/**
 * Judge a pull request.
 * @param {{
 *   pr: PullRequest,
 *   files: PrFile[],
 *   reviews: PrReview[],
 *   permissions: Record<string, string>,
 *   allowlist: string[],
 *   protectedPaths?: string[],
 *   appLogin: string,
 * }} input `reviews` oldest first; `permissions` maps a reviewer's login to the repository
 *   permission level (`admin`, `maintain`, `write`, `triage`, `read`, `none`); `protectedPaths`
 *   are hand-maintained paths a non-sync PR may change only with a maintainer's review
 * @returns {Verdict}
 */
export function judge({
	pr,
	files,
	reviews,
	permissions,
	allowlist,
	protectedPaths = [],
	appLogin,
}) {
	/** @type {string[]} */
	const reasons = [];
	if (files.length !== pr.changed_files)
		reasons.push(
			`the file list is incomplete (${files.length} of ${pr.changed_files} files read), so the PR cannot be judged`,
		);

	/** @param {PrFile} f */
	const paths = (f) => [f.filename, f.previous_filename].filter((p) => typeof p === "string");
	const generated = files.filter((f) => paths(f).some((p) => matches(allowlist, p)));
	const guarded = files.filter((f) =>
		paths(f).some((p) => matches(allowlist, p) || matches(protectedPaths, p)),
	);
	const isSync =
		pr.head.ref.startsWith(SYNC_BRANCH_PREFIX) &&
		pr.head.repo?.full_name === pr.base.repo.full_name;

	if (isSync) {
		if (!appLogin || norm(pr.user?.login) !== norm(appLogin))
			reasons.push(`a sync PR must be opened by ${appLogin || "the release App"}`);
		for (const f of files) {
			const outside = paths(f).find((p) => !matches(allowlist, p));
			if (outside !== undefined) reasons.push(`${outside} is outside the sync allowlist`);
			const github = paths(f).find((p) => p === ".github" || p.startsWith(".github/"));
			if (github !== undefined) reasons.push(`${github} is under .github/`);
		}
	} else if (guarded.length > 0) {
		const perms = Object.fromEntries(Object.entries(permissions).map(([k, v]) => [norm(k), v]));
		/** @type {Map<string, PrReview>} */
		const latest = new Map();
		for (const r of reviews) {
			if (r.state !== "APPROVED" && r.state !== "CHANGES_REQUESTED") continue;
			if (r.user) latest.set(norm(r.user.login), r);
		}
		const blocked = [...latest.entries()].filter(([, r]) => r.state === "CHANGES_REQUESTED");
		const approved = [...latest.entries()].filter(
			([login, r]) =>
				r.state === "APPROVED" &&
				r.commit_id === pr.head.sha &&
				login !== norm(pr.user?.login) &&
				MAINTAINER.has(perms[login] ?? "none"),
		);
		if (blocked.length > 0)
			reasons.push(`changes are requested by ${blocked.map(([login]) => login).join(", ")}`);
		if (approved.length === 0)
			reasons.push(
				`${guarded[0].filename} is a ${generated.length > 0 ? "generated" : "protected"} path: it needs an approving review from a maintainer on the current head commit; re-run this check after the approval`,
			);
	}
	return { pass: reasons.length === 0, reasons };
}

/**
 * Every item of a paginated list endpoint.
 * @param {string} api @param {string} token @param {string} path
 * @returns {Promise<any[]>}
 */
async function list(api, token, path) {
	/** @type {any[]} */
	const items = [];
	for (let page = 1; page <= MAX_PAGES; page++) {
		const batch = await get(
			api,
			token,
			`${path}${path.includes("?") ? "&" : "?"}per_page=${PER_PAGE}&page=${page}`,
		);
		if (!Array.isArray(batch)) throw new Error(`unexpected answer on ${path}`);
		items.push(...batch);
		if (batch.length < PER_PAGE) return items;
	}
	return items;
}

/**
 * One REST call; a non-2xx answer throws (the guard fails closed).
 * @param {string} api @param {string} token @param {string} path
 * @returns {Promise<any>}
 */
async function get(api, token, path) {
	const res = await fetch(`${api}${path}`, {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"X-GitHub-Api-Version": "2022-11-28",
		},
	});
	if (!res.ok) throw new Error(`GitHub API ${res.status} on ${path.split("?")[0]}`);
	return res.json();
}

/** @param {string | undefined} raw */
export const parseAllowlist = (raw) =>
	(raw ?? "")
		.split(/[\n,]/)
		.map((s) => s.trim())
		.filter(Boolean);

/** Fetch the PR named by the environment, judge it, and report. @returns {Promise<Verdict>} */
export async function run(env = process.env) {
	const token = env.GITHUB_TOKEN;
	const repo = env.GITHUB_REPOSITORY;
	const number = env.PR_NUMBER;
	if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[1-9]\d*$/.test(number ?? ""))
		throw new Error("GITHUB_TOKEN, GITHUB_REPOSITORY and PR_NUMBER are required");
	const allowlist = parseAllowlist(env.SYNC_GUARD_ALLOWLIST);
	if (allowlist.length === 0) throw new Error("SYNC_GUARD_ALLOWLIST is empty");
	const api = env.GITHUB_API_URL ?? "https://api.github.com";
	const base = `/repos/${repo}/pulls/${number}`;

	const pr = await get(api, token, base);
	const files = await list(api, token, `${base}/files`);
	const reviews = await list(api, token, `${base}/reviews`);

	/** @type {Record<string, string>} */
	const permissions = {};
	const candidates = new Set(
		reviews
			.filter((r) => r.state === "APPROVED" && r.commit_id === pr.head.sha && r.user)
			.map((r) => String(r.user.login)),
	);
	for (const login of candidates) {
		if (!/^[\w-]+(\[bot\])?$/.test(login)) throw new Error("unexpected reviewer login");
		const res = await get(api, token, `/repos/${repo}/collaborators/${login}/permission`);
		permissions[norm(login)] = String(res.permission ?? "none");
	}
	return judge({
		pr,
		files,
		reviews,
		permissions,
		allowlist,
		protectedPaths: parseAllowlist(env.SYNC_GUARD_PROTECTED),
		appLogin: env.SYNC_GUARD_APP_LOGIN ?? "",
	});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	run()
		.then(({ pass, reasons }) => {
			if (pass) console.log("sync-guard: pass");
			else for (const reason of reasons) console.error(`sync-guard: ${reason}`);
			process.exit(pass ? 0 : 1);
		})
		.catch((err) => {
			console.error(`sync-guard: ${err instanceof Error ? err.message : "failed"}`);
			process.exit(1);
		});
}
