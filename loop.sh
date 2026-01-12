#!/bin/bash

set -euo pipefail

# Function to play notification sound
play_ding() {
    # Try to play a system sound, fallback to beep if sound file not found
    if [ -f "/System/Library/Sounds/Glass.aiff" ]; then
        afplay /System/Library/Sounds/Glass.aiff
    elif [ -f "/System/Library/Sounds/Basso.aiff" ]; then
        afplay /System/Library/Sounds/Basso.aiff
    else
        # Fallback to system beep
        osascript -e 'beep'
    fi
}

# Trap to play sound on script exit (when Claude finishes or needs input)
trap 'play_ding' EXIT

# run claude in dangerous mode
/Users/waynenilsen/.claude/local/claude -p "@loop.md" --output-format stream-json --verbose | jq -r 'select(.message.content) | .message.content[] | select(.type == "text") | .text'
