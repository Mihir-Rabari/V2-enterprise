#!/usr/bin/env bash
# usage: run-local.sh <outdir>  (local server on :3100 serving a branch build, API proxied read-only to prod, images from prod CDN)
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
LH="node /c/Users/mihir/lhtool/node_modules/lighthouse/cli/index.js"
declare -A U=( [prodA2]=/mens/tshirt/6a785fb5114b201c76906b57 [prodB3]=/product/6a785e05114b201c76906af8 [prodC4]=/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13 )
export LHDIR=$1
for n in prodA2 prodB3 prodC4; do for i in 1 2 3 4 5; do
 $LH "http://127.0.0.1:3100${U[$n]}" --only-categories=performance --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=$1/$n-mobile-$i.report.json --quiet >> $1/run.log 2>&1 || echo "FAIL $n $i" >> $1/run.log
done; done; echo DONE >> $1/run.log
