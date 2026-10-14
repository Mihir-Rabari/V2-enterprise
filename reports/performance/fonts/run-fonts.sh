#!/usr/bin/env bash
# Paired 3-way, DevTools throttling (real) + simulated, rotating order, sequential. ctl=:3100, nofonts=:3101 (diagnostic), preload=:3102.
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
LH="node /c/Users/mihir/lhtool/node_modules/lighthouse/cli/index.js"
declare -A U=( [prodA2]=/mens/tshirt/6a785fb5114b201c76906b57 [prodB3]=/product/6a785e05114b201c76906af8 [prodC4]=/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13 )
declare -A P=( [ctl]=3100 [nofonts]=3101 [preload]=3102 )
one() { local L=f-$1-$2; mkdir -p raw/lighthouse/$L raw/artifacts/$L; local x=""; [ $1 = dt ] && x="--throttling-method=devtools"
  $LH "http://127.0.0.1:${P[$2]}${U[$3]}" --only-categories=performance $x --chrome-flags="--headless=new --no-sandbox" -GA=raw/artifacts/$L/$3-$4 --output=json --output-path=raw/lighthouse/$L/$3-$4.json --quiet >> raw/lighthouse/$L/run.log 2>&1 || echo "FAIL $3 $4" >> raw/lighthouse/$L/run.log; }
orders=("ctl nofonts preload" "nofonts preload ctl" "preload ctl nofonts" "ctl preload nofonts" "nofonts ctl preload")
for i in 1 2 3 4 5; do for n in prodA2 prodB3 prodC4; do for mode in dt; do
  for v in ${orders[$((i-1))]}; do one $mode $v $n $i; done
done; done; done; mkdir -p raw/lighthouse/f-done; echo DONE > raw/lighthouse/f-done/run.log
