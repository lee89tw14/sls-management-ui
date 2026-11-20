# SLS Management UI

Web UI for [SRT Live Server](https://github.com/OpenIRL/srt-live-server): manage publisher/player stream IDs, view live publisher statistics and copy the SRT / SRTLA / statistics URLs.

The production image serves a static build. Deployment settings are read from environment variables when the container starts and handed to the browser as `/config.js`, so one image works for every deployment. The container writes nothing to disk and runs with `--read-only` and any `--user`.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `API_HOST` | automatic | Where the browser sends `/api`, `/health` and `/stats` requests. |
| `STATS_HOST` | `API_HOST` | Base of the statistics links shown in the UI (e.g. for NOALBS). |
| `SRT_HOST` | host of `APP_URL`, else the page host | Host in `srt://` / `srtla://` URLs. Must reach the receiver's UDP ports. A port here is ignored; use the port variables. |
| `APP_URL` | – | Legacy all-in-one value; sets all three above unless they are set individually. |
| `SRT_PLAYER_PORT` / `SRT_SENDER_PORT` | `4000` / `4001` | SRT ports in the generated URLs. |
| `SLS_STATS_PORT` | `8080` | SLS HTTP API port, used for automatic API detection and bare hosts. |
| `SRTLA_PORT` | – | SRTLA port; SRTLA URLs are hidden when empty. |

Host values accept a full `http(s)://` URL (`https://api.example.com`, `http://10.0.0.5:8080/sls`) or a bare host (`10.0.0.5`, `api.example.com:8080`); bare hosts without a port get `SLS_STATS_PORT`. One pair of surrounding quotes is removed (as left by `docker run --env-file`). Anything else is ignored with a warning. The older `REACT_APP_*` names are still accepted.

Automatic API detection, when neither `API_HOST` nor `APP_URL` is set:

- Plain-HTTP page opened via an IP, `localhost` or an explicit port (`http://192.168.1.10:3000`, `http://box.tailnet.ts.net:3000`): the API is `http://<same host>:SLS_STATS_PORT`.
- Any HTTPS page, or a host name without a port (`https://srt.example.com`, `https://srt.example.com:8443`): the API is the same origin, so a reverse proxy or tunnel must forward `/api`, `/health` and `/stats` to SLS. (SLS only speaks plain HTTP, which an HTTPS page may not call.) Set `SRT_HOST` in this setup, because HTTP proxies and tunnels do not carry SRT's UDP traffic.

The Settings dialog shows the resolved API URL, SRT host, where each value came from, and any configuration warnings.

## Upgrading from 0.1.x

- The stream URLs dialog now lists two statistics links. **Statistics (NOALBS 2.14+)** is the current SLS format (NOALBS stream server type `OpenIRL`). **Statistics (legacy, NOALBS < 2.14)** is the previous `?legacy=1` link (type `SrtLiveServer`); SLS 1.5.2 still answers it but marks it deprecated. If you copy links into an older NOALBS, use the legacy one.
- When `APP_URL` is a full URL, statistics links use it as given (scheme and port included), exactly like the API requests. Previously the stats link always used `http://<host of APP_URL>:SLS_STATS_PORT`. With the srtla-receiver default (`APP_URL=http://<ip>:8080`) the result is the same.
- New stream IDs may only contain letters, digits and `. _ ~ - /` (max. 512 characters). Existing IDs are untouched; IDs are URL-encoded wherever they appear in a link.

## Development

```sh
cp .env.example .env
./develop install          # npm install in the node container
./develop up               # Vite dev server on http://localhost:3000
./develop npm test         # unit tests (Vitest)
./develop npm run lint     # ESLint
./develop npm run build    # type-check + production build into html/build
```

The dev and preview servers answer only `localhost` and IP addresses. To open them via a host name (e.g. a Tailscale name), set `DEV_ALLOWED_HOSTS=box.tailnet.ts.net` (comma-separated; a leading dot allows subdomains).

Without Docker, run the same `npm` scripts in `html/` with Node.js ≥ 22.13.

## CI and releases

Every push runs lint, tests, the production build, an image smoke test (`--read-only`, arbitrary uid) and an image vulnerability scan; `npm audit` runs as a separate job and weekly.

A push to `main` that passes these checks publishes `ghcr.io/<owner>/<repo>:main` and `:sha-<commit>`. To release, bump `version` in `html/package.json` and merge to `main`: the version not yet tagged is published as `:<version>` plus `:latest`, and the git tag and GitHub release are created. Versions with a suffix (`0.3.0-beta.1`) become pre-releases and do not move `:latest`. Deployments should pin `:<version>`.
