const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@samaanai.com' },
    update: {},
    create: {
      username: 'demo',
      email: 'demo@samaanai.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      profile: {
        create: {
          height: 175,
          weight: 70,
          metabolicRate: 2000,
          weightLossGoal: 0,
          timezone: 'US/Pacific',
          startOfWeek: 2
        }
      }
    },
    include: { profile: true }
  });

  console.log('✅ Created user:', user.email);

  // Create sample nutrition data for the past 7 days
  const today = new Date();
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Create meals
    for (const mealType of mealTypes.slice(0, 3)) { // Skip snacks sometimes
      await prisma.mealEntry.upsert({
        where: {
          userId_date_mealType: {
            userId: user.id,
            date,
            mealType
          }
        },
        update: {},
        create: {
          userId: user.id,
          date,
          mealType,
          description: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} meal`,
          calories: Math.floor(Math.random() * 400) + 300
        }
      });
    }

    // Create exercise
    if (i % 2 === 0) { // Every other day
      await prisma.exerciseEntry.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date
          }
        },
        update: {},
        create: {
          userId: user.id,
          date,
          description: ['Running', 'Cycling', 'Swimming', 'Gym'][Math.floor(Math.random() * 4)],
          caloriesBurned: Math.floor(Math.random() * 300) + 200,
          durationMinutes: Math.floor(Math.random() * 60) + 30
        }
      });
    }

    // Create weight entry
    await prisma.weightEntry.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date
        }
      },
      update: {},
      create: {
        userId: user.id,
        date,
        weight: 70 + (Math.random() * 2 - 1) // 69-71 kg
      }
    });
  }

  console.log('✅ Created 7 days of nutrition data');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('   Email: demo@samaanai.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });