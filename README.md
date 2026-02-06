# Tokamak Forge — Autonomous Multi-Agent Game Builder

> **"What if a team of AI agents could build an entire game from scratch, with zero human intervention?"**

Tokamak Forge is an autonomous multi-agent system where multiple Claude instances collaborate in parallel to build complete HTML5 games — from specification to playable result — without any human coding.

## Inspiration

This project was inspired by Anthropic's engineering blog post [**"How we built a C compiler using Claude as our coding agent"**](https://www.anthropic.com/engineering/building-c-compiler), where a team of 16 parallel Claude instances autonomously built a 100,000-line C compiler capable of compiling the Linux kernel.

The key insight from that work was compelling: **agents coordinating through git — with no central orchestrator — can tackle complex software projects.** Each agent reads a shared constitution (`CLAUDE.md`), claims tasks via file-based locking, implements code, runs tests, and pushes to a shared repository. The result is emergent collaboration that mirrors how human development teams work.

We wanted to test this approach in a different domain: **Can AI agents autonomously build playable games?** Tokamak Forge is our answer.

## How It Works

```
You type a game name → Multiple Claude agents autonomously build it
```

1. **Scaffolding** — `forge.sh` creates a bare git repo with a game template, agent constitution (`CLAUDE.md`), and test infrastructure
2. **Spec Generation** — Claude writes a detailed game specification (`SPEC.md`) with rules, controls, modules, and visual design
3. **Parallel Development** — N autonomous Claude agents launch in Docker containers, each with its own workspace
4. **Emergent Collaboration** — Agents coordinate solely through git: push, pull, rebase. No central orchestrator
5. **Real-time Monitoring** — A live dashboard shows agent status, commits, tasks, and progress

**No central orchestrator.** Each agent reads `CLAUDE.md` (the "constitution") and autonomously:
- Finds the next task (failing tests → unimplemented features → improvements)
- Claims the task via file-based locking (`current_tasks/`)
- Implements, tests, commits, and pushes
- Repeats

### Dashboard

The real-time dashboard at `http://localhost:3000` provides full visibility into the autonomous build process:

<p align="center">
  <img src="docs/dashboard-agents.png" alt="Tokamak Forge Dashboard — Agent status, progress, timeline, and live logs" width="900">
</p>

- **Agent Status** — See which agents are working, idle, or resolving conflicts
- **Progress** — Track commits (93), lines of code (1,234), and tasks completed (32)
- **Timeline** — Git commit history with per-agent attribution
- **Live Logs** — Real-time streaming output from each agent

## First Game: Ping Pong

The first game built entirely by AI agents was **Ping Pong** — a classic arcade game with player vs CPU gameplay.

**3 agents. 93 commits. 1,234 lines. 32 tasks. Fully autonomous.**

### Play It

Open [`games/pingpong/index.html`](games/pingpong/index.html) in your browser to play the game built by our AI agents.

### Features (all implemented by agents)

- Player vs CPU with configurable AI difficulty (Easy / Medium / Hard)
- Angle-based ball deflection depending on paddle hit position
- Progressive ball speed increase during rallies
- Game states: Menu → Playing → Paused → Point Scored → Game Over
- Retro arcade visual style with neon glow effects
- First to 11 points wins

### Controls

| Key | Action |
|-----|--------|
| `W` / `Arrow Up` | Move paddle up |
| `S` / `Arrow Down` | Move paddle down |
| `Space` | Start / Restart |
| `P` | Pause |
| `1` `2` `3` | Set difficulty (Easy / Medium / Hard) |

### Game Architecture (designed and built by agents)

```
games/pingpong/
├── index.html       # Entry point
├── main.js          # Game loop & state machine
├── ball.js          # Ball physics & movement
├── paddle.js        # Paddle entity & bounds
├── collision.js     # AABB collision detection & response
├── ai.js            # CPU opponent with difficulty levels
├── input.js         # Keyboard input handler
├── renderer.js      # Canvas rendering & UI screens
├── score.js         # Score tracking & match logic
└── game.js          # Game state factory
```

## Quick Start

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Build a game with 3 agents
./forge.sh tetris 3
```

This will:
1. Create a bare git repo with game scaffolding
2. Generate a detailed game specification using Claude
3. Launch 3 autonomous Claude agents in Docker containers
4. Open a real-time dashboard at http://localhost:3000

## Architecture

```
forge.sh                     # Entry point
├── Creates bare git repo    # Shared via Docker volume
├── Scaffolds project        # CLAUDE.md, SPEC.md, src/, tests/
├── Generates SPEC.md        # Claude writes game specification
└── docker-compose up        # Launches N agents + dashboard

Each agent container:
├── Clones repo              # Own working copy
├── Reads CLAUDE.md          # Determines next action
├── Runs Claude CLI          # Autonomous coding
├── Tests → Commits → Pushes # Git-based coordination
└── Loops                    # Every 5 seconds
```

## Project Structure

```
tokamak-agent-teams/
├── forge.sh                  # Bootstrap script
├── docker/
│   ├── Dockerfile            # Agent container image
│   ├── docker-compose.yml    # Multi-agent orchestration
│   └── agent-loop.sh         # Agent loop script
├── templates/
│   ├── CLAUDE.md.template    # Agent constitution
│   ├── SPEC.md.template      # Game spec template
│   ├── tests/
│   │   ├── base-test.js      # Test utilities
│   │   └── run-tests.sh      # Test runner
│   └── src/
│       └── index.html        # HTML template
├── dashboard/
│   ├── Dockerfile            # Dashboard container
│   ├── server.js             # WebSocket server
│   ├── watcher.js            # Repo watcher
│   └── index.html            # Dashboard UI
├── games/
│   └── pingpong/             # First game built by agents
└── docs/
    └── dashboard-agents.png  # Dashboard screenshot
```

## Commands

```bash
# Launch with custom agent count
./forge.sh tetris 5

# View agent logs
docker compose -f docker/docker-compose.yml logs -f

# Stop all agents
docker compose -f docker/docker-compose.yml down

# Check game progress
cd /tmp/tokamak-forge-work/<game>/project && bash tests/run-tests.sh
```

## Requirements

- Docker & Docker Compose
- `ANTHROPIC_API_KEY` environment variable
- Claude Code CLI (installed inside container)

## References

- [How we built a C compiler using Claude as our coding agent](https://www.anthropic.com/engineering/building-c-compiler) — Anthropic Engineering Blog
