# Running Ralph SDLC Orchestrator

## Quick Start

Ralph uses Claude Code CLI to leverage your Claude Max subscription. Make sure you have the Claude CLI installed and configured.

### First Test: Start from Ideation Phase

```bash
# Start from ideation phase (default) - Ralph will determine what to work on
bun orchestrator/cli.ts --phase ideation

# Or simply (ideation is default)
bun orchestrator/cli.ts
```

### Start from Any Phase

```bash
# Start from implementation phase
bun orchestrator/cli.ts --phase implementation

# Start from testing phase
bun orchestrator/cli.ts --phase testing

# Start from review phase
bun orchestrator/cli.ts --phase review
```

### With Optional Task Context

```bash
# Start from a phase with optional task context
bun orchestrator/cli.ts --phase planning --task "Improve orchestrator error handling"

# Or let Ralph determine the task from context
bun orchestrator/cli.ts --phase implementation
```

## Claude CLI Setup

The orchestrator uses Claude CLI by default. Make sure:

1. **Claude CLI is installed** and available in your PATH
2. **Claude CLI is authenticated** with your Claude Max subscription
3. **Test the CLI** works:
   ```bash
   claude --model claude-3-5-sonnet-20241022 "Hello"
   ```

### Environment Variables (Optional)

- `ANTHROPIC_CLI_PATH` - Path to Claude CLI (default: `claude`)
- `CLAUDE_MODEL` - Claude model to use (default: `claude-3-5-sonnet-20241022`)

```bash
export ANTHROPIC_CLI_PATH=/path/to/claude
export CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

## Example Tasks

### Self-Improvement Task

```bash
bun orchestrator/cli.ts "Analyze the orchestrator codebase, identify areas for improvement, and implement enhancements to make it more effective at recursive self-improvement" --max-iterations 5
```

### Feature Development Task

```bash
bun orchestrator/cli.ts "Build a task management API with user authentication, CRUD operations, and comprehensive tests" --max-iterations 20
```

### Bug Fix Task

```bash
bun orchestrator/cli.ts "Fix all linting errors and improve error handling in the orchestrator" --max-iterations 5
```

## How It Works

1. **Initialization**: Ralph loads all agent prompts and initializes the SDLC loop
2. **Phase Execution**: Each phase uses Claude CLI to execute agent tasks
3. **Iteration**: Ralph loops through phases until completion or max iterations
4. **Self-Improvement**: Ralph can analyze its own code and suggest improvements

## Troubleshooting

### Claude CLI Not Found

```
Error: Claude CLI not found. Install it or set ANTHROPIC_CLI_PATH environment variable.
```

**Solution**: Install Claude CLI or set `ANTHROPIC_CLI_PATH` to the CLI path.

### No Response from Claude

Check that:

- Claude CLI is authenticated
- Your Claude Max subscription is active
- The CLI command works manually

### TypeScript Errors

The orchestrator uses Bun's markdown import feature. TypeScript should recognize it via `orchestrator/markdown.d.ts`. If you see errors, ensure `tsconfig.json` includes the type declarations.

## Next Steps

After your first run, Ralph will:

1. Analyze the orchestrator codebase
2. Identify improvement opportunities
3. Create GitHub issues for enhancements
4. Implement improvements iteratively
5. Test and validate changes
6. Continue improving until completion promise
