-- 1. Users Table (Firebase Auth UID를 PK로 사용)
CREATE TABLE IF NOT EXISTS users (
    uid VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255),
    display_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_demo BOOLEAN DEFAULT FALSE,
    subscription_status VARCHAR(50),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Trees Table
CREATE TABLE IF NOT EXISTS trees (
    id VARCHAR(128) PRIMARY KEY,
    owner_id VARCHAR(128) REFERENCES users(uid) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    likes INTEGER DEFAULT 0,
    node_count INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tree Comments (trees 하위 컬렉션 분리)
CREATE TABLE IF NOT EXISTS tree_comments (
    id VARCHAR(128) PRIMARY KEY,
    tree_id VARCHAR(128) REFERENCES trees(id) ON DELETE CASCADE,
    user_id VARCHAR(128) REFERENCES users(uid) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Community Posts Table
CREATE TABLE IF NOT EXISTS community_posts (
    id VARCHAR(128) PRIMARY KEY,
    author_id VARCHAR(128) REFERENCES users(uid) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Community Comments (community_posts 하위 컬렉션 분리)
CREATE TABLE IF NOT EXISTS community_comments (
    id VARCHAR(128) PRIMARY KEY,
    post_id VARCHAR(128) REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id VARCHAR(128) REFERENCES users(uid) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. AI Logs Table
CREATE TABLE IF NOT EXISTS ai_logs (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) REFERENCES users(uid) ON DELETE SET NULL,
    action VARCHAR(100),
    prompt TEXT,
    response TEXT,
    model_info VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Community Moderation Logs Table
CREATE TABLE IF NOT EXISTS community_moderation_logs (
    id VARCHAR(128) PRIMARY KEY,
    post_id VARCHAR(128) REFERENCES community_posts(id) ON DELETE SET NULL,
    comment_id VARCHAR(128),
    admin_id VARCHAR(128) REFERENCES users(uid) ON DELETE SET NULL,
    action VARCHAR(50),
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_trees_owner_id ON trees(owner_id);
CREATE INDEX IF NOT EXISTS idx_tree_comments_tree_id ON tree_comments(tree_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);
