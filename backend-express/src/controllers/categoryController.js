const { prisma } = require('../config/database');

// Get all categories for the authenticated user
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' }, // Default category first
        { createdAt: 'asc' }
      ]
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Create a new category
const createCategory = async (req, res) => {
  try {
    const { name, color, icon } = req.body;

    // Check if category with same name already exists for this user
    const existing = await prisma.category.findUnique({
      where: {
        userId_name: {
          userId: req.user.id,
          name: name.trim()
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }

    const category = await prisma.category.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        color: color || null,
        icon: icon || null
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    });

    res.status(201).json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Update a category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;

    // Check if category exists and belongs to user
    const existing = await prisma.category.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent renaming default category
    if (existing.isDefault && name && name !== existing.name) {
      return res.status(400).json({ error: 'Cannot rename the default category' });
    }

    // If name is being changed, check if new name already exists
    if (name && name !== existing.name) {
      const nameExists = await prisma.category.findUnique({
        where: {
          userId_name: {
            userId: req.user.id,
            name: name.trim()
          }
        }
      });

      if (nameExists) {
        return res.status(400).json({ error: 'A category with this name already exists' });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon })
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    });

    res.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent deleting default category
    if (category.isDefault) {
      return res.status(400).json({ error: 'Cannot delete the default category' });
    }

    // Delete the category (tasks will have their categoryId set to null due to SetNull)
    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// Get tasks by category
const getTasksByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.query;

    // Check if category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.user.id,
        categoryId: id,
        ...(completed !== undefined && { completed: completed === 'true' })
      },
      orderBy: [
        { completed: 'asc' },
        { priority: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ tasks, category });
  } catch (error) {
    console.error('Get tasks by category error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTasksByCategory
};
