# Git Branching Strategy

This project uses the **Git Flow** branching model to manage development, testing, and releases.

---

## Branch Overview

```
main ─────────────────────────────────────────────── Production
  │                                        ▲    ▲
  │                                        │    │
  │    release/* ──────────────────────────►│    │
  │        ▲                                     │
  │        │                                     │
  │    develop ──────────────────────────────     │
  │        ▲         ▲        ▲                  │
  │        │         │        │                  │
  │    feature/A  feature/B  feature/C           │
  │                                              │
  └── hotfix/* ──────────────────────────────────►┘
```

---

## Branch Descriptions

### `main`
- **Purpose**: Production-ready code
- **Protected**: Yes — no direct commits
- **Merges from**: `release/*`, `hotfix/*`
- **Deploys to**: Production

### `develop`
- **Purpose**: Integration branch for active development
- **Merges from**: `feature/*`, `hotfix/*`, `release/*`
- **Branched from**: `main` (initially)
- **Deploys to**: Development environment

### `staging`
- **Purpose**: Pre-production testing and QA
- **Merges from**: `develop` or `release/*`
- **Deploys to**: Staging environment

### `feature/*`
- **Purpose**: Developing new features or enhancements
- **Branched from**: `develop`
- **Merges into**: `develop`
- **Naming**: `feature/<short-description>` (e.g., `feature/stock-chart`, `feature/user-auth`)
- **Lifecycle**: Created for each new feature, deleted after merge

### `release/*`
- **Purpose**: Preparing a new production release (version bumps, final fixes)
- **Branched from**: `develop`
- **Merges into**: `main` AND `develop`
- **Naming**: `release/<version>` (e.g., `release/1.0.0`, `release/1.2.0`)
- **Lifecycle**: Created when `develop` is ready, deleted after merge

### `hotfix/*`
- **Purpose**: Urgent fixes for production bugs
- **Branched from**: `main`
- **Merges into**: `main` AND `develop`
- **Naming**: `hotfix/<short-description>` (e.g., `hotfix/login-crash`, `hotfix/api-fix`)
- **Lifecycle**: Created for critical fixes, deleted after merge

---

## Workflows

### Starting a New Feature

```bash
# 1. Make sure develop is up to date
git checkout develop
git pull origin develop

# 2. Create a feature branch
git checkout -b feature/my-new-feature

# 3. Work on the feature (commit regularly)
git add .
git commit -m "feat: add stock price chart component"

# 4. Push to remote
git push origin feature/my-new-feature

# 5. Create a Pull Request to develop
# 6. After review & approval, merge into develop
# 7. Delete the feature branch
```

### Creating a Release

```bash
# 1. Branch from develop
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# 2. Final testing, version bumps, minor fixes
git commit -m "chore: bump version to 1.0.0"

# 3. Merge into main
git checkout main
git merge release/1.0.0
git tag -a v1.0.0 -m "Release 1.0.0"

# 4. Merge back into develop
git checkout develop
git merge release/1.0.0

# 5. Push everything
git push origin main develop --tags

# 6. Delete release branch
git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

### Applying a Hotfix

```bash
# 1. Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix the issue
git commit -m "fix: resolve critical login crash"

# 3. Merge into main
git checkout main
git merge hotfix/critical-bug
git tag -a v1.0.1 -m "Hotfix 1.0.1"

# 4. Merge into develop
git checkout develop
git merge hotfix/critical-bug

# 5. Push everything
git push origin main develop --tags

# 6. Delete hotfix branch
git branch -d hotfix/critical-bug
git push origin --delete hotfix/critical-bug
```

---

## Branch Protection Rules (Recommended)

| Branch    | Direct Push | PR Required | Reviews Required | CI Must Pass |
|-----------|:-----------:|:-----------:|:----------------:|:------------:|
| `main`    | No          | Yes         | 1+               | Yes          |
| `develop` | No          | Yes         | 1+               | Yes          |
| `staging` | No          | Yes         | Optional         | Yes          |

---

## Naming Conventions

| Type    | Pattern                         | Example                       |
|---------|---------------------------------|-------------------------------|
| Feature | `feature/<description>`         | `feature/stock-watchlist`     |
| Bugfix  | `fix/<description>`             | `fix/api-timeout`             |
| Hotfix  | `hotfix/<description>`          | `hotfix/login-crash`          |
| Release | `release/<semver>`              | `release/1.2.0`              |
| Docs    | `docs/<description>`            | `docs/api-reference`          |
| Chore   | `chore/<description>`           | `chore/update-dependencies`   |

---

## Commit Message Format

```
<type>: <short summary in imperative mood>

[optional body with more detail]

[optional footer: references, breaking changes]
```

### Types

| Type       | Description                                    |
|------------|------------------------------------------------|
| `feat`     | A new feature                                  |
| `fix`      | A bug fix                                      |
| `docs`     | Documentation changes only                     |
| `style`    | Code style (formatting, missing semicolons)    |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                        |
| `test`     | Adding or updating tests                       |
| `chore`    | Build process, tooling, or dependency updates  |

### Examples

```
feat: add real-time stock price ticker
fix: resolve market data API connection timeout
docs: update branching strategy documentation
refactor: extract chart rendering into separate module
```

---

## Visual Summary

```
          main ◄──── hotfix/* (urgent fixes)
            │              │
            ▼              ▼
         tag v1.0    tag v1.0.1
            │
            ▼
       release/* ──► staging (QA testing)
            ▲
            │
         develop ◄── feature/* (new features)
```
