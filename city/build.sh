#!/bin/sh
# Verdant Bay is written in parts (src/); this joins them into index.html.
cd "$(dirname "$0")"
{ cat src/head.html; for f in src/*.js; do echo; cat "$f"; done; printf '</script>\n</body>\n</html>\n'; } > index.html
