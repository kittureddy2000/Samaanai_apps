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

  // Create spending categories
  const categories = [
    { name: 'Groceries', icon: 'cart', color: '#4caf50' },
    { name: 'Restaurants', icon: 'restaurant', color: '#ff9800' },
    { name: 'Transportation', icon: 'car', color: '#2196f3' },
    { name: 'Entertainment', icon: 'movie', color: '#9c27b0' },
    { name: 'Utilities', icon: 'lightbulb', color: '#f44336' }
  ];

  for (const cat of categories) {
    await prisma.spendingCategory.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: cat.name
        }
      },
      update: {},
      create: {
        userId: user.id,
        ...cat,
        plaidCategories: []
      }
    });
  }

  console.log('✅ Created spending categories');

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

  // Create sample institution (without Plaid - for demo)
  const institution = await prisma.institution.create({
    data: {
      userId: user.id,
      plaidInstitutionId: 'demo_bank',
      name: 'Demo Bank',
      accessToken: 'demo_access_token',
      itemId: 'demo_item_' + Date.now(),
      lastSuccessfulUpdate: new Date()
    }
  });

  console.log('✅ Created demo institution');

  // Create sample accounts
  const checking = await prisma.account.create({
    data: {
      institutionId: institution.id,
      plaidAccountId: 'demo_checking_' + Date.now(),
      name: 'Checking Account',
      officialName: 'Demo Checking',
      mask: '1234',
      type: 'depository',
      subtype: 'checking',
      currentBalance: 5420.50,
      availableBalance: 5420.50
    }
  });

  const savings = await prisma.account.create({
    data: {
      institutionId: institution.id,
      plaidAccountId: 'demo_savings_' + Date.now(),
      name: 'Savings Account',
      officialName: 'Demo Savings',
      mask: '5678',
      type: 'depository',
      subtype: 'savings',
      currentBalance: 15000.00,
      availableBalance: 15000.00
    }
  });

  const credit = await prisma.account.create({
    data: {
      institutionId: institution.id,
      plaidAccountId: 'demo_credit_' + Date.now(),
      name: 'Credit Card',
      officialName: 'Demo Credit Card',
      mask: '9012',
      type: 'credit',
      subtype: 'credit_card',
      currentBalance: 1250.30,
      limit: 5000.00
    }
  });

  console.log('✅ Created demo accounts');

  // Create sample transactions
  const transactionCategories = [
    { name: 'Groceries', category: 'FOOD_AND_DRINK' },
    { name: 'Coffee Shop', category: 'FOOD_AND_DRINK' },
    { name: 'Gas Station', category: 'TRANSPORTATION' },
    { name: 'Movie Theater', category: 'ENTERTAINMENT' },
    { name: 'Electric Company', category: 'UTILITIES' },
    { name: 'Restaurant', category: 'FOOD_AND_DRINK' },
    { name: 'Uber', category: 'TRANSPORTATION' },
    { name: 'Amazon', category: 'SHOPPING' }
  ];

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const txData = transactionCategories[i % transactionCategories.length];

    await prisma.transaction.create({
      data: {
        accountId: i % 3 === 2 ? credit.id : checking.id,
        plaidTransactionId: 'demo_tx_' + Date.now() + '_' + i,
        amount: -(Math.random() * 100 + 10), // Negative for expenses
        name: txData.name,
        merchantName: txData.name,
        date,
        primaryCategory: txData.category,
        paymentChannel: 'in store',
        pending: i === 0 // Make first transaction pending
      }
    });
  }

  console.log('✅ Created 30 sample transactions');

  // Create net worth snapshots
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const assets = 20000 + (Math.random() * 1000 - 500);
    const liabilities = 1200 + (Math.random() * 100 - 50);

    await prisma.netWorthSnapshot.upsert({
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
        totalAssets: assets,
        totalLiabilities: liabilities,
        netWorth: assets - liabilities,
        cashAndInvestments: assets,
        creditCards: liabilities,
        loans: 0
      }
    });
  }

  console.log('✅ Created 30 days of net worth snapshots');

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