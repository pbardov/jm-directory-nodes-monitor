# JoinMarket Directory Nodes Monitor

This project monitors JoinMarket onion directory nodes and publishes a static
status page with machine-readable JSON data.

It has two parts:

- a runtime container for a VPS, deployed with Docker Compose, that polls
  directory nodes through Tor, logs results, aggregates history, and publishes
  generated files to a dedicated Git branch with a force push;
- a static web UI that reads `data/latest.json` and `data/history.json` and is
  published to GitHub Pages by GitHub Actions from the publication branch.

## Runtime

The monitor talks to JoinMarket directory nodes directly over the onion message
protocol:

1. connect to `<node>.onion:5222` through a Tor SOCKS5 proxy;
2. send a non-directory JoinMarket handshake;
3. publish `!orderbook`;
4. collect offer and fidelity-bond replies for a bounded time window.

The container defaults to `network_mode: host`, so it can use Tor already
running on the deployment host at `127.0.0.1:9050`.

```bash
cp .env.example .env
docker compose up -d --build
```

Run one local probe without publishing:

```bash
python3 -m monitor run-once --nodes-file config/nodes.example.json
```

## Publication

Generated output is written to `web/data/` and then copied to a temporary
publication worktree. The publisher creates a single commit and force-pushes it
to `PUBLICATION_BRANCH`, so the publication branch does not accumulate history.

Required environment for publishing:

- `PUBLISH_ENABLED=true`
- `PUBLISH_REMOTE_URL=git@github.com:pbardov/jm-directory-nodes-monitor.git`
- `PUBLICATION_BRANCH=pages`

The Docker image contains `git`, `ssh`, and `gh`. The Compose file mounts the
host paths configured by `SSH_DIR` and `GH_CONFIG_DIR` read-only so the
container can use existing GitHub authentication.

## JSON Outputs

- `web/data/latest.json` contains the latest run, per-node results, and summary.
- `web/data/history.json` contains bounded historical samples for charting.
- `data/probes.jsonl` contains append-only runtime logs inside the container
  data volume.

## Deploy

The parent repository contains the `directory_nodes_monitor` Ansible role and
`ansible/playbooks/directory_nodes_monitor.yml`. Run it through `ansiblew`, not
directly through `ansible-playbook`.
