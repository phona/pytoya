# Change: Database Schema & TypeORM Setup

## Why
Current application uses YAML files for data storage. To enable relational queries, data integrity, and web-based management, the application needs a proper database with TypeORM for type-safe database operations.

## What Changes
- Design PostgreSQL database schema (users, projects, groups, manifests, providers, prompts, jobs)
- Create TypeORM entities with TypeScript types
- Write database migrations using TypeORM migrations
- Set up database connection in NestJS
- Configure TypeORM module in NestJS application
- Create database configuration service

## Impact
- Affected specs: New database-persistence capability
- Affected code: No existing code (new capability)
