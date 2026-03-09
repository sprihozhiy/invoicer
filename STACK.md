# STACK.md — Technology Requirements
# Single source of truth for all technology decisions in this project.
# Every agent reads this before writing any code or spec.
# Do not deviate. Do not introduce unlisted dependencies.
#
# Created by: Jeeves (during scoping) or tech-scout agent
# Approved by: Serhii
#
# Workflow:
#   1. Jeeves or tech-scout fills this file based on project requirements
#   2. Serhii reviews and approves (or edits) on Telegram
#   3. File is committed to project root — run-agent.sh copies it to every worktree
#   4. All agents treat this as law

# ══════════════════════════════════════════════════════════════════════════════
# PROJECT TYPE
# ══════════════════════════════════════════════════════════════════════════════
# Determines which sections below are active.
# Agents ignore sections not relevant to the project type.

PROJECT_TYPE=web-app
# Valid: web-app | mobile-app | cli-tool | desktop-app | api-only | library | monorepo
#
# web-app     → Frontend + Backend + Infrastructure sections active
# mobile-app  → Mobile + Backend + Infrastructure sections active
# cli-tool    → CLI + Infrastructure sections active
# desktop-app → Desktop + Backend (optional) + Infrastructure sections active
# api-only    → Backend + Infrastructure sections active (no frontend/UI)
# library     → Library + Infrastructure sections active
# monorepo    → All relevant sub-sections active; list packages in PROJECT-SPECIFIC

# ══════════════════════════════════════════════════════════════════════════════
# LANGUAGE & RUNTIME (all project types)
# ══════════════════════════════════════════════════════════════════════════════

LANGUAGE=javascript
# Valid: javascript | typescript | python | go | rust | java | kotlin | swift | dart | c-sharp | php

LANGUAGE_VERSION=ES2022
# For JS/TS: ES version or TS strict mode. For Python: 3.11, 3.12, etc.
# For Go: 1.22, etc. For Rust: edition 2021, etc.

RUNTIME=node
# Valid: node | bun | deno | python | go | dotnet | jvm | native | dart-vm
# "native" for compiled languages (Rust, Go, C) that produce binaries.

RUNTIME_VERSION=18
# Match CI. Do not use APIs above this version.

PACKAGE_MANAGER=npm
# Valid: npm | pnpm | yarn | pip | uv | poetry | cargo | go-modules | maven | gradle | pub | nuget | none

# ══════════════════════════════════════════════════════════════════════════════
# FRONTEND (web-app only)
# ══════════════════════════════════════════════════════════════════════════════
# Skip this section if PROJECT_TYPE is not web-app.

FRONTEND_FRAMEWORK=nextjs
FRONTEND_FRAMEWORK_VERSION=latest
# Valid: nextjs | remix | astro | vite-react | vite-vue | vite-svelte | nuxt | sveltekit | none

ROUTING=app-router
# Valid: app-router | pages-router | file-based | manual
# app-router = Next.js app/ directory. pages-router = Next.js pages/.
# file-based = framework-native (Remix, SvelteKit). manual = React Router, etc.

CSS_FRAMEWORK=tailwindcss
CSS_FRAMEWORK_VERSION=v4
# Valid: tailwindcss | css-modules | vanilla-css | sass | styled-components | emotion | none

UI_COMPONENT_LIBRARY=none
# Valid: none | shadcn-ui | radix-ui | headless-ui | mantine | chakra-ui | mui | ant-design
# "none" = build components from scratch with CSS framework.

ICON_LIBRARY=react-icons
# Valid: react-icons | lucide-react | heroicons | phosphor | tabler-icons | none

STATE_MANAGEMENT=react-hooks
# Valid: react-hooks | zustand | jotai | redux-toolkit | pinia | svelte-stores | signals | none

FORM_HANDLING=native
# Valid: native | react-hook-form | formik | vee-validate | superforms | none

DATA_FETCHING=fetch
# Valid: fetch | swr | tanstack-query | trpc-client | apollo-client | urql | none

ANIMATION=css
# Valid: css | framer-motion | gsap | motion-one | auto-animate | none

# ══════════════════════════════════════════════════════════════════════════════
# MOBILE (mobile-app only)
# ══════════════════════════════════════════════════════════════════════════════
# Skip this section if PROJECT_TYPE is not mobile-app.

MOBILE_FRAMEWORK=none
# Valid: react-native | expo | flutter | swift-ui | jetpack-compose | capacitor | none

MOBILE_NAVIGATION=none
# Valid: react-navigation | expo-router | go-router | native | none

MOBILE_STATE=none
# Valid: zustand | redux-toolkit | riverpod | provider | mobx | none

MOBILE_UI_LIBRARY=none
# Valid: none | native-base | tamagui | react-native-paper | gluestack

MOBILE_BUILD_TOOL=none
# Valid: expo-eas | xcode | android-studio | fastlane | codemagic | none

MOBILE_TARGET_PLATFORMS=none
# Valid: ios | android | both | none

MOBILE_MIN_OS=none
# Example: "iOS 16, Android 12" or "iOS 15+" or "none"

# ══════════════════════════════════════════════════════════════════════════════
# CLI TOOL (cli-tool only)
# ══════════════════════════════════════════════════════════════════════════════
# Skip this section if PROJECT_TYPE is not cli-tool.

CLI_FRAMEWORK=none
# Valid: commander | yargs | oclif | clap | cobra | click | typer | none
# commander/yargs/oclif = Node.js. clap = Rust. cobra = Go. click/typer = Python.

CLI_OUTPUT=none
# Valid: chalk | ora | ink | rich | colorama | termcolor | none
# Terminal styling and spinners.

CLI_DISTRIBUTION=none
# Valid: npm-global | binary | pip | homebrew | docker | none
# How users install the tool.

# ══════════════════════════════════════════════════════════════════════════════
# DESKTOP (desktop-app only)
# ══════════════════════════════════════════════════════════════════════════════
# Skip this section if PROJECT_TYPE is not desktop-app.

DESKTOP_FRAMEWORK=none
# Valid: electron | tauri | wails | flutter-desktop | swift-ui-macos | dotnet-maui | none

DESKTOP_TARGET_PLATFORMS=none
# Valid: macos | windows | linux | all | none

# ══════════════════════════════════════════════════════════════════════════════
# BACKEND (web-app, mobile-app, api-only, desktop-app if needed)
# ══════════════════════════════════════════════════════════════════════════════
# Skip this section if project has no server-side logic.

BACKEND_FRAMEWORK=nextjs-api-routes
# Valid: nextjs-api-routes | express | fastify | hono | koa | django | flask | fastapi |
#        gin | echo | fiber | actix-web | axum | spring-boot | dotnet-minimal-api | none

API_STYLE=rest
# Valid: rest | trpc | graphql | grpc | websocket | none

DATABASE=none
# Valid: none | postgresql | mysql | sqlite | mongodb | redis | supabase | firebase |
#        planetscale | turso | dynamodb | cockroachdb

ORM=none
# Valid: none | prisma | drizzle | knex | typeorm | sequelize | mongoose | sqlalchemy |
#        tortoise | diesel | gorm | ent | entity-framework

AUTH_PROVIDER=none
# Valid: none | next-auth | clerk | supabase-auth | lucia | firebase-auth | auth0 |
#        passport | custom-jwt | oauth-only

VALIDATION=zod
# Valid: zod | yup | joi | valibot | typebox | pydantic | marshmallow | none

FILE_STORAGE=none
# Valid: none | s3 | cloudflare-r2 | supabase-storage | firebase-storage | local | minio

EMAIL_SERVICE=none
# Valid: none | resend | sendgrid | ses | postmark | nodemailer | mailgun

PAYMENT_PROVIDER=none
# Valid: none | stripe | lemon-squeezy | paddle | paypal

QUEUE_SYSTEM=none
# Valid: none | bullmq | celery | rabbitmq | sqs | redis-streams
# For background jobs, async processing.

REALTIME=none
# Valid: none | websocket | sse | supabase-realtime | pusher | ably | socket-io

# ══════════════════════════════════════════════════════════════════════════════
# LIBRARY (library only)
# ══════════════════════════════════════════════════════════════════════════════
# Skip this section if PROJECT_TYPE is not library.

LIBRARY_TARGET=none
# Valid: npm | pypi | crates-io | go-modules | nuget | maven | none

LIBRARY_BUNDLER=none
# Valid: tsup | rollup | vite-lib | esbuild | setuptools | cargo | none

LIBRARY_TYPE_DEFS=none
# Valid: typescript | jsdoc | type-stubs | none

# ══════════════════════════════════════════════════════════════════════════════
# TESTING (all project types)
# ══════════════════════════════════════════════════════════════════════════════

TEST_RUNNER=vitest
# Valid: vitest | jest | mocha | pytest | go-test | cargo-test | junit | xcode-test |
#        flutter-test | dotnet-test | none

TEST_APPROACH=tdd
# Valid: tdd | tests-after | none
# tdd = spec-writer outputs test stubs per feature. Dev implements tests first,
#        then feature code. Tests must pass before committing.
# tests-after = dev writes tests after implementing.
# none = no tests (not recommended).

E2E_TESTING=none
# Valid: none | playwright | cypress | detox | maestro | appium
# detox/maestro/appium = mobile. playwright/cypress = web.

# ══════════════════════════════════════════════════════════════════════════════
# INFRASTRUCTURE (all project types)
# ══════════════════════════════════════════════════════════════════════════════

DEPLOY_TARGET=vercel
# Valid: vercel | netlify | railway | fly-io | render | aws-lambda | cloudflare-workers |
#        docker | kubernetes | app-store | play-store | homebrew | npm | pypi | none

CI_PROVIDER=github-actions
# Valid: github-actions | gitlab-ci | circleci | none

CI_RUNTIME_VERSION=18
# Runtime version used in CI. Must match RUNTIME_VERSION.

ENV_HANDLING=dotenv
# Valid: dotenv | t3-env | infisical | vault | none

MONOREPO_TOOL=none
# Valid: none | turborepo | nx | lerna | pnpm-workspaces

CONTAINERIZE=false
# Valid: true | false
# If true: Dockerfile required. Specify base image in PROJECT-SPECIFIC.

# ══════════════════════════════════════════════════════════════════════════════
# CODE QUALITY (all project types)
# ══════════════════════════════════════════════════════════════════════════════

LINTER=eslint
# Valid: eslint | biome | ruff | clippy | golangci-lint | pylint | none

FORMATTER=prettier
# Valid: prettier | biome | black | rustfmt | gofmt | none

# ══════════════════════════════════════════════════════════════════════════════
# [PROJECT-SPECIFIC]
# ══════════════════════════════════════════════════════════════════════════════
# Jeeves or tech-scout fills this section with project-specific details.
# Override any default above by repeating the key here.
# Add details that don't fit standard fields.
#
# Examples:
#
#   # ── Web SaaS app ──
#   DATABASE=postgresql
#   ORM=prisma
#   AUTH_PROVIDER=next-auth
#   AUTH_DETAILS=GitHub + Google OAuth. Session strategy: JWT.
#   ADDITIONAL_PACKAGES=date-fns, nanoid, @react-pdf/renderer
#
#   # ── React Native mobile app ──
#   PROJECT_TYPE=mobile-app
#   LANGUAGE=typescript
#   MOBILE_FRAMEWORK=expo
#   MOBILE_NAVIGATION=expo-router
#   MOBILE_BUILD_TOOL=expo-eas
#   MOBILE_TARGET_PLATFORMS=both
#   MOBILE_MIN_OS=iOS 16, Android 12
#   BACKEND_FRAMEWORK=fastapi
#   DATABASE=supabase
#
#   # ── Go CLI tool ──
#   PROJECT_TYPE=cli-tool
#   LANGUAGE=go
#   RUNTIME=go
#   RUNTIME_VERSION=1.22
#   PACKAGE_MANAGER=go-modules
#   CLI_FRAMEWORK=cobra
#   CLI_OUTPUT=termcolor
#   CLI_DISTRIBUTION=homebrew
#   TEST_RUNNER=go-test
#   LINTER=golangci-lint
#   FORMATTER=gofmt
#
#   # ── Python backend API ──
#   PROJECT_TYPE=api-only
#   LANGUAGE=python
#   RUNTIME=python
#   RUNTIME_VERSION=3.12
#   PACKAGE_MANAGER=uv
#   BACKEND_FRAMEWORK=fastapi
#   DATABASE=postgresql
#   ORM=sqlalchemy
#   VALIDATION=pydantic
#   TEST_RUNNER=pytest
#   LINTER=ruff
#   FORMATTER=black
#   DEPLOY_TARGET=docker
#
# ── Overrides ──────────────────────────────────────────────────────────────────
# (Jeeves or tech-scout writes project-specific values below this line)

# ── Detected from codebase (scan agent, 2026-03-08) ───────────────────────────

# Language is TypeScript strict, not plain JS
LANGUAGE=typescript
LANGUAGE_VERSION=ES2017
# tsconfig target is ES2017; strict: true; noEmit: true

# Next.js version locked
FRONTEND_FRAMEWORK_VERSION=16.1.6

# Icons: lucide-react is used, NOT react-icons (template default was wrong)
ICON_LIBRARY=lucide-react

# Validation: Zod schemas in lib/validators.ts (migrated from custom lib/validate.ts)
VALIDATION=zod

# Database: SQLite via better-sqlite3 + Drizzle ORM (migrated from in-memory store)
DATABASE=sqlite
ORM=drizzle

# Custom opaque token auth (not next-auth or clerk)
AUTH_PROVIDER=none
# AUTH_DETAILS: Custom httpOnly cookie auth. Access token: 15min TTL (prefix at_).
# Refresh token: 7-day TTL (prefix rt_), SHA-256 hashed before storage.
# Password: crypto.scryptSync with hardcoded salt "invoicer-salt". requireAuth()
# called per-handler — no middleware.ts exists.

# No email service — forgot-password generates token but never sends email
EMAIL_SERVICE=none

# No file storage — logo upload is a stub (fake CDN URL, file bytes discarded)
FILE_STORAGE=none

# Vitest for server-side unit/integration tests (Node environment)
TEST_RUNNER=vitest
TEST_APPROACH=tdd

# ── Additional packages ──
ADDITIONAL_PACKAGES=lucide-react@0.577.0, drizzle-orm@^0.38.0, better-sqlite3@^11.0.0, zod@^3.24.0
# @tailwindcss/postcss is the PostCSS plugin for Tailwind v4
# drizzle-kit, @types/better-sqlite3, vitest, @vitejs/plugin-react are in devDependencies

# ── Existing features ──
EXISTING_FEATURES=user-registration,user-login,session-refresh,forgot-password-token,reset-password,post-registration-onboarding,business-profile-crud,logo-upload-stub,client-crud-with-stats,invoice-creation,invoice-list-with-filters,invoice-detail-view,invoice-edit-draft,invoice-send,invoice-void,invoice-duplicate,invoice-soft-delete,invoice-pdf-download,payment-recording,payment-deletion,catalog-crud,dashboard-stats,landing-page,responsive-sidebar-layout,toast-notifications,modal-system,status-badge,ssrf-protection

# ── Critical architectural notes for agents ──
# 1. NO PERSISTENCE: InMemoryStore loses data on restart. Do not add DB migration logic.
# 2. MONEY IS CENTS: All amounts are integer cents. Use parseCents()/formatMoney().
# 3. @/* PATH ALIAS: Maps to project root. Use @/lib/... not relative paths from API routes.
# 4. TAILWIND V4: Use @import "tailwindcss" not @tailwind directives. No tailwind.config.js.
# 5. CSS VARIABLES: Use var(--accent-primary) etc for colors, not Tailwind color classes.
# 6. CLIENT COMPONENTS: All interactive pages use "use client". No RSC data fetching.
# 7. INVOICE STATUS: Stored as draft/sent/partial/paid/void. "overdue" computed on read.
# 8. AUTH: Call requireAuth(req) at top of every new API handler. No middleware.ts.
# 9. API RESPONSE SHAPE: successResponse({data}), paginatedResponse(data[], meta), actionResponse().
# 10. LINE ITEMS: unitPrice is integer cents. quantity supports up to 4 decimal places.