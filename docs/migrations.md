# Prisma Migrations

## How It Works

1. You edit `prisma/schema.prisma`
2. You run `npm run db:migrate` — this generates a new SQL migration file and applies it to your local DB
3. You commit the generated `prisma/migrations/<timestamp>_<name>/migration.sql`
4. In Docker, `prisma migrate deploy` runs on startup and applies any pending migrations

## Creating a Migration

```sh
npm run db:migrate
```

Prisma will prompt you for a migration name (e.g. `add_user_avatar`). This creates `prisma/migrations/<timestamp>_add_user_avatar/migration.sql`.

## Deploying

Both `Dockerfile` and `Dockerfile.dev` run `prisma migrate deploy` on container start. This only applies migrations that haven't been applied yet.

## Key Rules

- **Always** commit migration files to version control
- **Never** edit a migration file after it has been applied to any environment
- Run `npm run db:migrate` locally, not in Docker — Docker only runs `deploy`
