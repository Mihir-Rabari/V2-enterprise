#!/usr/bin/env bash
# Runs mobile Lighthouse x3 against a local preview of the branch build (API proxied read-only to production).
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
for i in 1 2 3; do
  npx --yes lighthouse@13.5.0 "http://127.0.0.1:3000/" --only-categories=performance \
    --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=lighthouse-after/home-mobile-$i.json --quiet
done
