/**
 * Seed file — populates realistic demo data.
 * Run: npx prisma db seed
 *
 * Creates:
 *  - 4 users (Admin, Asset Manager, Dept Head, Employee)
 *  - 3 departments
 *  - 3 asset categories
 *  - 10 sample assets
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // TODO (Member A): Implement realistic seed data
  // Steps:
  //  1. Hash passwords with bcrypt
  //  2. Create departments (Engineering, Operations, HR) with hierarchy
  //  3. Create employees with roles
  //  4. Create asset categories (Electronics, Furniture, Vehicles)
  //  5. Create 10+ assets with varied statuses
  //  6. Create sample allocations, bookings, maintenance requests

  console.log('🌱 Seeding database...');

  // Example structure — fill in real data:
  // const admin = await prisma.employee.upsert({ ... });
  // const engineering = await prisma.department.create({ ... });

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
