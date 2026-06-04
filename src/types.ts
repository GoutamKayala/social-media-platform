export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  location?: string;
  website?: string;
  profileImage?: string;
  coverImage?: string;
  followersCount: number;
  followingCount: number;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  parentCommentId?: string; // Support for nested comments/replies
}

export interface Follower {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Like {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'reply';
  senderId: string;
  resourceId?: string; // ID of post, comment, message
  extraContent?: string; // For comments: first characters of msg
  read: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SearchFilters {
  query: string;
  type: 'all' | 'users' | 'posts' | 'hashtags';
}

export const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&h=400&auto=format&fit=crop&q=80";

