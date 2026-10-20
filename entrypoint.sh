#!/usr/bin/env sh
# POSIX sh on Alpine (busybox ash): avoid `pipefail` portability issues
set -eu
# If you add pipelines later and want pipefail, enable it safely:
# (set -o pipefail) 2>/dev/null || true

# Generate public runtime config (NON-SECRETS ONLY)
mkdir -p /app/public
node -e 'const fs=require("fs");
const out={
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE||"",
  NEXT_PUBLIC_ENABLE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_LOGGING||"false",
  NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION||""
};
fs.writeFileSync("/app/public/env.js","window.__ENV__="+JSON.stringify(out)+";window.dispatchEvent(new Event('env-ready'));" );'

# Start the standalone server when available, otherwise fall back to npm start
if [ -f ".next/standalone/server.js" ]; then
  exec node .next/standalone/server.js
else
  exec npm run start -- -p ${PORT:-4000}
fi
