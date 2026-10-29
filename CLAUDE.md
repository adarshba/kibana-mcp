@CONTRIBUTING.md

## Agent notes

- After any change run `pnpm typecheck && pnpm build`, then smoke-test the touched tools over stdio. Report failures verbatim.
- Never print credential values from the environment.
