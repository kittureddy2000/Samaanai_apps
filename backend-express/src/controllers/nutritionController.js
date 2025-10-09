const { prisma } = require('../config/database');

exports.getMeals = async (req, res, next) => {
  try {
    const { date, startDate, endDate } = req.query;

    const meals = await prisma.mealEntry.findMany({
      where: {
        userId: req.user.id,
        ...(date && { date: new Date(date) }),
        ...(startDate && endDate && {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        })
      },
      orderBy: { date: 'desc' }
    });

    res.json({ meals });
  } catch (error) {
    next(error);
  }
};

exports.createMeal = async (req, res, next) => {
  try {
    const meal = await prisma.mealEntry.create({
      data: {
        ...req.body,
        userId: req.user.id
      }
    });
    res.json({ meal });
  } catch (error) {
    next(error);
  }
};

exports.updateMeal = async (req, res, next) => {
  try {
    const meal = await prisma.mealEntry.update({
      where: {
        id: req.params.id
      },
      data: req.body
    });
    res.json({ meal });
  } catch (error) {
    next(error);
  }
};

exports.deleteMeal = async (req, res, next) => {
  try {
    await prisma.mealEntry.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Meal deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getExercises = async (req, res, next) => {
  try {
    const exercises = await prisma.exerciseEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' }
    });
    res.json({ exercises });
  } catch (error) {
    next(error);
  }
};

exports.createExercise = async (req, res, next) => {
  try {
    const exercise = await prisma.exerciseEntry.create({
      data: {
        ...req.body,
        userId: req.user.id
      }
    });
    res.json({ exercise });
  } catch (error) {
    next(error);
  }
};

exports.updateExercise = async (req, res, next) => {
  try {
    const exercise = await prisma.exerciseEntry.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ exercise });
  } catch (error) {
    next(error);
  }
};

exports.deleteExercise = async (req, res, next) => {
  try {
    await prisma.exerciseEntry.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Exercise deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getWeightEntries = async (req, res, next) => {
  try {
    const entries = await prisma.weightEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' }
    });
    res.json({ entries });
  } catch (error) {
    next(error);
  }
};

exports.createWeightEntry = async (req, res, next) => {
  try {
    const entry = await prisma.weightEntry.create({
      data: {
        ...req.body,
        userId: req.user.id
      }
    });
    res.json({ entry });
  } catch (error) {
    next(error);
  }
};

exports.getDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const userId = req.user.id;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get meals for the day
    const meals = await prisma.mealEntry.findMany({
      where: {
        userId,
        date: targetDate
      },
      orderBy: { createdAt: 'asc' }
    });

    // Get exercise for the day
    const exercise = await prisma.exerciseEntry.findFirst({
      where: {
        userId,
        date: targetDate
      }
    });

    // Calculate totals
    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    const caloriesBurned = exercise ? exercise.caloriesBurned : 0;

    // Get user's metabolic rate and goals
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    const bmr = profile?.metabolicRate || 2000;
    const weightLossGoal = profile?.weightLossGoal || 0;

    // Calculate net BMR (daily calorie target)
    // If weightLossGoal > 0 (losing weight), subtract calories
    // If weightLossGoal < 0 (gaining weight), add calories
    const calorieAdjustment = (Math.abs(weightLossGoal) * 3500) / 7;
    let dailyGoal = bmr;

    if (weightLossGoal > 0) {
      dailyGoal = Math.round(bmr - calorieAdjustment);
    } else if (weightLossGoal < 0) {
      dailyGoal = Math.round(bmr + calorieAdjustment);
    }

    // Net Calories = BMR (or adjusted BMR) + Exercise - Food
    const netCalories = dailyGoal + caloriesBurned - totalCalories;
    const remaining = netCalories;

    res.json({
      date: targetDate,
      meals,
      exercise,
      summary: {
        caloriesConsumed: totalCalories,
        caloriesBurned,
        netCalories,
        dailyGoal,
        remaining,
        percentOfGoal: dailyGoal > 0 ? (totalCalories / dailyGoal) * 100 : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getWeeklyReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = endDate ? new Date(endDate) : new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Get user's metabolic rate and goals
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    const bmr = profile?.metabolicRate || 2000;
    const weightLossGoal = profile?.weightLossGoal || 0;

    // Calculate daily calorie target
    const calorieAdjustment = (Math.abs(weightLossGoal) * 3500) / 7;
    let dailyGoal = bmr;

    if (weightLossGoal > 0) {
      dailyGoal = Math.round(bmr - calorieAdjustment);
    } else if (weightLossGoal < 0) {
      dailyGoal = Math.round(bmr + calorieAdjustment);
    }

    // Get all meals in range
    const meals = await prisma.mealEntry.findMany({
      where: {
        userId,
        date: { gte: start, lte: end }
      },
      orderBy: { date: 'asc' }
    });

    // Get all exercises in range
    const exercises = await prisma.exerciseEntry.findMany({
      where: {
        userId,
        date: { gte: start, lte: end }
      }
    });

    // Group by date
    const dailyData = {};
    meals.forEach(meal => {
      const dateStr = meal.date.toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: meal.date, calories: 0, burned: 0 };
      }
      dailyData[dateStr].calories += meal.calories;
    });

    exercises.forEach(exercise => {
      const dateStr = exercise.date.toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: exercise.date, calories: 0, burned: 0 };
      }
      dailyData[dateStr].burned += exercise.caloriesBurned;
    });

    const daily = Object.values(dailyData).map(d => ({
      date: d.date.toISOString().split('T')[0],
      total_food_calories: d.calories,
      total_exercise_calories: d.burned,
      // Net Calories = Daily Goal + Exercise - Food
      net_calories: dailyGoal + d.burned - d.calories
    }));

    const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
    const totalBurned = exercises.reduce((sum, e) => sum + e.caloriesBurned, 0);

    // Weekly net calories = (Daily Goal * 7) + Total Exercise - Total Food
    const weeklyTarget = dailyGoal * 7;
    const weeklyNet = weeklyTarget + totalBurned - totalCalories;

    res.json({
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      daily_summaries: daily,
      summary: {
        totalCalories,
        totalBurned,
        netCalories: weeklyNet,
        dailyGoal,
        weeklyTarget,
        avgDailyCalories: daily.length > 0 ? totalCalories / daily.length : 0,
        daysTracked: daily.length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMonthlyReport = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const userId = req.user.id;

    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();

    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    // Get user's metabolic rate and goals
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    const bmr = profile?.metabolicRate || 2000;
    const weightLossGoal = profile?.weightLossGoal || 0;

    // Calculate daily calorie target
    const calorieAdjustment = (Math.abs(weightLossGoal) * 3500) / 7;
    let dailyGoal = bmr;

    if (weightLossGoal > 0) {
      dailyGoal = Math.round(bmr - calorieAdjustment);
    } else if (weightLossGoal < 0) {
      dailyGoal = Math.round(bmr + calorieAdjustment);
    }

    const meals = await prisma.mealEntry.findMany({
      where: {
        userId,
        date: { gte: start, lte: end }
      }
    });

    const exercises = await prisma.exerciseEntry.findMany({
      where: {
        userId,
        date: { gte: start, lte: end }
      }
    });

    // Group by date
    const dailyData = {};
    meals.forEach(meal => {
      const dateStr = meal.date.toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, calories: 0, burned: 0 };
      }
      dailyData[dateStr].calories += meal.calories;
    });

    exercises.forEach(exercise => {
      const dateStr = exercise.date.toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, calories: 0, burned: 0 };
      }
      dailyData[dateStr].burned += exercise.caloriesBurned;
    });

    const daily_entries = Object.values(dailyData).map(d => ({
      date: d.date,
      total_food_calories: d.calories,
      total_exercise_calories: d.burned,
      // Net Calories = Daily Goal + Exercise - Food
      net_calories: dailyGoal + d.burned - d.calories
    }));

    const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
    const totalBurned = exercises.reduce((sum, e) => sum + e.caloriesBurned, 0);
    const daysInMonth = end.getDate();

    // Monthly net calories = (Daily Goal * days in month) + Total Exercise - Total Food
    const monthlyTarget = dailyGoal * daysInMonth;
    const monthlyNet = monthlyTarget + totalBurned - totalCalories;

    res.json({
      year: targetYear,
      month: targetMonth + 1,
      daily_entries,
      summary: {
        totalCalories,
        totalBurned,
        netCalories: monthlyNet,
        dailyGoal,
        monthlyTarget,
        avgDailyCalories: daily_entries.length > 0 ? totalCalories / daily_entries.length : 0,
        mealsLogged: meals.length,
        exercisesLogged: exercises.length,
        daysInMonth
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getYearlyReport = async (req, res, next) => {
  try {
    const { year } = req.query;
    const userId = req.user.id;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const start = new Date(targetYear, 0, 1);
    const end = new Date(targetYear, 11, 31, 23, 59, 59);

    // Get user's metabolic rate and goals
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    const bmr = profile?.metabolicRate || 2000;
    const weightLossGoal = profile?.weightLossGoal || 0;

    // Calculate daily calorie target
    const calorieAdjustment = (Math.abs(weightLossGoal) * 3500) / 7;
    let dailyGoal = bmr;

    if (weightLossGoal > 0) {
      dailyGoal = Math.round(bmr - calorieAdjustment);
    } else if (weightLossGoal < 0) {
      dailyGoal = Math.round(bmr + calorieAdjustment);
    }

    const meals = await prisma.mealEntry.findMany({
      where: {
        userId,
        date: { gte: start, lte: end }
      }
    });

    const exercises = await prisma.exerciseEntry.findMany({
      where: {
        userId,
        date: { gte: start, lte: end }
      }
    });

    const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
    const totalBurned = exercises.reduce((sum, e) => sum + e.caloriesBurned, 0);

    // Group by month
    const monthlyData = {};
    for (let i = 0; i < 12; i++) {
      const daysInMonth = new Date(targetYear, i + 1, 0).getDate();
      monthlyData[i + 1] = {
        month: i + 1,
        total_food_calories: 0,
        total_exercise_calories: 0,
        net_calories: 0,
        days_with_data: 0,
        days_in_month: daysInMonth,
        monthly_target: dailyGoal * daysInMonth
      };
    }

    meals.forEach(meal => {
      const month = meal.date.getMonth() + 1;
      monthlyData[month].total_food_calories += meal.calories;
    });

    exercises.forEach(exercise => {
      const month = exercise.date.getMonth() + 1;
      monthlyData[month].total_exercise_calories += exercise.caloriesBurned;
    });

    Object.keys(monthlyData).forEach(month => {
      const data = monthlyData[month];
      // Net Calories = Monthly Target + Exercise - Food
      data.net_calories = data.monthly_target + data.total_exercise_calories - data.total_food_calories;
      data.days_with_data = data.total_food_calories > 0 || data.total_exercise_calories > 0 ? 1 : 0;
    });

    // Yearly net calories = (Daily Goal * 365) + Total Exercise - Total Food
    const yearlyTarget = dailyGoal * 365;
    const yearlyNet = yearlyTarget + totalBurned - totalCalories;

    res.json({
      year: targetYear,
      monthly_entries: Object.values(monthlyData),
      summary: {
        totalCalories,
        totalBurned,
        netCalories: yearlyNet,
        dailyGoal,
        yearlyTarget
      }
    });
  } catch (error) {
    next(error);
  }
};