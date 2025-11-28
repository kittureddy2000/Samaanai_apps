/**
 * Script to clean up duplicate Microsoft To Do tasks
 * Keeps the most recently updated task for each microsoftTodoId per user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  try {
    console.log('🔍 Finding duplicate Microsoft To Do tasks...\n');

    // Find all tasks with microsoftTodoId
    const tasksWithMsId = await prisma.task.findMany({
      where: {
        microsoftTodoId: { not: null }
      },
      orderBy: [
        { userId: 'asc' },
        { microsoftTodoId: 'asc' },
        { updatedAt: 'desc' } // Most recent first
      ]
    });

    const tasksByUserAndMsId = {};
    const duplicatesToDelete = [];

    // Group tasks by userId and microsoftTodoId
    for (const task of tasksWithMsId) {
      const key = `${task.userId}_${task.microsoftTodoId}`;

      if (!tasksByUserAndMsId[key]) {
        // First task with this combination - keep it
        tasksByUserAndMsId[key] = task;
        console.log(`✅ Keeping: ${task.name} (ID: ${task.id}, Updated: ${task.updatedAt})`);
      } else {
        // Duplicate found - mark for deletion
        duplicatesToDelete.push(task.id);
        console.log(`❌ Duplicate: ${task.name} (ID: ${task.id}, Updated: ${task.updatedAt})`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total tasks with Microsoft ID: ${tasksWithMsId.length}`);
    console.log(`   Unique tasks to keep: ${Object.keys(tasksByUserAndMsId).length}`);
    console.log(`   Duplicates to delete: ${duplicatesToDelete.length}\n`);

    if (duplicatesToDelete.length > 0) {
      console.log('🗑️  Deleting duplicates...');

      const result = await prisma.task.deleteMany({
        where: {
          id: {
            in: duplicatesToDelete
          }
        }
      });

      console.log(`✅ Deleted ${result.count} duplicate tasks\n`);
    } else {
      console.log('✅ No duplicates found!\n');
    }

    console.log('🎉 Cleanup complete!');
  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanDuplicates()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
