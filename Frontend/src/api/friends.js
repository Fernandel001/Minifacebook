import api from './axios';

export const getFriends = () => api.get('/friends');
export const sendFriendRequest = (id) => api.post(`/friends/request/${id}`);
export const acceptFriendRequest = (id) => api.put(`/friends/accept/${id}`);
export const removeFriend = (id) => api.delete(`/friends/${id}`);