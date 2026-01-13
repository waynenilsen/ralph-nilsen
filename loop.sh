#!/usr/bin/env bash
set -euo pipefail

# Ralph Loop - Autonomous development workflow
# Usage: ./loop.sh [max_iterations]

MAX_ITERATIONS=${1:-0}  # 0 = unlimited
ITERATION=0
PROMPT_FILE="loop.md"
BRANCH=$(git branch --show-current)

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}╔════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}           ${CYAN}RALPH LOOP${NC}                   ${BOLD}║${NC}"
echo -e "${BOLD}╠════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC} Prompt: ${GREEN}${PROMPT_FILE}${NC}"
echo -e "${BOLD}║${NC} Branch: ${YELLOW}${BRANCH}${NC}"
if [[ $MAX_ITERATIONS -gt 0 ]]; then
    echo -e "${BOLD}║${NC} Max iterations: ${MAX_ITERATIONS}"
else
    echo -e "${BOLD}║${NC} Max iterations: ${DIM}unlimited${NC}"
fi
echo -e "${BOLD}╚════════════════════════════════════════╝${NC}"

if [[ ! -f "$PROMPT_FILE" ]]; then
    echo -e "${RED}Error: ${PROMPT_FILE} not found${NC}"
    exit 1
fi

# jq filter to format stream-json output nicely
JQ_FILTER='
if .type == "assistant" then
    .message.content[]? |
    if .type == "text" then
        "\u001b[0m" + .text
    elif .type == "tool_use" then
        "\u001b[33m⚡ " + .name + "\u001b[0m"
    else empty end
elif .type == "result" then
    "\u001b[32m✓ Done: " + (.duration_ms // 0 | . / 1000 | tostring | .[0:5]) + "s, cost: $" + ((.cost_usd // 0) | tostring | .[0:6]) + "\u001b[0m"
else empty end
'

while true; do
    ITERATION=$((ITERATION + 1))

    if [[ $MAX_ITERATIONS -gt 0 && $ITERATION -gt $MAX_ITERATIONS ]]; then
        echo -e "${GREEN}Reached max iterations (${MAX_ITERATIONS})${NC}"
        break
    fi

    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Iteration ${ITERATION}${NC} $(date '+%H:%M:%S')"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Run claude with stream-json, pipe through jq for pretty output
    claude -p "@loop.md" \
        --dangerously-skip-permissions \
        --output-format stream-json \
        --model sonnet \
        --verbose 2>/dev/null \
    | while IFS= read -r line; do
        echo "$line" | jq -r "$JQ_FILTER" 2>/dev/null || true
    done

    # Push changes
    echo ""
    echo -e "${DIM}Pushing to ${BRANCH}...${NC}"
    if ! git push origin "$BRANCH" 2>/dev/null; then
        git push --set-upstream origin "$BRANCH" 2>/dev/null || true
    fi

    echo -e "${GREEN}Iteration ${ITERATION} complete${NC}"

    # Brief pause between iterations
    sleep 2
done
