#!/usr/bin/env bash
# Paired A/B: A = images-only build on :3100, B = + defer-secondary-images build on :3101. Alternating order each iteration,
# both Lighthouse throttling modes (dt = real DevTools throttling, sim = default simulated). Sequential. Run from this directory.
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
LH="node /c/Users/mihir/lhtool/node_modules/lighthouse/cli/index.js"
declare -A U=( [prodA2]=/mens/tshirt/6a785fb5114b201c76906b57 [prodB3]=/product/6a785e05114b201c76906af8 [prodC4]=/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13 )
one() { # mode variant port page i
  local L=ab-$1-$2; mkdir -p raw/lighthouse/$L raw/artifacts/$L; local x=""; [ $1 = dt ] && x="--throttling-method=devtools"
  $LH "http://127.0.0.1:$3${U[$4]}" --only-categories=performance $x --chrome-flags="--headless=new --no-sandbox" -GA=raw/artifacts/$L/$4-$5 --output=json --output-path=raw/lighthouse/$L/$4-$5.json --quiet >> raw/lighthouse/$L/run.log 2>&1 || echo "FAIL $4 $5" >> raw/lighthouse/$L/run.log
}
for i in 1 2 3 4 5; do for n in prodA2 prodB3 prodC4; do for mode in dt sim; do
  if [ $((i%2)) = 1 ]; then one $mode base 3100 $n $i; one $mode defer 3101 $n $i; else one $mode defer 3101 $n $i; one $mode base 3100 $n $i; fi
done; done; done; mkdir -p raw/lighthouse/ab-done; echo DONE > raw/lighthouse/ab-done/run.log
