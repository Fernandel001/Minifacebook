import api from './axios';

export const getFeed = () => api.get('/posts/feed');
export const getUserPosts = (userId) => api.get(`/posts/user/${userId}`);
export const createPost = (formData) => api.post('/posts', formData);
export const updatePost = (id, data) => api.put(`/posts/${id}`, data);
export const deletePost = (id) => api.delete(`/posts/${id}`);
export const likePost = (id) => api.post(`/posts/${id}/like`);
export const getComments = (id) => api.get(`/posts/${id}/comments`);
export const addComment = (id, content) => api.post(`/posts/${id}/comments`, { content });
export const deleteComment = (id) => api.delete(`/posts/comments/${id}`);
