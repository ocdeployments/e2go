#!/bin/bash
echo "=== e2go QA Snapshot ==="
echo "Date: $(date)"
echo ""
echo "--- TypeScript ---"
npx tsc --noEmit
echo ""
echo "--- Build ---"
npm run build
echo ""
echo "--- Playwright ---"
npx playwright test --reporter=list
echo ""
echo "--- Route audit ---"
echo "Checking all registered routes..."
find src/app -name "page.tsx" | sed 's|src/app||' | sed 's|/page.tsx||' | sort
echo ""
echo "--- Done ---"
