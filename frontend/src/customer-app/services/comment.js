import api from './api';

const CommentService = {
  getCommentsByProductId: (productId) => {
    return api.get('/comments/', { params: { product_id: productId } });
  },
  createComment: (data) => {
    return api.post('/comments/', data);
  },
  deleteComment: (id) => {
    return api.delete(`/comments/${id}/`);
  }
};

export default CommentService;
