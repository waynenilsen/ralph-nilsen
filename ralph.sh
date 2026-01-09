#!/bin/bash
#
# Ralph SDLC Loop Runner
# Calls Claude repeatedly until <promise>COMPLETE</promise> is output
#

set -e

# Find the claude CLI binary
find_claude() {
    # Check if claude is directly available in PATH
    if command -v claude &> /dev/null; then
        echo "claude"
        return 0
    fi

    # Common installation locations
    local locations=(
        "$HOME/.local/bin/claude"
        "$HOME/.npm-global/bin/claude"
        "/usr/local/bin/claude"
        "/opt/homebrew/bin/claude"
        "$HOME/.nvm/versions/node/*/bin/claude"
        "$HOME/node_modules/.bin/claude"
        "./node_modules/.bin/claude"
    )

    for loc in "${locations[@]}"; do
        # Handle glob patterns
        for expanded in $loc; do
            if [[ -x "$expanded" ]]; then
                echo "$expanded"
                return 0
            fi
        done
    done

    # Try to find via npm
    if command -v npm &> /dev/null; then
        local npm_bin
        npm_bin="$(npm bin -g 2>/dev/null)/claude"
        if [[ -x "$npm_bin" ]]; then
            echo "$npm_bin"
            return 0
        fi
    fi

    return 1
}

# Allow override via environment variable, otherwise auto-detect
if [[ -n "${CLAUDE_BIN:-}" ]] && [[ -x "$CLAUDE_BIN" ]]; then
    : # Use the provided CLAUDE_BIN
else
    CLAUDE_BIN=$(find_claude) || {
        echo -e "${RED}Error: Could not find claude CLI${NC}"
        echo "Please ensure Claude CLI is installed. Try:"
        echo "  npm install -g @anthropic-ai/claude-code"
        echo "Or set CLAUDE_BIN environment variable to the path"
        exit 1
    }
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/ralph_entry.md"
MAX_ITERATIONS=${RALPH_MAX_ITERATIONS:-50}
DELAY_BETWEEN=${RALPH_DELAY:-5}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Ralph SDLC Loop${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Max iterations: ${YELLOW}$MAX_ITERATIONS${NC}"
echo -e "Delay between:  ${YELLOW}${DELAY_BETWEEN}s${NC}"
echo -e "Prompt file:    ${YELLOW}$PROMPT_FILE${NC}"
echo -e "Claude binary:  ${YELLOW}$CLAUDE_BIN${NC}"
echo ""

if [[ ! -f "$PROMPT_FILE" ]]; then
    echo -e "${RED}Error: $PROMPT_FILE not found${NC}"
    exit 1
fi

# Read the prompt file
SYSTEM_PROMPT=$(cat "$PROMPT_FILE")

iteration=0
completed=false

while [[ $iteration -lt $MAX_ITERATIONS ]] && [[ "$completed" != "true" ]]; do
    iteration=$((iteration + 1))

    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}Iteration $iteration / $MAX_ITERATIONS${NC}"
    echo -e "${BLUE}========================================${NC}"

    # Show current stage if file exists
    if [[ -f "CURRENT_STAGE.md" ]]; then
        current_stage=$(grep "^# Current Stage:" CURRENT_STAGE.md | sed 's/# Current Stage: //')
        echo -e "Current stage: ${YELLOW}$current_stage${NC}"
    else
        echo -e "Current stage: ${YELLOW}(not started)${NC}"
    fi
    echo ""

    # Build the task message
    # First invocation or subsequent - Claude will figure it out from CURRENT_STAGE.md
    TASK_MSG="Continue the Ralph SDLC loop. Read CURRENT_STAGE.md (create if missing) and make progress on the current stage. Commit state changes when transitioning."

    # Add initial task if provided as argument
    if [[ -n "$1" ]] && [[ $iteration -eq 1 ]]; then
        TASK_MSG="Start the Ralph SDLC loop for this task: $1

Read CURRENT_STAGE.md (create if missing) and begin."
    fi

    # Create a temp file for output
    OUTPUT_FILE=$(mktemp)

    # Run Claude with the system prompt
    # Using --print to get output, piping through tee to capture
    echo -e "${BLUE}Invoking Claude...${NC}"
    echo ""

    # Run claude with the prompt file as system prompt
    if ! "$CLAUDE_BIN" --print --system-prompt "$PROMPT_FILE" "$TASK_MSG" 2>&1 | tee "$OUTPUT_FILE"; then
        echo -e "${RED}Claude exited with error${NC}"
        rm -f "$OUTPUT_FILE"
        exit 1
    fi

    echo ""

    # Check for completion promise
    if grep -q "<promise>COMPLETE</promise>" "$OUTPUT_FILE"; then
        completed=true
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  COMPLETE!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "Loop finished after ${GREEN}$iteration${NC} iterations"
    fi

    rm -f "$OUTPUT_FILE"

    if [[ "$completed" != "true" ]]; then
        echo -e "${YELLOW}Waiting ${DELAY_BETWEEN}s before next iteration...${NC}"
        sleep "$DELAY_BETWEEN"
    fi
done

if [[ "$completed" != "true" ]]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Max iterations reached ($MAX_ITERATIONS)${NC}"
    echo -e "${RED}========================================${NC}"
    echo "Consider:"
    echo "  - Increasing RALPH_MAX_ITERATIONS"
    echo "  - Checking CURRENT_STAGE.md for blockers"
    echo "  - Running manually to debug"
    exit 1
fi

echo ""
echo -e "${GREEN}Ralph SDLC loop completed successfully!${NC}"
