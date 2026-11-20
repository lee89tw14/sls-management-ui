FROM node:22-alpine

# The server needs only the node binary. npm, yarn and corepack ship their own
# vulnerable dependencies, so scanners would flag them.
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules /opt/yarn-* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

WORKDIR /app

COPY html/build/ /app/
COPY html/run.mjs html/runtime-config.mjs html/static-server.mjs /opt/sls-ui/

USER node
EXPOSE 3000

CMD ["node", "/opt/sls-ui/run.mjs"]
