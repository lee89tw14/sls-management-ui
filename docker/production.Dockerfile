FROM node:22-alpine

WORKDIR /app

COPY html/build/ /app/
COPY html/run.mjs html/runtime-config.mjs html/static-server.mjs /opt/sls-ui/

USER node
EXPOSE 3000

CMD ["node", "/opt/sls-ui/run.mjs"]
