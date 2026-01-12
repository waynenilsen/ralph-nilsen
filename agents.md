see @prds/ and @dev-flow.md

## Pre-commit Workflow

Before committing any changes, run the cleanup subagent:

```
/cleanup
```

This will simplify your staged code without changing functionality.

## Ralph Loop Exit

Before exiting a ralph loop, always:

1. Run `/cleanup` to simplify staged changes
2. Add and commit your work:
   ```
   git add -A
   git commit -m "your commit message"
   ```

if you are prompted with @loop.md re read @loop.md at the end and make sure you followed the directions carefully
