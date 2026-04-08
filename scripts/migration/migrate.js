/**
 * Firestore -> Postgres 마이그레이션 스크립트
 * 
 * 주요 기능:
 * 1. 컬렉션 데이터를 순차적으로 읽어 Postgres에 적재
 * 2. 서브컬렉션(comments)을 개별 테이블로 분리 및 외래키 연동
 * 3. Timestamp를 안전하게 변환
 * 4. 멱등성 보장 (여러 번 실행해도 안전하도록 UPSERT 방식 적용)
 */

require('dotenv').config();
const admin = require('firebase-admin');
const { Client } = require('pg');

// Firebase Admin SDK 초기화 (GOOGLE_APPLICATION_CREDENTIALS 환경 변수 사용)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}
const db = admin.firestore();

// Postgres 클라이언트 설정
const pgClient = new Client({
    connectionString: process.env.DATABASE_URL
});

/**
 * Firestore Timestamp를 JS Date 객체로 변환
 */
function toDate(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return new Date(timestamp);
}

/**
 * 최상위 컬렉션 마이그레이션 및 서브컬렉션 처리
 */
async function migrateCollection(collectionName, mapper) {
    console.log(`\n[*] [${collectionName}] 마이그레이션 시작...`);
    const snapshot = await db.collection(collectionName).get();
    let count = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const { query, values } = mapper(doc.id, data);
        
        try {
            await pgClient.query(query, values);
            count++;

            // 서브컬렉션(댓글) 분리 로직
            if (collectionName === 'trees') {
                await migrateSubcollection(doc.ref, 'comments', 'tree_comments', (cid, cdata) => ({
                    query: `
                        INSERT INTO tree_comments (id, tree_id, user_id, text, created_at)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, created_at = EXCLUDED.created_at
                    `,
                    values: [cid, doc.id, cdata.userId, cdata.text || '', toDate(cdata.createdAt) || new Date()]
                }));
            } else if (collectionName === 'community_posts') {
                await migrateSubcollection(doc.ref, 'comments', 'community_comments', (cid, cdata) => ({
                    query: `
                        INSERT INTO community_comments (id, post_id, user_id, text, created_at)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, created_at = EXCLUDED.created_at
                    `,
                    values: [cid, doc.id, cdata.userId, cdata.text || '', toDate(cdata.createdAt) || new Date()]
                }));
            }
        } catch (err) {
            console.error(`[!] ${collectionName} 문서 실패 (${doc.id}):`, err.message);
        }
    }
    console.log(`[+] [${collectionName}] ${count}건 마이그레이션 완료`);
}

/**
 * 서브컬렉션 마이그레이션
 */
async function migrateSubcollection(parentRef, subName, targetTable, mapper) {
    const snapshot = await parentRef.collection(subName).get();
    for (const doc of snapshot.docs) {
        const { query, values } = mapper(doc.id, doc.data());
        try {
            await pgClient.query(query, values);
        } catch (err) {
            console.error(`[!] 서브컬렉션 ${targetTable} 실패 (${doc.id}):`, err.message);
        }
    }
}

async function run() {
    try {
        await pgClient.connect();
        console.log('[*] Postgres 연결 성공.');

        // 1. users
        await migrateCollection('users', (id, data) => ({
            query: `
                INSERT INTO users (uid, email, display_name, role, is_demo, subscription_status, last_login, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (uid) DO UPDATE SET 
                email = EXCLUDED.email, display_name = EXCLUDED.display_name, last_login = EXCLUDED.last_login
            `,
            values: [id, data.email, data.displayName, data.role || 'user', data.isDemo || false, data.subscriptionStatus, toDate(data.lastLogin), toDate(data.createdAt) || new Date()]
        }));

        // 2. trees
        await migrateCollection('trees', (id, data) => ({
            query: `
                INSERT INTO trees (id, owner_id, title, data, likes, node_count, thumbnail_url, is_public, last_updated, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO UPDATE SET 
                title = EXCLUDED.title, data = EXCLUDED.data, likes = EXCLUDED.likes, node_count = EXCLUDED.node_count, last_updated = EXCLUDED.last_updated
            `,
            values: [id, data.ownerId, data.title || 'Untitled', data.data || {}, data.likes || 0, data.nodeCount || 0, data.thumbnailUrl, data.isPublic !== false, toDate(data.lastUpdated), toDate(data.createdAt) || new Date()]
        }));

        // 3. community_posts
        await migrateCollection('community_posts', (id, data) => ({
            query: `
                INSERT INTO community_posts (id, author_id, title, content, likes, comment_count, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET 
                title = EXCLUDED.title, content = EXCLUDED.content, likes = EXCLUDED.likes, comment_count = EXCLUDED.comment_count
            `,
            values: [id, data.authorId, data.title || '', data.content || '', data.likes || 0, data.commentCount || 0, toDate(data.createdAt) || new Date(), toDate(data.updatedAt) || new Date()]
        }));

        // 4. ai_logs
        await migrateCollection('ai_logs', (id, data) => ({
            query: `
                INSERT INTO ai_logs (id, user_id, action, prompt, response, model_info, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO NOTHING
            `,
            values: [id, data.userId, data.action, data.prompt, data.response, data.modelInfo, toDate(data.timestamp) || new Date()]
        }));

        // 5. community_moderation_logs
        await migrateCollection('community_moderation_logs', (id, data) => ({
            query: `
                INSERT INTO community_moderation_logs (id, post_id, comment_id, admin_id, action, reason, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO NOTHING
            `,
            values: [id, data.postId, data.commentId, data.adminId, data.action, data.reason, toDate(data.timestamp) || new Date()]
        }));

    } catch (err) {
        console.error('[FATAL] 마이그레이션 실패:', err);
    } finally {
        await pgClient.end();
        console.log('[*] Postgres 연결 종료.');
        process.exit();
    }
}

run();
