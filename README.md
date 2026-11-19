# SLS Management UI

Web UI for [SRT Live Server](https://github.com/OpenIRL/srt-live-server): manage publisher/player stream IDs, view live publisher statistics and copy the SRT / SRTLA / statistics URLs.

The production image serves a static build. Deployment settings are read from environment variables when the container starts and handed to the browser as `/config.js`, so one image works for every deployment.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `API_HOST` | automatic | Where the browser sends `/api`, `/health` and `/stats` requests. |
| `STATS_HOST` | `API_HOST` | Base of the statistics links shown in the UI (e.g. for NOALBS). |
| `SRT_HOST` | host of `APP_URL`, else the page host | Host in `srt://` / `srtla://` URLs. Must reach the receiver's UDP ports. |
| `APP_URL` | – | Legacy all-in-one value; sets all three above unless they are set individually. |
| `SRT_PLAYER_PORT` / `SRT_SENDER_PORT` | `4000` / `4001` | SRT ports in the generated URLs. |
| `SLS_STATS_PORT` | `8080` | SLS HTTP API port, used for automatic API detection and bare hosts. |
| `SRTLA_PORT` | – | SRTLA port; SRTLA URLs are hidden when empty. |

Host values accept a full URL (`https://api.example.com`, `http://10.0.0.5:8080`) or a bare host (`10.0.0.5`, `api.example.com:8080`). The older `REACT_APP_*` names are still accepted.

Automatic API detection, when neither `API_HOST` nor `APP_URL` is set:

- Page opened via an IP, `localhost` or an explicit port (`http://192.168.1.10:3000`, `http://box.tailnet.ts.net:3000`): the API is `http://<same host>:SLS_STATS_PORT`.
- Page opened via a host name without a port (`https://srt.example.com`): the API is the same origin, so a reverse proxy or tunnel must forward `/api`, `/health` and `/stats` to SLS. Set `SRT_HOST` in this setup, because HTTP proxies and tunnels do not carry SRT's UDP traffic.

The Settings dialog shows the resolved API URL, SRT host, where each value came from, and any configuration warnings.

## Development

```sh
cp .env.example .env
./develop install          # npm install in the node container
./develop up               # Vite dev server on http://localhost:3000
./develop npm test         # unit tests (Vitest)
./develop npm run lint     # ESLint
./develop npm run build    # type-check + production build into html/build
```

Without Docker, run the same `npm` scripts in `html/` with Node.js ≥ 22.12.
