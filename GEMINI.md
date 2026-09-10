# Project Context & Guidelines (GEMINI.md)

This document contains team-shared architectural patterns, guidelines, directory structures, and workflows for **Relay** (also known as PerusCord / Foco Desktop). It serves as the source of truth for the Gemini CLI and any developers working on this repository.

Trazer explicações em portgues sobre suas alterações.

---

## 1. Workspace Architecture

Relay is a monorepo configured with **npm workspaces** and **Turborepo** (`turbo.json`).

```
.
├── apps/
│   ├── api/          # NestJS (TypeScript) Backend
│   ├── client/       # Flutter Multiplatform Client (Android, iOS, Web, Desktop)
│   └── desktop/      # Electron Desktop wrapper around Flutter Web build
├── packages/
│   ├── permissions/  # Custom Bitfield RBAC Engine
│   └── shared-types/ # Shared TypeScript types across backend and web
├── infra/
│   └── docker/       # Local infrastructure (PostgreSQL, Redis, MinIO, LiveKit)
└── package.json      # Monorepo configuration and workspace scripts
```

### Key Sub-Projects

1. **`@relay/api` (`apps/api`)**
   - **Framework:** NestJS (TypeScript) in a modular monolith architecture.
   - **Database & ORM:** PostgreSQL using Prisma.
   - **Caching & Pub-Sub:** Redis with Socket.IO Redis adapter for horizontal scaling.
   - **Security:** Argon2id (hashing), JWT (short-lived access token + rotating refresh token), TOTP/MFA (using `otplib`).
   - **Voice & Video:** Self-hosted WebRTC via LiveKit Server SDK.

2. **`relay_client` (`apps/client`)**
   - **Framework:** Flutter SDK (Dart) for multiplatform capabilities.
   - **State Management:** Riverpod (`flutter_riverpod`).
   - **Routing:** `go_router`.
   - **Networking:** Dio (HTTP client with automatic JWT token refresh) & `socket_io_client` (WS).
   - **Security:** Secure storage of refresh tokens via `flutter_secure_storage`.
   - **Voice & Video:** Integrated WebRTC via `livekit_client` and `flutter_webrtc`.

3. **`@relay/desktop` (`apps/desktop`)**
   - **Framework:** Electron.
   - **Source:** Points to the web-compiled output of the Flutter client (`apps/client/build/web`) packed as an NSIS installer for Windows and native packages for macOS/Linux.

4. **`@relay/permissions` (`packages/permissions`)**
   - **Role:** Direct bitfield-based Role-Based Access Control (RBAC). Used heavily in both API and TypeScript packages to evaluate member privileges on channels, categories, and servers.

5. **`@relay/shared-types` (`packages/shared-types`)**
   - **Role:** Houses common TypeScript models, schemas, and event definitions shared between the API and helper services.

---

## 2. Core Engineering Standards

- **Strict Type Safety:** Never use bypass casts (`as any`, `@ts-ignore`) or disable/suppress compiler warnings unless explicitly commanded. Always compile/typecheck TS packages.
- **Composition over Inheritance:** Prefer explicit composition (wrappers, delegators, dependency injection) over complex inheritance hierarchies.
- **Architectural Alignments:** Keep NestJS controllers lean. Business logic lives in NestJS services. Use DTAs (`dto`) with `class-validator` for request payload validations.
- **Authentication Safeguards:**
  - Never log, print, or commit passwords, secrets, MFA secrets, or JWT tokens.
  - Access tokens are short-lived. Refresh tokens are rotating.
- **Permissions Rule:** Always enforce bitfield permission checks (using `@relay/permissions`) when acting on server resources, channels, categories, messages, and role adjustments.

---

## 3. Essential Workspace Scripts

Run commands from the monorepo root whenever possible using npm workspaces/Turborepo:

### Workspace-Wide Setup
- **Install dependencies:** `npm install`
- **Subir Infraestrutura Local:** `docker compose -f infra/docker/docker-compose.yml up -d`

### Backend (`apps/api`) Development
- **Dev Mode (Watch):** `npm run dev -w apps/api` (runs `nest start --watch`)
- **Database Tools:**
  - Generate Prisma Client: `npm run db:generate`
  - Run Migrations: `npm run db:migrate`
  - Open DB Studio: `npm run db:studio`
- **Testing:**
  - Unit Tests: `npm run test -w apps/api`
  - End-to-End Tests: `npm run test:e2e -w apps/api`

### Mobile & Web Client (`apps/client`) Development
- **Run Web Client:** `flutter run -d chrome` (from `apps/client` directory)
- **Build Web Release:** `flutter build web --release` (from `apps/client` directory) - *Note: Required before packaging Electron app.*

### Desktop App Wrapper (`apps/desktop`) Development
- **Start Electron Dev:** `npm run start -w apps/desktop`
- **Package for Release:** `npm run dist -w apps/desktop`

---

## 4. Environment & Secrets Management

Prisma and NestJS resolve environment variables locally from each app, not from the root.

### NestJS API `.env` Configuration
1. Copy `.env.example` to `apps/api/.env`:
   ```bash
   cp .env.example apps/api/.env
   ```
2. Generate secure local secrets:
   - For `JWT_ACCESS_SECRET` (generate 48-byte key): `openssl rand -base64 48`
   - For `MFA_ENCRYPTION_KEY` (generate 32-byte key): `openssl rand -base64 32`
3. Edit other configuration parameters (PostgreSQL connection strings, Redis host, MinIO secrets, LiveKit endpoints) inside `apps/api/.env`.

---

## 5. Testing & Validation Guidelines

Every new feature, API route, or bug fix is considered **incomplete without verification logic**.

- **Bug Fixes:** Empirically reproduce the error using a dedicated test case or script before implementing a solution.
- **Backend Tests:** Add corresponding unit tests in `.spec.ts` files or integration tests in `apps/api/test/` (e.g. `auth.e2e-spec.ts`).
- **Prerun Checks:** Before finalizing changes, run:
  ```bash
  npm run typecheck   # Validate TS compile integrity across workspaces
  npm run lint        # Check code quality constraints
  npm run test        # Validate all unit tests
  ```
- **Flutter Code Testing:** Add unit or widget tests in `apps/client/test/`.
