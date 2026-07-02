# Prisma ORM Setup

This project uses Prisma ORM for database management. Prisma provides type-safe database access with an intuitive API.

## Installation

Prisma dependencies are already installed:
- `@prisma/client` - Prisma Client for database queries
- `prisma` - Prisma CLI for migrations and schema management

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
```

For PostgreSQL connection strings, use the format:
```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]
```

**SSL (e.g. AWS RDS):** When connecting with `sslmode=verify-full` (or `require`/`verify-ca`), the app verifies the server certificate. The app uses `verify-full` when building the URL from env vars (encryption + CA verification + hostname verification). Optional:

- `DATABASE_SSL_CA` – Path to a PEM file (e.g. [RDS global bundle](https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem)).
- `DATABASE_SSL_CA_PEM` – PEM content (e.g. from Secrets Manager). Overrides `DATABASE_SSL_CA` when both are set.

The production Docker image includes the RDS global CA at `/app/certs/rds-global-bundle.pem`, so no extra env is needed for ECS → RDS. For local or custom deployments, set `DATABASE_SSL_CA` or `DATABASE_SSL_CA_PEM` if your system trust store does not include the RDS CA.

### Configuration Files

**Prisma 7 Configuration:**

In Prisma 7, the database URL is configured in `prisma.config.ts` instead of the schema file:

- `prisma.config.ts` - Contains the datasource URL configuration
- `prisma/schema.prisma` - Defines database models and relationships (without URL)

The `PrismaService` automatically reads the `DATABASE_URL` from environment variables via NestJS's `ConfigService`.

## Usage

### Generate Prisma Client

After modifying the schema, generate the Prisma Client:

```bash
npm run prisma:generate
```

This command runs automatically after `npm install` via the `postinstall` script.

### Database Migrations

Create a new migration:

```bash
npm run prisma:migrate
```

This will:
1. Create a new migration file
2. Apply the migration to your database
3. Regenerate Prisma Client

Deploy migrations (for production):

```bash
npm run prisma:migrate:deploy
```

### Using Prisma in Services

The `PrismaService` is globally available. Inject it into your services:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class MyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async create(data: { email: string; name: string }) {
    return this.prisma.user.create({ data });
  }
}
```

### Prisma Studio

Open Prisma Studio to view and edit data in your database:

```bash
npm run prisma:studio
```

This opens a web interface at `http://localhost:5555`.

## Available Scripts

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Create and apply a new migration
- `npm run prisma:migrate:deploy` - Deploy migrations (production)
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:format` - Format the Prisma schema
- `npm run prisma:validate` - Validate the Prisma schema

## Example: Creating a Model

1. Add a model to `prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

2. Create and apply the migration:

```bash
npm run prisma:migrate
```

3. Use the model in your service:

```typescript
const users = await this.prisma.user.findMany();
```

## Module Structure

- `src/prisma/prisma.service.ts` - Prisma service that extends PrismaClient
- `src/prisma/prisma.module.ts` - Global Prisma module
- `prisma/schema.prisma` - Prisma schema definition

The Prisma module is automatically imported in `AppModule` and is available globally throughout the application.
