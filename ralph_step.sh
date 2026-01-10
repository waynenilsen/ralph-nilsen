set -euo pipefail

docker sandbox run claude -p "$1" \
        --dangerously-skip-permissions \
        --model opus \
        --verbose

echo "done"