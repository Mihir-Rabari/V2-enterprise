#!/usr/bin/env bash
# Audit-only. Sequential Lighthouse 13.5.0 runs against public prod pages. Run from this directory.
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
LH="node /c/Users/mihir/lhtool/node_modules/lighthouse/cli/index.js"
O=https://v2enterprise.in
declare -A U=( [home]=/ [shop]=/shop [category]=/mens/tshirt [prodA2]=/mens/tshirt/6a785fb5114b201c76906b57 [prodB3]=/product/6a785e05114b201c76906af8 [prodC4]=/combo-offers/bottom-wear-combo/6a5b0ecd3ade3ec2e3b30b13 )
mkdir -p lighthouse
run() { # name form i extra
  local n=$1 f=$2 i=$3 out=lighthouse/$1-$2-$3
  [ -s $out.report.json ] && return
  local x=""; [ $f = desktop ] && x="--preset=desktop"

  for try in 1 2; do
    $LH "$O${U[$n]}" $x --only-categories=performance --chrome-flags="--headless=new --no-sandbox" \
      --output=json --output=html --output-path=$out --quiet >> lighthouse/run.log 2>&1 && break
    echo "FAIL $n $f $i try$try $(date -u +%T)" >> lighthouse/run.log
  done
}
for n in home shop category prodA2 prodB3 prodC4; do
  for i in 1 2 3 4 5; do run $n mobile $i; done
  for i in 1 2 3; do run $n desktop $i; done
done
echo DONE >> lighthouse/run.log
