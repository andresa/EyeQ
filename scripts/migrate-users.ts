/**
 * Migration script to consolidate managers and employees into a unified 'users' container.
 *
 * INSTRUCTIONS:
 * 1. Fill in the COSMOS_CONNECTION_STRING below (or set as environment variable)
 * 2. Review the DRY_RUN setting - set to false to actually migrate data
 * 3. Run: npx tsx scripts/migrate-users.ts
 *
 * This script:
 * - Reads all documents from 'managers' container
 * - Reads all documents from 'employees' container
 * - Ensures each has a 'role' field set correctly
 * - Inserts into new 'users' container (preserving IDs for foreign key relationships)
 * - Verifies counts match
 *
 * IMPORTANT: This file is gitignored - do not commit it with secrets!
 */

import { CosmosClient } from '@azure/cosmos'

// ============================================
// CONFIGURATION - FILL IN THESE VALUES
// ============================================

const COSMOS_CONNECTION_STRING =
  process.env.COSMOS_CONNECTION_STRING || 'YOUR_CONNECTION_STRING_HERE'

const COSMOS_DB_NAME = process.env.COSMOS_DB_NAME || 'EyeQDBDev'

// Set to false to actually perform the migration
const DRY_RUN = true

// ============================================
// MIGRATION SCRIPT
// ============================================

interface MigratedUser {
  id: string
  companyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dob?: string
  role: 'employee' | 'manager'
  createdAt: string
  updatedAt?: string
  lastLogin?: string
  isActive: boolean
  invitationStatus?: string
  invitedEmail?: string
}

async function migrateUsers() {
  console.log('='.repeat(60))
  console.log('User Container Migration Script')
  console.log('='.repeat(60))
  console.log()

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No data will be modified')
    console.log('   Set DRY_RUN = false to perform actual migration')
    console.log()
  }

  if (
    COSMOS_CONNECTION_STRING === 'YOUR_CONNECTION_STRING_HERE' ||
    !COSMOS_CONNECTION_STRING
  ) {
    console.error('❌ Please set COSMOS_CONNECTION_STRING before running this script.')
    process.exit(1)
  }

  console.log('🔗 Connecting to Cosmos DB...')
  const client = new CosmosClient(COSMOS_CONNECTION_STRING)
  const database = client.database(COSMOS_DB_NAME)

  // ============================================
  // Step 1: Read existing data
  // ============================================

  console.log('\n📖 Reading existing data...\n')

  // Read managers
  const managersContainer = database.container('managers')
  let managers: Record<string, unknown>[] = []
  try {
    const { resources } = await managersContainer.items
      .query('SELECT * FROM c')
      .fetchAll()
    managers = resources
    console.log(`   Found ${managers.length} managers`)
  } catch (error) {
    console.log(
      '   ⚠️  Managers container not found or empty',
      error instanceof Error ? error.message : String(error),
    )
  }

  // Read employees
  const employeesContainer = database.container('employees')
  let employees: Record<string, unknown>[] = []
  try {
    const { resources } = await employeesContainer.items
      .query('SELECT * FROM c')
      .fetchAll()
    employees = resources
    console.log(`   Found ${employees.length} employees`)
  } catch (error) {
    console.log(
      '   ⚠️  Employees container not found or empty',
      error instanceof Error ? error.message : String(error),
    )
  }

  const totalUsers = managers.length + employees.length
  console.log(`\n   Total users to migrate: ${totalUsers}`)

  if (totalUsers === 0) {
    console.log('\n✅ No users to migrate. Exiting.')
    return
  }

  // ============================================
  // Step 2: Check for email conflicts
  // ============================================

  console.log('\n🔍 Checking for email conflicts...\n')

  const managerEmails = new Set(managers.map((m) => (m.email as string)?.toLowerCase()))
  const employeeEmails = new Set(employees.map((e) => (e.email as string)?.toLowerCase()))

  const conflicts: string[] = []
  for (const email of managerEmails) {
    if (email && employeeEmails.has(email)) {
      conflicts.push(email)
    }
  }

  if (conflicts.length > 0) {
    console.log('   ⚠️  Email conflicts found between managers and employees:')
    conflicts.forEach((email) => console.log(`      - ${email}`))
    console.log(
      '\n   These users exist in both containers. The manager record will take precedence.',
    )
    console.log('   Employee records with conflicting emails will be skipped.')
  } else {
    console.log('   ✅ No email conflicts found')
  }

  // ============================================
  // Step 3: Prepare users for migration
  // ============================================

  console.log('\n📦 Preparing users for migration...\n')

  const usersToMigrate: MigratedUser[] = []
  const skippedUsers: { email: string; reason: string }[] = []

  // Process managers first (they take precedence)
  for (const manager of managers) {
    const user: MigratedUser = {
      id: manager.id as string,
      companyId: manager.companyId as string,
      firstName: manager.firstName as string,
      lastName: manager.lastName as string,
      email: ((manager.email as string) || '').toLowerCase(),
      phone: manager.phone as string | undefined,
      dob: manager.dob as string | undefined,
      role: 'manager',
      createdAt: manager.createdAt as string,
      updatedAt: manager.updatedAt as string | undefined,
      lastLogin: manager.lastLogin as string | undefined,
      isActive: (manager.isActive as boolean) ?? true,
      invitationStatus: manager.invitationStatus as string | undefined,
      invitedEmail: manager.invitedEmail as string | undefined,
    }
    usersToMigrate.push(user)
  }

  // Process employees (skip if email conflicts with manager)
  for (const employee of employees) {
    const email = ((employee.email as string) || '').toLowerCase()

    if (conflicts.includes(email)) {
      skippedUsers.push({
        email,
        reason: 'Email already exists as manager',
      })
      continue
    }

    const user: MigratedUser = {
      id: employee.id as string,
      companyId: employee.companyId as string,
      firstName: employee.firstName as string,
      lastName: employee.lastName as string,
      email,
      phone: employee.phone as string | undefined,
      dob: employee.dob as string | undefined,
      role: 'employee',
      createdAt: employee.createdAt as string,
      updatedAt: employee.updatedAt as string | undefined,
      lastLogin: employee.lastLogin as string | undefined,
      isActive: (employee.isActive as boolean) ?? true,
      invitationStatus: employee.invitationStatus as string | undefined,
      invitedEmail: employee.invitedEmail as string | undefined,
    }
    usersToMigrate.push(user)
  }

  console.log(`   Users to migrate: ${usersToMigrate.length}`)
  console.log(`   Users skipped: ${skippedUsers.length}`)

  if (skippedUsers.length > 0) {
    console.log('\n   Skipped users:')
    skippedUsers.forEach((u) => console.log(`      - ${u.email}: ${u.reason}`))
  }

  // ============================================
  // Step 4: Create users container and migrate
  // ============================================

  if (DRY_RUN) {
    console.log('\n🔄 DRY RUN - Would migrate the following users:\n')
    console.log('   Managers:')
    usersToMigrate
      .filter((u) => u.role === 'manager')
      .forEach((u) => console.log(`      - ${u.email} (${u.firstName} ${u.lastName})`))
    console.log('\n   Employees:')
    usersToMigrate
      .filter((u) => u.role === 'employee')
      .forEach((u) => console.log(`      - ${u.email} (${u.firstName} ${u.lastName})`))
    console.log('\n✅ DRY RUN complete. Set DRY_RUN = false to perform migration.')
    return
  }

  console.log('\n🔄 Creating users container and migrating data...\n')

  // Create the users container if it doesn't exist
  const { container: usersContainer } = await database.containers.createIfNotExists({
    id: 'users',
    partitionKey: { paths: ['/companyId'] },
  })

  let migratedCount = 0
  let errorCount = 0

  for (const user of usersToMigrate) {
    try {
      // Check if user already exists in the new container
      const { resources: existing } = await usersContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: user.id }],
        })
        .fetchAll()

      if (existing.length > 0) {
        console.log(`   ⏭️  Skipping ${user.email} - already exists in users container`)
        continue
      }

      await usersContainer.items.create(user)
      migratedCount++
      console.log(`   ✅ Migrated: ${user.email} (${user.role})`)
    } catch (error) {
      errorCount++
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.log(`   ❌ Failed to migrate ${user.email}: ${errorMessage}`)
    }
  }

  // ============================================
  // Step 5: Verify migration
  // ============================================

  console.log('\n📊 Verifying migration...\n')

  const { resources: migratedUsers } = await usersContainer.items
    .query('SELECT * FROM c')
    .fetchAll()

  const migratedManagers = migratedUsers.filter(
    (u: Record<string, unknown>) => u.role === 'manager',
  ).length
  const migratedEmployees = migratedUsers.filter(
    (u: Record<string, unknown>) => u.role === 'employee',
  ).length

  console.log(`   Total users in new container: ${migratedUsers.length}`)
  console.log(`   - Managers: ${migratedManagers}`)
  console.log(`   - Employees: ${migratedEmployees}`)
  console.log()
  console.log(`   Successfully migrated: ${migratedCount}`)
  console.log(`   Errors: ${errorCount}`)

  // ============================================
  // Summary
  // ============================================

  console.log('\n' + '='.repeat(60))
  console.log('Migration Summary')
  console.log('='.repeat(60))
  console.log()
  console.log(`Original managers: ${managers.length}`)
  console.log(`Original employees: ${employees.length}`)
  console.log(`Total original: ${totalUsers}`)
  console.log()
  console.log(`Migrated to users container: ${migratedUsers.length}`)
  console.log(`Skipped (conflicts): ${skippedUsers.length}`)
  console.log()

  if (migratedUsers.length === usersToMigrate.length) {
    console.log('✅ Migration completed successfully!')
    console.log()
    console.log(
      '⚠️  IMPORTANT: The old containers (managers, employees) have NOT been deleted.',
    )
    console.log(
      '   After verifying the migration, you can manually delete them from Azure Portal.',
    )
  } else {
    console.log('⚠️  Migration completed with some issues. Please review the logs above.')
  }
}

migrateUsers().catch((error) => {
  console.error(
    '❌ Migration failed:',
    error instanceof Error ? error.message : String(error),
  )
  process.exit(1)
})
