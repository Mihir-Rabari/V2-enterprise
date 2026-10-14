#!/usr/bin/env bash
# Paired dt-only comparison: D = defer-secondary build on :3101, C = defer-secondary + early product fetch on :3102.
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
LH="node /c/Users/mihir/lhtool/node_modules/lighthouse/cli/index.js"
declare -A U=( [prodA2]=/mens/tshirt/6a785fb5114b201c76906b57 [prodB3]=/product/6a785e05114b201c76906af8 [prodC4]=/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13 )
one() { local L=abc-dt-$1; mkdir -p raw/lighthouse/$L raw/artifacts/$L
  $LH "http://127.0.0.1:$2${U[$3]}" --only-categories=performance --throttling-method=devtools --chrome-flags="--headless=new --no-sandbox" -GA=raw/artifacts/$L/$3-$4 --output=json --output-path=raw/lighthouse/$L/$3-$4.json --quiet >> raw/lighthouse/$L/run.log 2>&1 || echo "FAIL $3 $4" >> raw/lighthouse/$L/run.log; }
for i in 1 2 3 4 5; do for n in prodA2 prodB3 prodC4; do
  if [ $((i%2)) = 1 ]; then one defer 3101 $n $i; one combo 3102 $n $i; else one combo 3102 $n $i; one defer 3101 $n $i; fi
done; done; mkdir -p raw/lighthouse/abc-done; echo DONE > raw/lighthouse/abc-done/run.log
