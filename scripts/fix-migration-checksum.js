const fs = require('fs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const migrationName = '20260317204816_add_appointments_and_auth';
const filePath = `prisma/migrations/${migrationName}/migration.sql`;

async function main() {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const before = await prisma.$queryRawUnsafe(
    'SELECT migration_name, checksum FROM "_prisma_migrations" WHERE migration_name = $1',
    migrationName
  );

  console.log('Local hash:', hash);
  console.log('DB before:', before);

  await prisma.$executeRawUnsafe(
    'UPDATE "_prisma_migrations" SET checksum = $1 WHERE migration_name = $2',
    hash,
    migrationName
  );

  const after = await prisma.$queryRawUnsafe(
    'SELECT migration_name, checksum FROM "_prisma_migrations" WHERE migration_name = $1',
    migrationName
  );

  console.log('DB after:', after);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
