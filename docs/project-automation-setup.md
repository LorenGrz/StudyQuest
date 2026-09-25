# Project automation setup

This repository includes GitHub-native issue forms, a lightweight triage workflow, and a pull request template to complement the built-in automation you will configure manually in GitHub Projects.

## What each issue form does

The issue forms live in `.github/ISSUE_TEMPLATE/` and standardize issue creation so new work arrives with enough context to be triaged or sent directly into your GitHub Project.

- `epic.yml`: for high-level initiatives that group related work.
- `feature.yml`: for product or engineering features that deliver new behavior.
- `bug.yml`: for defects, regressions, and broken behavior.
- `chore.yml`: for maintenance, tooling, cleanup, and operational work.

Each form:

- sets a clear issue title prefix
- applies a default type label for the selected work item
- asks for the underlying problem or need
- asks for additional context
- asks for acceptance criteria
- asks for area: `frontend`, `backend`, `mobile`, `infra`, `design`
- asks for priority: `P0`, `P1`, `P2`
- asks for size: `XS`, `S`, `M`, `L`

## What `config.yml` does

`.github/ISSUE_TEMPLATE/config.yml` disables blank issues so contributors create issues through the supported forms instead of bypassing the structure needed for project automation.

## What `triage.yml` does

`.github/workflows/triage.yml` runs on `issues.opened` and `issues.reopened`.

Its job is intentionally narrow:

- if the issue already has one of these type labels, it does nothing: `epic`, `feature`, `bug`, `chore`
- if the issue does not have any of those labels, it automatically adds the `triage` label

This helps surface issues created through other entry points, such as email, API integrations, or future manual issue creation paths, without overriding the labels already applied by issue forms.

## Manual GitHub Project setup

The repository files here are designed to complement GitHub Project built-in workflows, not replace them.

In the GitHub Project UI, configure these built-in workflows manually:

1. Auto-add to project with filter `is:issue`
2. Item added to project -> set `Status` to `Todo`
3. Item closed -> set `Status` to `Done`
4. Pull request linked to issue -> optionally set `Status` to `In Progress`
5. Pull request merged -> optionally set `Status` to `Done`
6. Auto-add sub-issues to project if you plan to use epics or issue hierarchies
7. Auto-archive old closed items if you want to keep the board clean

## Labels to create

Create these labels in the repository if they do not already exist:

- `epic`
- `feature`
- `bug`
- `chore`
- `triage`

Recommended optional labels if you want stronger filtering in GitHub Projects:

- `frontend`
- `backend`
- `mobile`
- `infra`
- `design`
- `P0`
- `P1`
- `P2`
- `XS`
- `S`
- `M`
- `L`

To create labels manually in GitHub:

1. Open the repository on GitHub.
2. Go to `Issues`.
3. Open `Labels`.
4. Click `New label`.
5. Create each label listed above with the name and color you prefer.

## Pull request template

`PULL_REQUEST_TEMPLATE.md` keeps pull requests aligned with your issue workflow by asking for:

- the issue being resolved
- a short summary of what changed
- testing steps
- a short checklist before merge

## Assumptions

These files were created with the following assumptions:

- the GitHub Project `Status` field uses standard values like `Todo`, `In Progress`, and `Done`
- labels may not exist yet, so label creation is documented as a manual setup step
- area, priority, and size are captured in the issue body for consistency, even if you later decide to mirror them as labels or project fields
