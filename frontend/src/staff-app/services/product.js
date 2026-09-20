import api from './api';

export const ProductService = {
  // Guest + Staff: Get categories
  getCategories() {
    return api.get('/staff/categories/');
  },

  // Guest + Staff: Get products (paginated)
  getProducts(page = 1, pageSize = 12, params = {}) {
    return api.get('/staff/products/', {
      params: { page, page_size: pageSize, ...params },
    });
  },

  // Guest + Staff: Get product details
  getProductById(id) {
    return api.get(`/staff/products/${id}/`);
  },

  // Staff: Create product
  createProduct(productData) {
    return api.post('/staff/products/', productData);
  },

  // Staff: Update product
  updateProduct(id, productData) {
    return api.put(`/staff/products/${id}/`, productData);
  },

  // Guest + Staff: Get books
  getBooks(page = 1, pageSize = 12) {
    return api.get('/staff/books/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Staff: Get book details
  getBookById(id) {
    return api.get(`/staff/books/${id}/`);
  },

  // Staff: Create book
  createBook(bookData) {
    return api.post('/staff/books/', bookData);
  },

  // Staff: Update book
  updateBook(id, bookData) {
    return api.put(`/staff/books/${id}/`, bookData);
  },

  // Guest + Staff: Get electronics
  getElectronics(page = 1, pageSize = 12) {
    return api.get('/staff/electronics/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Staff: Get electronics details
  getElectronicsById(id) {
    return api.get(`/staff/electronics/${id}/`);
  },

  // Staff: Create electronics
  createElectronics(electronicsData) {
    return api.post('/staff/electronics/', electronicsData);
  },

  // Staff: Update electronics
  updateElectronics(id, electronicsData) {
    return api.put(`/staff/electronics/${id}/`, electronicsData);
  },

  // Similar methods for all other product types...
  // (fashion, home-living, sports-outdoors, beauty-health, toys-games, automotive, food-grocery, office-supplies)

  // Guest + Staff: Get fashion
  getFashion(page = 1, pageSize = 12) {
    return api.get('/staff/fashion/', {
      params: { page, page_size: pageSize },
    });
  },

  // Staff: Create fashion
  createFashion(fashionData) {
    return api.post('/staff/fashion/', fashionData);
  },

  // Staff: Update fashion
  updateFashion(id, fashionData) {
    return api.put(`/staff/fashion/${id}/`, fashionData);
  },

  // Guest + Staff: Get Home & Living
  getHomeLiving(page = 1, pageSize = 12) {
    return api.get('/staff/home-living/', {
      params: { page, page_size: pageSize },
    });
  },

  // Staff: Create Home & Living
  createHomeLiving(homeData) {
    return api.post('/staff/home-living/', homeData);
  },

  // Staff: Update Home & Living
  updateHomeLiving(id, homeData) {
    return api.put(`/staff/home-living/${id}/`, homeData);
  },

  // Guest + Staff: Get Sports & Outdoors
  getSportsOutdoors(page = 1, pageSize = 12) {
    return api.get('/staff/sports-outdoors/', {
      params: { page, page_size: pageSize },
    });
  },

  // Staff: Create Sports & Outdoors
  createSportsOutdoors(sportsData) {
    return api.post('/staff/sports-outdoors/', sportsData);
  },

  // Staff: Update Sports & Outdoors
  updateSportsOutdoors(id, sportsData) {
    return api.put(`/staff/sports-outdoors/${id}/`, sportsData);
  },

  // Guest + Staff: Get Beauty & Health
  getBeautyHealth(page = 1, pageSize = 12) {
    return api.get('/staff/beauty-health/', {
      params: { page, page_size: pageSize },
    });
  },

  // Staff: Create Beauty & Health
  createBeautyHealth(beautyData) {
    return api.post('/staff/beauty-health/', beautyData);
  },

  // Staff: Update Beauty & Health
  updateBeautyHealth(id, beautyData) {
    return api.put(`/staff/beauty-health/${id}/`, beautyData);
  },

  // Guest + Staff: Get Toys & Games
  getToysGames(page = 1, pageSize = 12) {
    return api.get('/staff/toys-games/', {
      params: { page, page_size: pageSize },
    });
  },

  // Staff: Create Toys & Games
  createToysGames(toysData) {
    return api.post('/staff/toys-games/', toysData);
  },

  // Staff: Update Toys & Games
  updateToysGames(id, toysData) {
    return api.put(`/staff/toys-games/${id}/`, toysData);
  },

  // Guest + Staff: Get Automotive
  getAutomotive(page = 1, pageSize = 12) {
    return api.get('/staff/automotive/', {
      params: { page, page_size: pageSize },
    });
  },

  // Staff: Create Automotive
  createAutomotive(autoData) {
    return api.post('/staff/automotive/', autoData);
  },

  // Staff: Update Automotive
  updateAutomotive(id, autoData) {
    return api.put(`/staff/automotive/${id}/`, autoData);
  },

  // Guest + Staff: Get Food & Grocery
  getFoodGrocery(page = 1, pageSize = 12) {
    return api.get('/staff/food-grocery/', {
      params: { page, page_size: pageSize },
    });
  },

  // Staff: Create Food & Grocery
  createFoodGrocery(foodData) {
    return api.post('/staff/food-grocery/', foodData);
  },

  // Staff: Update Food & Grocery
  updateFoodGrocery(id, foodData) {
    return api.put(`/staff/food-grocery/${id}/`, foodData);
  },

  // Guest + Staff: Get Office Supplies
  getOfficeSupplies(page = 1, pageSize = 12) {
    return api.get('/staff/office-supplies/', {
      params: { page, page_size: pageSize },
    });
  },

  // Staff: Create Office Supplies
  createOfficeSupplies(officeData) {
    return api.post('/staff/office-supplies/', officeData);
  },

  // Staff: Update Office Supplies
  updateOfficeSupplies(id, officeData) {
    return api.put(`/staff/office-supplies/${id}/`, officeData);
  },
};

export default ProductService;
