import api from './axios';

export const getConversations = () => api.get('/messages');
export const getMessages = (conversationId) => api.get(`/messages/${conversationId}`);
export const startConversation = (targetId) => api.post('/messages', { targetId });