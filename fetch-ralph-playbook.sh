#!/bin/bash

# Script to fetch ralph-playbook repository and copy files to current directory

set -e  # Exit on error

# Create temporary directory
TMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TMP_DIR"

# Clone the repository into temp directory
echo "Cloning ralph-playbook repository..."
git clone https://github.com/ClaytonFarr/ralph-playbook.git "$TMP_DIR"

# Copy all files and folders except .git to current directory
echo "Copying files (excluding .git)..."
rsync -av --exclude='.git' "$TMP_DIR/" .

# Clean up temporary directory
echo "Cleaning up temporary directory..."
rm -rf "$TMP_DIR"

echo "Done! Files copied successfully."
