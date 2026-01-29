# cicd Specification

## Purpose
Define a secure, minimal CI/CD workflow that publishes artifacts to GHCR and signals deployment via a runner-local script.

## Requirements

### Requirement: GHCR-Only Artifact Publishing
The CI pipeline SHALL publish Docker images and Helm charts to GitHub Container Registry (`ghcr.io`) only.

#### Scenario: Push images to GHCR on trusted refs
- **GIVEN** the workflow runs on a trusted ref (protected branch, tag, or manual dispatch)
- **WHEN** images are built
- **THEN** images SHALL be pushed to `ghcr.io`
- **AND** the workflow SHALL export immutable image identifiers (tag and/or digest) for downstream deploy steps

#### Scenario: Push Helm chart to GHCR as OCI artifact
- **GIVEN** the workflow runs on a trusted ref
- **WHEN** the Helm chart is packaged
- **THEN** the chart SHALL be pushed to `ghcr.io` as an OCI artifact
- **AND** the workflow SHALL record the chart version used for deployment

### Requirement: Deploy Is A Runner-Local Signal
The deploy job SHALL invoke a runner-local script to signal deployment with minimal, immutable inputs.

#### Scenario: Deploy job calls deploy-pytoya.sh with stable contract
- **GIVEN** the deploy job runs on a self-hosted runner
- **WHEN** deployment is triggered
- **THEN** the job SHALL invoke `/home/github-runner/deploy-pytoya.sh`
- **AND** the invocation SHALL pass only:
  - `--chart oci://ghcr.io/<ORG>/charts/<chartId>`
  - `--chart-version <version>`
  - `--images '<json>'`

#### Scenario: Deploy does not run on pull requests
- **GIVEN** the workflow is triggered by `pull_request`
- **WHEN** jobs are evaluated
- **THEN** no job SHALL invoke `/home/github-runner/deploy-pytoya.sh`

### Requirement: CI/CD Avoids Registry And Host Mutation
The CI/CD workflow SHALL avoid mutating runner host configuration for registry access.

#### Scenario: No insecure registry or hosts injection steps
- **WHEN** the workflow runs
- **THEN** it SHALL NOT modify `/etc/hosts`
- **AND** it SHALL NOT enable Docker insecure registries
- **AND** it SHALL NOT use registry hosts other than `ghcr.io`
