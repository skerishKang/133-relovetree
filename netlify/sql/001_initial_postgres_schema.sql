CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text,
  display_name text,
  photo_url text,
  role text NOT NULL DEFAULT 'free',
  is_demo boolean NOT NULL DEFAULT false,
  is_ai_bot boolean NOT NULL DEFAULT false,
  is_pro boolean NOT NULL DEFAULT false,
  external_user_id text,
  created_at timestamptz,
  last_login timestamptz,
  updated_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);

CREATE TABLE IF NOT EXISTS trees (
  id text PRIMARY KEY,
  owner_id text REFERENCES users(id) ON DELETE SET NULL,
  name text,
  is_demo boolean NOT NULL DEFAULT false,
  is_ai_bot boolean NOT NULL DEFAULT false,
  node_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  share_count integer NOT NULL DEFAULT 0,
  created_at timestamptz,
  updated_at timestamptz,
  last_updated timestamptz,
  last_opened timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_trees_owner_id ON trees(owner_id);
CREATE INDEX IF NOT EXISTS idx_trees_last_updated ON trees(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_trees_like_count ON trees(like_count DESC);

CREATE TABLE IF NOT EXISTS tree_comments (
  id text NOT NULL,
  tree_id text NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  author_id text REFERENCES users(id) ON DELETE SET NULL,
  author_display_name text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tree_id, id)
);

CREATE INDEX IF NOT EXISTS idx_tree_comments_tree_id_created_at
  ON tree_comments(tree_id, created_at ASC);

CREATE TABLE IF NOT EXISTS community_posts (
  id text PRIMARY KEY,
  author_id text REFERENCES users(id) ON DELETE SET NULL,
  author_display_name text,
  title text,
  tree_id text REFERENCES trees(id) ON DELETE SET NULL,
  comment_count integer NOT NULL DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
  ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_comment_count
  ON community_posts(comment_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id
  ON community_posts(author_id);

CREATE TABLE IF NOT EXISTS community_comments (
  id text NOT NULL,
  post_id text NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id text REFERENCES users(id) ON DELETE SET NULL,
  author_display_name text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (post_id, id)
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id_created_at
  ON community_comments(post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS ai_logs (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  tree_id text REFERENCES trees(id) ON DELETE SET NULL,
  mode text,
  created_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_tree_id ON ai_logs(tree_id);

CREATE TABLE IF NOT EXISTS community_moderation_logs (
  id text PRIMARY KEY,
  actor_uid text REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  created_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_community_moderation_logs_created_at
  ON community_moderation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_moderation_logs_event_type
  ON community_moderation_logs(event_type);
