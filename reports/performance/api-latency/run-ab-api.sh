#!/usr/bin/env bash
# usage: bash run-ab-api.sh "<variant:port> ..." "<pages>" "<modes>" <iterations> <labelprefix>
# Paired, rotating order, sequential. Local server (serve.js) per variant; API read-only proxied to production. Pages: home shop category prodA2 prodB3 prodC4.
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
LH="node /c/Users/mihir/lhtool/node_modules/lighthouse/cli/index.js"
declare -A U=( [home]=/ [shop]=/shop [category]=/MENS/TSHIRT [categoryslug]=/mens/tshirt [prodA2]=/mens/tshirt/6a785fb5114b201c76906b57 [prodB3]=/product/6a785e05114b201c76906af8 [prodC4]=/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13 )
read -ra VARS <<< "$1"; read -ra PAGES <<< "$2"; read -ra MODES <<< "$3"; ITER=$4; PFX=$5
one() { local name=${1%%:*} port=${1##*:} mode=$2 page=$3 i=$4; local L=$PFX-$mode-$name; mkdir -p raw/lighthouse/$L raw/artifacts/$L; local x=""; [ $mode = dt ] && x="--throttling-method=devtools"
  $LH "http://127.0.0.1:$port${U[$page]}" --only-categories=performance $x --chrome-flags="--headless=new --no-sandbox" -GA=raw/artifacts/$L/$page-$i --output=json --output-path=raw/lighthouse/$L/$page-$i.json --quiet >> raw/lighthouse/$L/run.log 2>&1 || echo "FAIL $page $i" >> raw/lighthouse/$L/run.log; }
N=${#VARS[@]}
for i in $(seq 1 $ITER); do for p in "${PAGES[@]}"; do for m in "${MODES[@]}"; do
  for k in $(seq 0 $((N-1))); do one "${VARS[$(( (k+i-1) % N ))]}" $m $p $i; done
done; done; done; mkdir -p raw/lighthouse/$PFX-done; echo DONE > raw/lighthouse/$PFX-done/run.log
