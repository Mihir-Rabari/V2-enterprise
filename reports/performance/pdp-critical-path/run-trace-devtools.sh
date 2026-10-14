#!/usr/bin/env bash
# usage: bash run-trace.sh <label>   (run from reports/performance/pdp-critical-path)
# Local server on :3100 serving a branch build (VITE_API_URL=/api/v1), API proxied read-only (GET only) to production, images from prod CDN.
# Lighthouse 13.5.0 default mobile throttling; -GA keeps trace + devtools log per run. Strictly sequential.
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
LH="node /c/Users/mihir/lhtool/node_modules/lighthouse/cli/index.js"
L=$1; mkdir -p raw/lighthouse/$L raw/artifacts/$L
declare -A U=( [prodA2]=/mens/tshirt/6a785fb5114b201c76906b57 [prodB3]=/product/6a785e05114b201c76906af8 [prodC4]=/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13 )
for n in prodA2 prodB3 prodC4; do for i in 1 2 3; do
 $LH "http://127.0.0.1:3100${U[$n]}" --only-categories=performance --throttling-method=devtools --chrome-flags="--headless=new --no-sandbox" -GA=raw/artifacts/$L/$n-$i --output=json --output-path=raw/lighthouse/$L/$n-$i.json --quiet >> raw/lighthouse/$L/run.log 2>&1 || echo "FAIL $n $i" >> raw/lighthouse/$L/run.log
done; done; echo DONE >> raw/lighthouse/$L/run.log
