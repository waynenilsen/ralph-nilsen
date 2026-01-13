#!/usr/bin/env bash
# initialize-gh.sh - Setup and verify GitHub CLI for project management
#
# This script ensures gh CLI has the required scopes and provides
# helper functions for working with GitHub Projects.

set -e

REPO="waynenilsen/ralph-nilsen"
PROJECT_NUMBER=3
PROJECT_ID="PVT_kwHOADcguc4BMU5T"

# Required scopes for full project management
REQUIRED_SCOPES="repo,read:org,read:project,project"

echo "=== GitHub CLI Initialization ==="
echo

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "ERROR: gh CLI is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check auth status
echo "Checking authentication status..."
if ! gh auth status &> /dev/null; then
    echo "ERROR: Not authenticated. Run: gh auth login"
    exit 1
fi

echo "Authenticated as: $(gh api user --jq '.login')"
echo

# Check and request required scopes
echo "Checking token scopes..."
CURRENT_SCOPES=$(gh auth status 2>&1 | grep -oP "Token scopes:.*" | head -1)
echo "$CURRENT_SCOPES"

# Check for required scopes
# Note: 'project' scope implies read+write, so 'read:project' is not needed if 'project' exists
MISSING_SCOPES=""
HAS_PROJECT_WRITE=$(echo "$CURRENT_SCOPES" | grep -q "'project'" && echo "yes" || echo "no")
HAS_PROJECT_READ=$(echo "$CURRENT_SCOPES" | grep -q "'read:project'" && echo "yes" || echo "no")

if [[ "$HAS_PROJECT_WRITE" == "no" && "$HAS_PROJECT_READ" == "no" ]]; then
    MISSING_SCOPES="$MISSING_SCOPES project"
fi

if [[ -n "$MISSING_SCOPES" ]]; then
    echo
    echo "Missing scopes:$MISSING_SCOPES"
    echo "Run the following to add them:"
    echo "  gh auth refresh -s project"
    echo
    read -p "Would you like to run this now? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gh auth refresh -s project
        echo "Scopes updated!"
    else
        echo "Skipping scope refresh. Some operations may fail."
    fi
else
    echo "All required scopes present!"
fi

echo
echo "=== Project Information ==="
echo

# Find project associated with repo
echo "Finding project linked to $REPO..."
PROJECT_INFO=$(gh api graphql -f query='
{
  repository(owner: "waynenilsen", name: "ralph-nilsen") {
    projectsV2(first: 10) {
      nodes {
        title
        number
        url
        id
      }
    }
  }
}' 2>/dev/null)

echo "$PROJECT_INFO" | jq -r '.data.repository.projectsV2.nodes[] | "  #\(.number): \(.title) - \(.url)"'

echo
echo "=== Status Field Options ==="
echo

# Get status options for the project
gh api graphql -f query='
{
  user(login: "waynenilsen") {
    projectV2(number: 3) {
      field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          options {
            id
            name
          }
        }
      }
    }
  }
}' 2>/dev/null | jq -r '.data.user.projectV2.field.options[] | "  \(.name): \(.id)"'

echo
echo "=== Helper Commands ==="
echo
cat << 'EOF'
# List all items in the project:
gh project item-list 3 --owner waynenilsen

# Create an issue and add to project:
gh issue create --title "Title" --body "Body" --project "1"

# Move an item to Done status:
# (Replace ITEM_ID with the project item ID from item-list)
gh project item-edit \
  --project-id PVT_kwHOADcguc4BMU5T \
  --id ITEM_ID \
  --field-id PVTSSF_lAHOADcguc4BMU5Tzg7pClk \
  --single-select-option-id 98236657

# Close an issue:
gh issue close ISSUE_NUMBER

# View issue details:
gh issue view ISSUE_NUMBER
EOF

echo
echo "=== Initialization Complete ==="
