#!/bin/bash
echo "🔍 Checking for uncommitted changes..."
git status
echo "💾 Stashing local changes..."
git stash --include-untracked
echo "📂 Switching to main branch..."
git checkout main
echo "⬇️ Pulling latest changes..."
git pull origin main
echo "♻️ Restoring local changes..."
git stash pop
echo "✅ Update complete!"
