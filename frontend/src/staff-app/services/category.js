import api from './api';

export const CategoryService = {
  // Admin: Create category
  createCategory(categoryData) {
    return api.post('/categories/', categoryData);
  },

  // Guest + Admin: Get categories
  getCategories() {
    return api.get('/categories/');
  },
};

export default CategoryService;
