# AGENTS.md

## Local Tooling Notes

- In Codex sessions for this repo, `npm` may not be on `PATH`. Use `/opt/homebrew/bin/npm` instead.
- Playwright tests start a local static server on port 8000. If `npm test` fails with `PermissionError: [Errno 1] Operation not permitted` while starting `python3 -m http.server 8000`, rerun the test command with sandbox escalation.
- Verified command: `/opt/homebrew/bin/npm test`.
