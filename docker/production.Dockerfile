FROM node:22-alpine

# Static file server only; the bundle itself is built outside (see .github/actions/node-build).
RUN npm install -g http-server@14.1.1 && npm cache clean --force

WORKDIR /app

# Bundle and entrypoint are root-owned and read-only for the runtime user.
# Only config.js, written by run.mjs on every start, is owned by "node".
COPY html/build/ /app/
COPY html/run.mjs html/runtime-config.mjs /opt/sls-ui/
RUN touch /app/config.js && chown node:node /app/config.js

USER node
EXPOSE 3000

CMD ["node", "/opt/sls-ui/run.mjs"]
