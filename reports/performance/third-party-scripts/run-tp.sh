#!/usr/bin/env bash
# Paired 3-way comparison, sequential, rotating order each iteration. ctl=:3100 (current tree), meta=:3101 (Meta injection deferred),
# gtm=:3102 (GTM injection deferred). Modes: dt = DevTools throttling (real), sim = Lighthouse simulated. Run from this directory.
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
LH="node /c/Users/mihir/lhtool/node_modules/lighthouse/cli/index.js"
declare -A U=( [prodA2]=/mens/tshirt/6a785fb5114b201c76906b57 [prodB3]=/product/6a785e05114b201c76906af8 [prodC4]=/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13 )
declare -A P=( [ctl]=3100 [meta]=3101 [gtm]=3102 )
one() { # mode variant page i
  local L=tp-$1-$2; mkdir -p raw/lighthouse/$L raw/artifacts/$L; local x=""; [ $1 = dt ] && x="--throttling-method=devtools"
  $LH "http://127.0.0.1:${P[$2]}${U[$3]}" --only-categories=performance $x --chrome-flags="--headless=new --no-sandbox" -GA=raw/artifacts/$L/$3-$4 --output=json --output-path=raw/lighthouse/$L/$3-$4.json --quiet >> raw/lighthouse/$L/run.log 2>&1 || echo "FAIL $3 $4" >> raw/lighthouse/$L/run.log
}
orders=("ctl meta gtm" "meta gtm ctl" "gtm ctl meta" "ctl gtm meta" "meta ctl gtm")
for i in 1 2 3 4 5; do for n in prodA2 prodB3 prodC4; do for mode in dt sim; do
  for v in ${orders[$((i-1))]}; do one $mode $v $n $i; done
done; done; done; mkdir -p raw/lighthouse/tp-done; echo DONE > raw/lighthouse/tp-done/run.log
