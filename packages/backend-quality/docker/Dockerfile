FROM node:26.13.1-bookworm-slim
WORKDIR /app
COPY . .
RUN npm install --global pnpm@10.11.0
RUN pnpm install --frozen-lockfile && pnpm run verify:build
RUN mkdir -p /app/quality-results && chown node:node /app/quality-results
USER node
ENTRYPOINT ["node","packages/cli/dist/index.js","quality","legacy"]
CMD ["list"]
# Extend with version-pinned k6, kubectl, ZAP, Schemathesis and Autocannon as needed; no privileged Docker socket by default.
