import api from './api';

export const ProductService = {
  // Guest + Customer: Get categories
  getCategories() {
    return api.get('/categories/');
  },

  getProducts(page = 1, pageSize = 12, params = {}) {
    return api.get('/products/', {
      params: { page, page_size: pageSize, ...params },
    });
  },

  // Guest + Customer: Get products by category
  getProductsByCategory(categoryId, pageSize = 12) {
    return api.get('/products/', {
      params: { category_id: categoryId, page_size: pageSize },
    });
  },

  // Guest + Customer: Get product details
  getProductById(id, params = {}) {
    return api.get(`/products/${id}/`, { params });
  },

  // Guest + Customer: Search products
  searchProducts(query) {
    return api.get('/products/', {
      params: { search: query },
    });
  },

  // Guest + Customer: Get books
  getBooks(page = 1, pageSize = 12) {
    return api.get('/books/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get book details
  getBookById(id) {
    return api.get(`/books/${id}/`);
  },

  // Guest + Customer: Get electronics
  getElectronics(page = 1, pageSize = 12) {
    return api.get('/electronics/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get electronics details
  getElectronicsById(id) {
    return api.get(`/electronics/${id}/`);
  },

  // Guest + Customer: Get fashion
  getFashion(page = 1, pageSize = 12) {
    return api.get('/fashion/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get fashion details
  getFashionById(id) {
    return api.get(`/fashion/${id}/`);
  },

  // Guest + Customer: Get Home & Living
  getHomeLiving(page = 1, pageSize = 12) {
    return api.get('/home-living/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get Home & Living details
  getHomeLivingById(id) {
    return api.get(`/home-living/${id}/`);
  },

  // Guest + Customer: Get Sports & Outdoors
  getSportsOutdoors(page = 1, pageSize = 12) {
    return api.get('/sports-outdoors/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get Sports & Outdoors details
  getSportsOutdoorsById(id) {
    return api.get(`/sports-outdoors/${id}/`);
  },

  // Guest + Customer: Get Beauty & Health
  getBeautyHealth(page = 1, pageSize = 12) {
    return api.get('/beauty-health/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get Beauty & Health details
  getBeautyHealthById(id) {
    return api.get(`/beauty-health/${id}/`);
  },

  // Guest + Customer: Get Toys & Games
  getToysGames(page = 1, pageSize = 12) {
    return api.get('/toys-games/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get Toys & Games details
  getToysGamesById(id) {
    return api.get(`/toys-games/${id}/`);
  },

  // Guest + Customer: Get Automotive
  getAutomotive(page = 1, pageSize = 12) {
    return api.get('/automotive/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get Automotive details
  getAutomotiveById(id) {
    return api.get(`/automotive/${id}/`);
  },

  // Guest + Customer: Get Food & Grocery
  getFoodGrocery(page = 1, pageSize = 12) {
    return api.get('/food-grocery/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get Food & Grocery details
  getFoodGroceryById(id) {
    return api.get(`/food-grocery/${id}/`);
  },

  // Guest + Customer: Get Office Supplies
  getOfficeSupplies(page = 1, pageSize = 12) {
    return api.get('/office-supplies/', {
      params: { page, page_size: pageSize },
    });
  },

  // Guest + Customer: Get Office Supplies details
  getOfficeSuppliesById(id) {
    return api.get(`/office-supplies/${id}/`);
  },
};

export default ProductService;
