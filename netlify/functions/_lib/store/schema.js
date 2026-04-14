/**
 * Schema Configuration - Firestore Collection ↔ PostgreSQL Table Mapping
 */
const TABLE_CONFIG = {
  users: {
    table: 'users',
    collection: 'users',
    fields: {
      email: { column: 'email', type: 'text' },
      displayName: { column: 'display_name', type: 'text' },
      photoURL: { column: 'photo_url', type: 'text' },
      role: { column: 'role', type: 'text' },
      isDemo: { column: 'is_demo', type: 'boolean' },
      isAiBot: { column: 'is_ai_bot', type: 'boolean' },
      isPro: { column: 'is_pro', type: 'boolean' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      lastLogin: { column: 'last_login', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
      userId: { column: 'external_user_id', type: 'text' },
    },
  },
  trees: {
    table: 'trees',
    collection: 'trees',
    fields: {
      name: { column: 'name', type: 'text' },
      ownerId: { column: 'owner_id', type: 'text' },
      isDemo: { column: 'is_demo', type: 'boolean' },
      isAiBot: { column: 'is_ai_bot', type: 'boolean' },
      isPublic: { column: 'is_public', type: 'boolean' },
      nodeCount: { column: 'node_count', type: 'number' },
      viewCount: { column: 'view_count', type: 'number' },
      likeCount: { column: 'like_count', type: 'number' },
      shareCount: { column: 'share_count', type: 'number' },
      lastUpdated: { column: 'last_updated', type: 'timestamptz' },
      lastOpened: { column: 'last_opened', type: 'timestamptz' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
    },
  },
  tree_comments: {
    table: 'tree_comments',
    collection: 'comments',
    parentCollection: 'trees',
    parentIdField: 'treeId',
    parentColumn: 'tree_id',
    fields: {
      authorId: { column: 'author_id', type: 'text' },
      authorDisplayName: { column: 'author_display_name', type: 'text' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
      isDeleted: { column: 'is_deleted', type: 'boolean' },
    },
  },
  community_posts: {
    table: 'community_posts',
    collection: 'community_posts',
    fields: {
      authorId: { column: 'author_id', type: 'text' },
      authorDisplayName: { column: 'author_display_name', type: 'text' },
      title: { column: 'title', type: 'text' },
      treeId: { column: 'tree_id', type: 'text' },
      commentCount: { column: 'comment_count', type: 'number' },
      isDeleted: { column: 'is_deleted', type: 'boolean' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
      deletedAt: { column: 'deleted_at', type: 'timestamptz' },
    },
  },
  community_comments: {
    table: 'community_comments',
    collection: 'comments',
    parentCollection: 'community_posts',
    parentIdField: 'postId',
    parentColumn: 'post_id',
    fields: {
      authorId: { column: 'author_id', type: 'text' },
      authorDisplayName: { column: 'author_display_name', type: 'text' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
      isDeleted: { column: 'is_deleted', type: 'boolean' },
      deletedAt: { column: 'deleted_at', type: 'timestamptz' },
    },
  },
  ai_logs: {
    table: 'ai_logs',
    collection: 'ai_logs',
    fields: {
      userId: { column: 'user_id', type: 'text' },
      treeId: { column: 'tree_id', type: 'text' },
      mode: { column: 'mode', type: 'text' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
    },
  },
  community_moderation_logs: {
    table: 'community_moderation_logs',
    collection: 'community_moderation_logs',
    fields: {
      actorUid: { column: 'actor_uid', type: 'text' },
      eventType: { column: 'event_type', type: 'text' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
    },
  },
};

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getCollectionConfig(collection) {
  return TABLE_CONFIG[collection] || null;
}

function getFieldColumn(collection, fieldName) {
  const config = getCollectionConfig(collection);
  if (!config || !config.fields || !config.fields[fieldName]) {
    return null;
  }
  return config.fields[fieldName].column;
}

module.exports = {
  TABLE_CONFIG,
  isPlainObject,
  getCollectionConfig,
  getFieldColumn,
};