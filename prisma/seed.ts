#!/usr/bin/env node
/**
 * AtlasCloud Development Seed Script
 *
 * Creates deterministic development data for testing and demonstration.
 *
 * Usage: npm run db:seed
 *
 * IMPORTANT: This script is for DEVELOPMENT ONLY.
 * Never run against a production database.
 *
 * Creates:
 * - 1 platform administrator
 * - 2 organizations (Acme Corp, Beta Inc)
 * - Users with different roles
 * - Projects in each organization
 * - Example completed and pending jobs
 */

import {
  PrismaClient,
  MemberRole,
  OrganizationStatus,
  ProjectStatus,
  JobStatus,
  JobType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// Development passwords — clearly labeled, never reused in production
const DEV_PASSWORDS = {
  admin: 'DevAdmin@123!', // Platform administrator
  owner: 'DevOwner@123!', // Organization owners
  member: 'DevMember@123!', // Regular members
} as const;

const ARGON2_CONFIG = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

async function hash(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_CONFIG);
}

async function main(): Promise<void> {
  console.log('🌱 Starting development seed...');
  console.log('⚠️  This script is for DEVELOPMENT ONLY.');

  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Seed script must not run in production.');
  }

  // ── Platform Administrator ───────────────────────────────────────────────────
  console.log('\n→ Creating platform administrator...');
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@atlascloud.local' },
    update: {},
    create: {
      email: 'admin@atlascloud.local',
      passwordHash: await hash(DEV_PASSWORDS.admin),
      displayName: 'Platform Admin',
      isPlatformAdmin: true,
    },
  });
  console.log(`  ✓ Platform admin: ${platformAdmin.email} (password: ${DEV_PASSWORDS.admin})`);

  // ── Organization 1: Acme Corp ────────────────────────────────────────────────
  console.log('\n→ Creating Acme Corp...');
  const acme = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const acmeOwner = await prisma.user.upsert({
    where: { email: 'alice@acme.local' },
    update: {},
    create: {
      email: 'alice@acme.local',
      passwordHash: await hash(DEV_PASSWORDS.owner),
      displayName: 'Alice Owner',
    },
  });

  const acmeAdmin = await prisma.user.upsert({
    where: { email: 'bob@acme.local' },
    update: {},
    create: {
      email: 'bob@acme.local',
      passwordHash: await hash(DEV_PASSWORDS.member),
      displayName: 'Bob Admin',
    },
  });

  const acmeMember = await prisma.user.upsert({
    where: { email: 'carol@acme.local' },
    update: {},
    create: {
      email: 'carol@acme.local',
      passwordHash: await hash(DEV_PASSWORDS.member),
      displayName: 'Carol Member',
    },
  });

  const acmeViewer = await prisma.user.upsert({
    where: { email: 'dave@acme.local' },
    update: {},
    create: {
      email: 'dave@acme.local',
      passwordHash: await hash(DEV_PASSWORDS.member),
      displayName: 'Dave Viewer',
    },
  });

  // Memberships for Acme Corp
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: acme.id, userId: acmeOwner.id } },
    update: {},
    create: { organizationId: acme.id, userId: acmeOwner.id, role: MemberRole.OWNER },
  });
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: acme.id, userId: acmeAdmin.id } },
    update: {},
    create: { organizationId: acme.id, userId: acmeAdmin.id, role: MemberRole.ADMIN },
  });
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: acme.id, userId: acmeMember.id } },
    update: {},
    create: { organizationId: acme.id, userId: acmeMember.id, role: MemberRole.MEMBER },
  });
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: acme.id, userId: acmeViewer.id } },
    update: {},
    create: { organizationId: acme.id, userId: acmeViewer.id, role: MemberRole.VIEWER },
  });

  console.log(`  ✓ Org: ${acme.name} (slug: ${acme.slug})`);
  console.log(`  ✓ alice@acme.local — OWNER  (password: ${DEV_PASSWORDS.owner})`);
  console.log(`  ✓ bob@acme.local   — ADMIN  (password: ${DEV_PASSWORDS.member})`);
  console.log(`  ✓ carol@acme.local — MEMBER (password: ${DEV_PASSWORDS.member})`);
  console.log(`  ✓ dave@acme.local  — VIEWER (password: ${DEV_PASSWORDS.member})`);

  // Projects for Acme Corp
  const acmeProject1 = await prisma.project
    .upsert({
      where: { id: 'acme-proj-1-00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: 'acme-proj-1-00000000-0000-0000-0000-000000000001',
        organizationId: acme.id,
        name: 'Alpha Initiative',
        description: 'First major project for Acme Corp',
        status: ProjectStatus.ACTIVE,
        createdById: acmeOwner.id,
      },
    })
    .catch(async () => {
      return prisma.project.create({
        data: {
          organizationId: acme.id,
          name: 'Alpha Initiative',
          description: 'First major project for Acme Corp',
          status: ProjectStatus.ACTIVE,
          createdById: acmeOwner.id,
        },
      });
    });

  // ── Organization 2: Beta Inc ─────────────────────────────────────────────────
  console.log('\n→ Creating Beta Inc...');
  const beta = await prisma.organization.upsert({
    where: { slug: 'beta-inc' },
    update: {},
    create: {
      name: 'Beta Inc',
      slug: 'beta-inc',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const betaOwner = await prisma.user.upsert({
    where: { email: 'eve@beta.local' },
    update: {},
    create: {
      email: 'eve@beta.local',
      passwordHash: await hash(DEV_PASSWORDS.owner),
      displayName: 'Eve Beta Owner',
    },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: beta.id, userId: betaOwner.id } },
    update: {},
    create: { organizationId: beta.id, userId: betaOwner.id, role: MemberRole.OWNER },
  });

  const betaProject1 = await prisma.project
    .create({
      data: {
        organizationId: beta.id,
        name: 'Beta Platform',
        description: 'Core platform project for Beta Inc',
        status: ProjectStatus.ACTIVE,
        createdById: betaOwner.id,
      },
    })
    .catch(async (err: Error) => {
      if (err.message.includes('Unique constraint')) {
        return prisma.project.findFirst({ where: { organizationId: beta.id } }) as Promise<
          NonNullable<Awaited<ReturnType<typeof prisma.project.findFirst>>>
        >;
      }
      throw err;
    });

  console.log(`  ✓ Org: ${beta.name} (slug: ${beta.slug})`);
  console.log(`  ✓ eve@beta.local — OWNER (password: ${DEV_PASSWORDS.owner})`);

  // ── Jobs ─────────────────────────────────────────────────────────────────────
  console.log('\n→ Creating example jobs...');

  // Completed job for Acme
  await prisma.job
    .create({
      data: {
        organizationId: acme.id,
        projectId: acmeProject1.id,
        type: JobType.PROJECT_REPORT,
        status: JobStatus.COMPLETED,
        payload: { projectId: acmeProject1.id, includeJobs: true, format: 'json' },
        result: {
          reportUrl: '/reports/acme-alpha-2024.json',
          generatedAt: new Date().toISOString(),
        },
        idempotencyKey: 'seed-completed-job-001',
        attempts: 1,
        requestedById: acmeOwner.id,
        startedAt: new Date(Date.now() - 5000),
        completedAt: new Date(),
      },
    })
    .catch(() => {
      /* Already exists */
    });

  // Pending job for Acme
  await prisma.job
    .create({
      data: {
        organizationId: acme.id,
        projectId: acmeProject1.id,
        type: JobType.DATA_EXPORT,
        status: JobStatus.PENDING,
        payload: { resourceType: 'projects', format: 'csv' },
        idempotencyKey: 'seed-pending-job-001',
        attempts: 0,
        requestedById: acmeMember.id,
      },
    })
    .catch(() => {
      /* Already exists */
    });

  // Failed job for Acme
  await prisma.job
    .create({
      data: {
        organizationId: acme.id,
        type: JobType.PROJECT_REPORT,
        status: JobStatus.FAILED,
        payload: { projectId: randomUUID(), includeJobs: false, format: 'csv' },
        idempotencyKey: 'seed-failed-job-001',
        attempts: 3,
        requestedById: acmeAdmin.id,
        startedAt: new Date(Date.now() - 60000),
        completedAt: new Date(),
        failureCode: 'PROJECT_NOT_FOUND',
        failureMessage: 'The specified project does not exist or was deleted.',
      },
    })
    .catch(() => {
      /* Already exists */
    });

  console.log('  ✓ Completed job, pending job, and failed job created for Acme Corp');

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n✅ Development seed complete!');
  console.log('\n📋 Test accounts:');
  console.log('   Platform Admin: admin@atlascloud.local / DevAdmin@123!');
  console.log('   Acme Owner:     alice@acme.local / DevOwner@123!');
  console.log('   Acme Admin:     bob@acme.local / DevMember@123!');
  console.log('   Acme Member:    carol@acme.local / DevMember@123!');
  console.log('   Acme Viewer:    dave@acme.local / DevMember@123!');
  console.log('   Beta Owner:     eve@beta.local / DevOwner@123!');
  console.log('\n🔒 Tenant isolation test:');
  console.log('   Log in as alice@acme.local, then try to access Beta Inc resources.');
  console.log('   All cross-tenant requests should return 403 Forbidden.');
}

main()
  .catch((err: Error) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
