## 1. Proposal Acceptance Criteria
- [x] 1.1 Confirm deployment should never run on `pull_request`
- [x] 1.2 Confirm GHCR chart/image ownership org/user (runner-local)
- [x] 1.3 Decide whether digest-pinned images are required for prod

## 2. CI Workflow Refactor (GHCR-only)
- [x] 2.1 Remove non-GHCR registry support (hosts injection, insecure flags, custom host)
- [x] 2.2 Push API/Web images to GHCR
- [x] 2.3 Push Helm chart to GHCR as OCI artifact
- [x] 2.4 Export image identifiers (tags and/or digests) as job outputs

## 3. CD “Deploy Signal” Job
- [x] 3.1 Add deploy job on `[self-hosted, linux]` that invokes `/home/github-runner/deploy.sh`
- [x] 3.2 Pass `--app`, `--chart`, `--chart-version`, `--images` only
- [x] 3.3 Ensure deploy job only runs on trusted refs (`push` to protected branch, tags, or manual dispatch)

## 4. Runner Contract & Docs
- [x] 4.1 Document `deploy.sh` argument contract
- [x] 4.2 Document required runner-local configuration (GHCR auth, kube auth, app mapping)
- [x] 4.3 Update `CLAUDE.md` and `docs/` if behavior changes
