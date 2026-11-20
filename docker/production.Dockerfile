FROM node:22-alpine

# The bundle is built outside (see .github/actions/node-build). The image only
# needs Node.js to run the dependency-free static server in run.mjs.
WORKDIR /app

# Root-owned and read-only for the runtime user; nothing is written at runtime,
# so the container also works with --read-only and any --user.
COPY html/build/ /app/
COPY html/run.mjs html/runtime-config.mjs html/static-server.mjs /opt/sls-ui/

USER node
EXPOSE 3000

CMD ["node", "/opt/sls-ui/run.mjs"]
