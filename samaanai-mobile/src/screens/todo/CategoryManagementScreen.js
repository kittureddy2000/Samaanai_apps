import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Text, ActivityIndicator, FAB, IconButton, Surface, Portal, Modal, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';

const PRESET_COLORS = [
  '#2196f3', // Blue
  '#4caf50', // Green
  '#ff9800', // Orange
  '#9c27b0', // Purple
  '#f44336', // Red
  '#00bcd4', // Cyan
  '#ff5722', // Deep Orange
  '#3f51b5', // Indigo
];

const PRESET_ICONS = [
  'format-list-checks',
  'briefcase',
  'home',
  'school',
  'shopping',
  'heart',
  'star',
  'account-group',
  'calendar',
  'lightbulb',
];

export default function CategoryManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  // Modal state for add/edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0]);
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      setError(null);
      const { data } = await api.getCategories();
      setCategories(data.categories);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load categories');
      console.error('Categories error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setSelectedColor(PRESET_COLORS[0]);
    setSelectedIcon(PRESET_ICONS[0]);
    setModalVisible(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setSelectedColor(category.color || PRESET_COLORS[0]);
    setSelectedIcon(category.icon || PRESET_ICONS[0]);
    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      setSaving(true);
      const categoryData = {
        name: categoryName.trim(),
        color: selectedColor,
        icon: selectedIcon,
      };

      if (editingCategory) {
        await api.updateCategory(editingCategory.id, categoryData);
      } else {
        await api.createCategory(categoryData);
      }

      setModalVisible(false);
      fetchCategories();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (category) => {
    if (category.isDefault) {
      Alert.alert('Cannot Delete', 'The default category cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? Tasks in this category will become uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCategory(category.id);
              fetchCategories();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const renderCategoryItem = (category) => {
    const taskCount = category._count?.tasks || 0;

    return (
      <Surface key={category.id} style={styles.categoryCard} elevation={1}>
        <TouchableOpacity
          style={styles.categoryCardTouchable}
          onPress={() => navigation.navigate('Todo', { categoryId: category.id })}
          activeOpacity={0.7}
        >
          <View style={styles.categoryHeader}>
            <View style={styles.categoryLeft}>
              <View style={[styles.iconCircle, { backgroundColor: category.color || '#2196f3' }]}>
                <MaterialCommunityIcons
                  name={category.icon || 'format-list-checks'}
                  size={24}
                  color="#fff"
                />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>
                  {category.name}
                  {category.isDefault && ' (Default)'}
                </Text>
                <Text style={styles.taskCount}>
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </Text>
              </View>
            </View>
            <View style={styles.categoryActions}>
              {!category.isDefault && (
                <>
                  <IconButton
                    icon="pencil"
                    size={18}
                    onPress={() => openEditModal(category)}
                  />
                  <IconButton
                    icon="delete"
                    size={18}
                    onPress={() => handleDeleteCategory(category)}
                  />
                </>
              )}
              {category.isDefault && (
                <IconButton
                  icon="pencil"
                  size={18}
                  onPress={() => openEditModal(category)}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Surface>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchCategories} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Manage Categories</Text>
          <Text style={styles.headerSubtitle}>
            Organize your tasks with custom categories
          </Text>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="folder-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No categories yet</Text>
            <Text style={styles.emptySubtext}>Create your first category to get started!</Text>
          </View>
        ) : (
          <View style={styles.categoriesList}>
            {categories.map(renderCategoryItem)}
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        color="#ffffff"
        onPress={openAddModal}
      />

      {/* Add/Edit Category Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>
            {editingCategory ? 'Edit Category' : 'New Category'}
          </Text>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Category Name</Text>
            <TextInput
              style={styles.textInput}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="e.g., Work, Personal, Shopping"
              maxLength={50}
              editable={!editingCategory?.isDefault}
            />

            <Text style={[styles.inputLabel, styles.spacedLabel]}>Color</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, styles.spacedLabel]}>Icon</Text>
            <View style={styles.iconGrid}>
              {PRESET_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon && styles.iconOptionSelected,
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={24}
                    color={selectedIcon === icon ? selectedColor : '#666'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setModalVisible(false)}
                style={styles.modalButton}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveCategory}
                style={styles.modalButton}
                loading={saving}
                disabled={saving || !categoryName.trim()}
              >
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  categoriesList: {
    padding: 16,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryCardTouchable: {
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  taskCount: {
    fontSize: 13,
    color: '#757575',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    marginHorizontal: 16,
    marginTop: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#8bc34a',
  },
  bottomSpacer: {
    height: 80,
  },
  // Modal styles
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    padding: 20,
    paddingBottom: 12,
  },
  modalContent: {
    padding: 20,
    paddingTop: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  spacedLabel: {
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#212121',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: '#8bc34a',
    backgroundColor: '#e8f5e9',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    minWidth: 100,
  },
});
