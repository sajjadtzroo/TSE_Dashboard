# CLAUDE.md - TSE Dashboard

## Project Overview

TSE Dashboard is a Tehran Stock Exchange (TSE) dashboard application for monitoring and analyzing stock market data.

## Repository Info

- **Repo**: `sajjadtzroo/TSE_Dashboard`
- **License**: MIT
- **Primary Language**: TBD (project in initial setup phase)

## Git Branching Model

This project follows the **Git Flow** branching strategy:

- `main` — Production-ready, stable releases only
- `develop` — Active development integration branch
- `staging` — Pre-production testing
- `feature/*` — New features (branch from `develop`)
- `release/*` — Release prep (branch from `develop`, merge to `main` + `develop`)
- `hotfix/*` — Urgent production fixes (branch from `main`, merge to `main` + `develop`)

See [GIT_BRANCHING.md](./GIT_BRANCHING.md) for full details.

## Development Workflow

1. Always branch from `develop` for new features
2. Use descriptive branch names: `feature/add-stock-chart`, `fix/api-timeout`
3. Keep commits small and focused
4. Write clear commit messages in imperative mood

## Commit Message Convention

```
<type>: <short summary>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`

## Code Guidelines

- Keep code clean and well-structured
- Follow the existing project conventions
- Do not commit secrets, API keys, or credentials
- Do not commit `node_modules/` or `.env` files

## Important Paths

```
/                    — Project root
├── CLAUDE.md        — This file (project instructions for Claude)
├── GIT_BRANCHING.md — Git branching strategy documentation
├── README.md        — Project readme
├── LICENSE          — MIT License
└── .gitignore       — Git ignore rules
```
