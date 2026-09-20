import api from './api';

export const ProductService = {
  getProducts(page = 1, pageSize = 12, params = {}) {
    return api.get('/admin/products/', {
      params: { page, page_size: pageSize, ...params },
    });
  },

  getProductById(id) {
    return api.get(`/admin/products/${id}/`);
  },

  createProduct(productData) {
    return api.post('/admin/products/', productData);
  },

  updateProduct(id, productData) {
    return api.put(`/admin/products/${id}/`, productData);
  },

  // Admin: Delete product (staff cannot delete)
  deleteProduct(id) {
    return api.delete(`/admin/products/${id}/`);
  },

  // Similar for all product types - Admin has DELETE access
  getBooks(page = 1, pageSize = 12) {
    return api.get('/admin/books/', { params: { page, page_size: pageSize } });
  },

  createBook(bookData) {
    return api.post('/admin/books/', bookData);
  },

  updateBook(id, bookData) {
    return api.put(`/admin/books/${id}/`, bookData);
  },

  deleteBook(id) {
    return api.delete(`/admin/books/${id}/`);
  },

  getElectronics(page = 1, pageSize = 12) {
    return api.get('/admin/electronics/', { params: { page, page_size: pageSize } });
  },

  createElectronics(electronicsData) {
    return api.post('/admin/electronics/', electronicsData);
  },

  updateElectronics(id, electronicsData) {
    return api.put(`/admin/electronics/${id}/`, electronicsData);
  },

  deleteElectronics(id) {
    return api.delete(`/admin/electronics/${id}/`);
  },

  getFashion(page = 1, pageSize = 12) {
    return api.get('/admin/fashion/', { params: { page, page_size: pageSize } });
  },

  createFashion(fashionData) {
    return api.post('/admin/fashion/', fashionData);
  },

  updateFashion(id, fashionData) {
    return api.put(`/admin/fashion/${id}/`, fashionData);
  },

  deleteFashion(id) {
    return api.delete(`/admin/fashion/${id}/`);
  },

  getHomeLiving(page = 1, pageSize = 12) {
    return api.get('/admin/home-living/', { params: { page, page_size: pageSize } });
  },

  createHomeLiving(homeData) {
    return api.post('/admin/home-living/', homeData);
  },

  updateHomeLiving(id, homeData) {
    return api.put(`/admin/home-living/${id}/`, homeData);
  },

  deleteHomeLiving(id) {
    return api.delete(`/admin/home-living/${id}/`);
  },

  getSportsOutdoors(page = 1, pageSize = 12) {
    return api.get('/admin/sports-outdoors/', { params: { page, page_size: pageSize } });
  },

  createSportsOutdoors(sportsData) {
    return api.post('/admin/sports-outdoors/', sportsData);
  },

  updateSportsOutdoors(id, sportsData) {
    return api.put(`/admin/sports-outdoors/${id}/`, sportsData);
  },

  deleteSportsOutdoors(id) {
    return api.delete(`/admin/sports-outdoors/${id}/`);
  },

  getBeautyHealth(page = 1, pageSize = 12) {
    return api.get('/admin/beauty-health/', { params: { page, page_size: pageSize } });
  },

  createBeautyHealth(beautyData) {
    return api.post('/admin/beauty-health/', beautyData);
  },

  updateBeautyHealth(id, beautyData) {
    return api.put(`/admin/beauty-health/${id}/`, beautyData);
  },

  deleteBeautyHealth(id) {
    return api.delete(`/admin/beauty-health/${id}/`);
  },

  getToysGames(page = 1, pageSize = 12) {
    return api.get('/admin/toys-games/', { params: { page, page_size: pageSize } });
  },

  createToysGames(toysData) {
    return api.post('/admin/toys-games/', toysData);
  },

  updateToysGames(id, toysData) {
    return api.put(`/admin/toys-games/${id}/`, toysData);
  },

  deleteToysGames(id) {
    return api.delete(`/admin/toys-games/${id}/`);
  },

  getAutomotive(page = 1, pageSize = 12) {
    return api.get('/admin/automotive/', { params: { page, page_size: pageSize } });
  },

  createAutomotive(autoData) {
    return api.post('/admin/automotive/', autoData);
  },

  updateAutomotive(id, autoData) {
    return api.put(`/admin/automotive/${id}/`, autoData);
  },

  deleteAutomotive(id) {
    return api.delete(`/admin/automotive/${id}/`);
  },

  getFoodGrocery(page = 1, pageSize = 12) {
    return api.get('/admin/food-grocery/', { params: { page, page_size: pageSize } });
  },

  createFoodGrocery(foodData) {
    return api.post('/admin/food-grocery/', foodData);
  },

  updateFoodGrocery(id, foodData) {
    return api.put(`/admin/food-grocery/${id}/`, foodData);
  },

  deleteFoodGrocery(id) {
    return api.delete(`/admin/food-grocery/${id}/`);
  },

  getOfficeSupplies(page = 1, pageSize = 12) {
    return api.get('/admin/office-supplies/', { params: { page, page_size: pageSize } });
  },

  createOfficeSupplies(officeData) {
    return api.post('/admin/office-supplies/', officeData);
  },

  updateOfficeSupplies(id, officeData) {
    return api.put(`/admin/office-supplies/${id}/`, officeData);
  },

  deleteOfficeSupplies(id) {
    return api.delete(`/admin/office-supplies/${id}/`);
  },
};

export default ProductService;
