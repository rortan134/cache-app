---
name: diagnose-bug
description: Diagnose a bug reports. Use when given an issue and asked to decide next steps such as verifying against the repo, requesting more info, or explaining why it is not a bug; follow any additional user-provided instructions.
---

# Diagnose Bug

## Overview

Diagnose a bug report and decide the next action: verify against sources, request more info, or explain why it is not a bug.

## Workflow

1. Understand the issue

- Extract: title, body, repro steps, expected vs actual, environment, logs, and any attachments.
- Note whether the report already includes logs or session details.
- If the report includes a thread ID, mention it in the summary and use it to look up the logs and session details if you have access to them.

2. Summarize the bug before investigating

- Before inspecting code, docs, or logs in depth, write a short summary of the report in your own words.
- Include the reported behavior, expected behavior, repro steps, environment, and what evidence is already attached or missing.

3. Decide the course of action

- **Verify with sources** when the report is specific and likely reproducible. Inspect relevant files (or mention the files to inspect if access is unavailable).
- **Request more information** when the report is vague, missing repro steps, or lacks logs/environment.
- **Explain not a bug** when the report contradicts current behavior or documented constraints (cite the evidence from the issue and any local sources you checked).

4. Respond

- Provide a concise report of your findings and next steps.
