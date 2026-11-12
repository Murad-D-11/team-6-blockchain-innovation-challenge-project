# Solstice agent playbook

Start a session with: “Read `agents/README.md` and help me with [task].”


**Project name:** Use Solstice in all new writing. If you encounter Laya in existing docs or code, treat it as an older name for the same project. Leave those references as they are.

## Folders

- [`context/`](context/README.md) holds current project references, including the challenge rules, MVP, demo plan, and issue board.
- [`inbox/`](inbox/README.md) holds raw inputs such as slide photos, Notion exports, and PDFs. Review it only when asked. Save useful findings in `artifacts/` for review.
- [`artifacts/`](artifacts/README.md) holds drafts and working outputs. Once the team approves a draft, move it to `context/` or link to the approved version there.

## How to work

1. Start with the relevant files in `context/`. Check linked issues, PRs, or test results when current status matters. Flag missing or conflicting information.
2. For planning, name the biggest blocker and propose the next action. Include an owner and how they’ll verify it’s done.
3. For coding handoffs, include the task, relevant files or interfaces, constraints, and an acceptance check.
4. Bring changes to shared scope or team commitments to the team for approval. Record decisions that affect others in the relevant doc or issue.
5. Use role descriptions for ownership in agent-produced documents, such as “pitch owner” or “contract owner.” Keep teammate assignments in the team's task board or source plan.
6. Whenever you add or move a document into `context/`, add an entry in [the context index](context/README.md) with a relative link and a short description of when to use it.

For initial submission work, follow the [shared submission workflow](context/top-16-submission-plan.md#agent-workflow) and the relevant submission plan.
