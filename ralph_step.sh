set -euo pipefail

docker sandbox run claude -p "$1" \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose

echo "done"