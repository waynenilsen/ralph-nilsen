#!/bin/bash

set -euo pipefail

# run claude in dangerous mode
cat loop.md | /Users/waynenilsen/.claude/local/claude --dangerously-skip-permissions --print
