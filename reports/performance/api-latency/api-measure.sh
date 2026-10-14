#!/usr/bin/env bash
# Bounded read-only production probe: 15 public GET endpoints x 5 reps, 0.7 s apart, plus one decoded-size fetch per endpoint.
# usage: bash api-measure.sh <outfile.csv>
B=https://v2enterprise.in/api/v1; OUT=$1
echo "endpoint,rep,status,dns_ms,connect_ms,tls_ms,ttfb_ms,total_ms,bytes_wire,bytes_decoded,content_encoding,cache_control,etag_present,cf_cache_status,age" > $OUT
EPS=("settings" "categories" "filters/suggestions" "content/FEATURE_ITEM" "content/TAGLINE" "sliders/hero" "sliders/promotional" "reviews/homepage" "content/MARQUEE" "content/LOOKBOOK_ITEM" "products?page=1&limit=20&status=ACTIVE&groupByColor=true&sort=Newest&search=" "products?limit=300&groupByColor=true" "products/6a785e05114b201c76906af8" "products?limit=4&status=ACTIVE&groupByColor=true" "reviews/product/6a785e05114b201c76906af8")
for ep in "${EPS[@]}"; do
 dec=$(curl -s -m 30 --compressed "$B/$ep" | wc -c)
 for i in 1 2 3 4 5; do
  h=$(curl -s -m 30 -H "Accept-Encoding: br, gzip" -D - -o /dev/null -w "\n@@%{http_code} %{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer} %{time_total} %{size_download}" "$B/$ep" | tr -d '\r')
  st=$(echo "$h" | grep '^@@' | sed 's/@@//')
  ce=$(echo "$h"|grep -i '^content-encoding'|cut -d' ' -f2); cc=$(echo "$h"|grep -i '^cache-control'|cut -d' ' -f2-|tr ',' ';'); et=$(echo "$h"|grep -ic '^etag'); cf=$(echo "$h"|grep -i '^cf-cache-status'|cut -d' ' -f2); ag=$(echo "$h"|grep -i '^age'|cut -d' ' -f2)
  echo "$st" | awk -v ep="${ep:0:70}" -v i=$i -v dec=$dec -v ce="$ce" -v cc="$cc" -v et="$et" -v cf="$cf" -v ag="$ag" '{printf "\"%s\",%d,%s,%d,%d,%d,%d,%d,%s,%s,%s,\"%s\",%s,%s,%s\n",ep,i,$1,$2*1000,$3*1000,$4*1000,$5*1000,$6*1000,$7,dec,ce,cc,et,cf,ag}' >> $OUT
  sleep 0.7
 done
done
