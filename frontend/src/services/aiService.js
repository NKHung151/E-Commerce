import axios from 'axios';

const API_BASE = 'http://localhost:8080';

export const aiService = {
    getRecommendations: async (userId, topN = 5, context = "") => {
        try {
            const response = await axios.get(`${API_BASE}/recommend`, {
                params: { user_id: userId, top_n: topN, context: context }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch recommendations:', error);
            return { products: [], source: 'error' };
        }
    },

    getSimilarProducts: async (productId, topN = 10) => {
        try {
            const response = await axios.get(`${API_BASE}/recommend/similar`, {
                params: { product_id: productId, top_n: topN }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch similar products:', error);
            return { products: [], source: 'error' };
        }
    },

    getBoughtTogether: async (productId, topN = 3) => {
        try {
            const response = await axios.get(`${API_BASE}/recommend/bought-together`, {
                params: { product_id: productId, top_n: topN }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch bought-together products:', error);
            return { products: [], source: 'error' };
        }
    },

    trackBehavior: async (userId, productId, action) => {
        try {
            await axios.post(`${API_BASE}/behavior/track`, {
                user_id: userId,
                product_id: productId,
                action: action
            });
        } catch (error) {
            console.warn('Failed to track behavior via frontend:', error);
        }
    }
};
