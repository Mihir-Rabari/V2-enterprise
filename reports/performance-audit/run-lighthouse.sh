#!/usr/bin/env bash
# Usage: bash run-lighthouse.sh   (runs from reports/performance-audit)
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
for page in home:/ shop:/shop; do
  name=${page%%:*}; path=${page#*:}
  for form in mobile desktop; do
    for i in 1 2 3; do
      extra=""; [ $form = desktop ] && extra="--preset=desktop"
      npx --yes lighthouse@13.5.0 "https://v2enterprise.in$path" $extra --only-categories=performance \
        --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=lighthouse/${name}-${form}-$i.json --quiet
    done
  done
done
