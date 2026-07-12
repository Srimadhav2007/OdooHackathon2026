/**
 * Seed file — populates realistic demo data.
 * Run: npx prisma db seed
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Clean up existing data (optional, but safe for hackathon seeding)
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditResult.deleteMany({});
  await prisma.auditAssignment.deleteMany({});
  await prisma.auditCycle.deleteMany({});
  await prisma.maintenanceRequest.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.transferRequest.deleteMany({});
  await prisma.allocation.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.assetCategory.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.department.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Departments
  const engDept = await prisma.department.create({
    data: { name: 'Engineering', status: true }
  });
  const hrDept = await prisma.department.create({
    data: { name: 'Human Resources', status: true }
  });
  const opsDept = await prisma.department.create({
    data: { name: 'Operations', status: true }
  });

  // 2. Employees (Admin, Asset Manager, Dept Head, Employee)
  const admin = await prisma.employee.create({
    data: {
      name: 'Admin User',
      email: 'admin@assetflow.com',
      passwordHash,
      role: 'ADMIN',
      status: true,
    }
  });

  const assetManager = await prisma.employee.create({
    data: {
      name: 'Sam Manager',
      email: 'manager@assetflow.com',
      passwordHash,
      role: 'ASSET_MANAGER',
      departmentId: opsDept.id,
      status: true,
    }
  });

  const deptHead = await prisma.employee.create({
    data: {
      name: 'Helen Head',
      email: 'head@assetflow.com',
      passwordHash,
      role: 'DEPT_HEAD',
      departmentId: engDept.id,
      status: true,
    }
  });

  const employee1 = await prisma.employee.create({
    data: {
      name: 'Eric Employee',
      email: 'eric@assetflow.com',
      passwordHash,
      role: 'EMPLOYEE',
      departmentId: engDept.id,
      status: true,
    }
  });

  // Set Helen as Head of Engineering
  await prisma.department.update({
    where: { id: engDept.id },
    data: { headId: deptHead.id }
  });

  // 3. Asset Categories
  const catLaptops = await prisma.assetCategory.create({
    data: { name: 'Laptops', description: 'Company assigned laptops' }
  });
  const catFurniture = await prisma.assetCategory.create({
    data: { name: 'Office Furniture', description: 'Desks, chairs, etc.' }
  });
  const catVehicles = await prisma.assetCategory.create({
    data: { name: 'Vehicles', description: 'Company cars' }
  });

  // 4. Assets
  const assetsToCreate = [
    { tag: 'AF-0001', name: 'MacBook Pro M3', categoryId: catLaptops.id, condition: 'NEW', status: 'AVAILABLE', serialNumber: 'MBP-001', acquisitionCost: 2499.00 },
    { tag: 'AF-0002', name: 'Dell XPS 15', categoryId: catLaptops.id, condition: 'GOOD', status: 'AVAILABLE', serialNumber: 'DX-001', acquisitionCost: 1899.00 },
    { tag: 'AF-0003', name: 'ThinkPad T14', categoryId: catLaptops.id, condition: 'FAIR', status: 'AVAILABLE', serialNumber: 'TP-001', acquisitionCost: 1299.00 },
    { tag: 'AF-0004', name: 'Ergonomic Chair Pro', categoryId: catFurniture.id, condition: 'GOOD', status: 'AVAILABLE', location: 'HQ - Floor 2' },
    { tag: 'AF-0005', name: 'Standing Desk', categoryId: catFurniture.id, condition: 'NEW', status: 'AVAILABLE', location: 'HQ - Floor 2' },
    { tag: 'AF-0006', name: 'Toyota Prius 2024', categoryId: catVehicles.id, condition: 'NEW', status: 'AVAILABLE', isBookable: true, location: 'Parking Bay 1' },
    { tag: 'AF-0007', name: 'Ford Transit Van', categoryId: catVehicles.id, condition: 'GOOD', status: 'AVAILABLE', isBookable: true, location: 'Warehouse Bay 2' }
  ];

  for (const asset of assetsToCreate) {
    await prisma.asset.create({ data: asset });
  }

  console.log('✅ Seed complete. Created 4 users, 3 departments, 3 categories, and 7 assets.');
  console.log('🔑 Login Credentials:');
  console.log('   Admin: admin@assetflow.com / password123');
  console.log('   Manager: manager@assetflow.com / password123');
  console.log('   Dept Head: head@assetflow.com / password123');
  console.log('   Employee: eric@assetflow.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
