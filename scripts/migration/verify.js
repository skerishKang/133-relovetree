/**
 * 마이그레이션 검증 스크립트
 * 
 * 주요 기능:
 * 1. Row Count 비교: Firestore 문서 개수와 Postgres row 개수 일치 확인
 * 2. 샘플 레코드 비교: 특정 레코드의 주요 필드가 정확히 맵핑되었는지 확인
 * 3. 무결성 체크 (Orphan Data): 부모가 없는 하위 데이터가 발생했는지 확인
 */

require('dotenv').config();
const admin = require('firebase-admin');
const { Client } = require('pg');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}
const db = admin.firestore();

const pgClient = new Client({
    connectionString: process.env.DATABASE_URL
});

/**
 * 1. 데이터 개수 비교
 */
async function verifyCounts() {
    console.log('\n[1] 데이터 개수(Row Count) 비교...');
    const collections = [
        { fire: 'users', pg: 'users' },
        { fire: 'trees', pg: 'trees' },
        { fire: 'community_posts', pg: 'community_posts' },
        { fire: 'ai_logs', pg: 'ai_logs' },
        { fire: 'community_moderation_logs', pg: 'community_moderation_logs' }
    ];

    for (const item of collections) {
        const fireSnap = await db.collection(item.fire).get();
        const pgRes = await pgClient.query(`SELECT COUNT(*) FROM ${item.pg}`);
        
        const fireCount = fireSnap.size;
        const pgCount = parseInt(pgRes.rows[0].count);

        const status = fireCount === pgCount ? 'OK' : 'DIFF';
        console.log(` - ${item.fire.padEnd(25)}: Firestore=${fireCount}, PG=${pgCount} [${status}]`);
    }
}

/**
 * 2. 샘플 레코드 비교 (Trees)
 */
async function verifySampleData() {
    console.log('\n[2] 샘플 레코드 검증 (Trees)...');
    const treesSnap = await db.collection('trees').limit(5).get();
    
    if (treesSnap.empty) {
        console.log(' - 검증할 샘플 데이터가 없습니다.');
        return;
    }

    for (const doc of treesSnap.docs) {
        const fireData = doc.data();
        const pgRes = await pgClient.query('SELECT * FROM trees WHERE id = $1', [doc.id]);
        
        if (pgRes.rows.length === 0) {
            console.log(` [!] PG에 누락됨: Tree ID ${doc.id}`);
            continue;
        }

        const pgData = pgRes.rows[0];
        const titleMatch = (fireData.title || 'Untitled') === pgData.title;
        const ownerMatch = fireData.ownerId === pgData.owner_id;
        const likesMatch = (fireData.likes || 0) === pgData.likes;

        const matchStr = (titleMatch && ownerMatch && likesMatch) ? 'Match' : 'MISMATCH';
        console.log(` - Tree ${doc.id.substring(0,8)}... : [${matchStr}] Title=${titleMatch}, Owner=${ownerMatch}, Likes=${likesMatch}`);
    }
}

/**
 * 3. 데이터 무결성 체크 (Orphan Data)
 */
async function checkIntegrity() {
    console.log('\n[3] 무결성 체크 (고아 데이터)...');
    
    // 주인이 없는 트리 (owner_id가 users에 없음)
    const treeOrphans = await pgClient.query(`
        SELECT t.id, t.owner_id FROM trees t 
        LEFT JOIN users u ON t.owner_id = u.uid 
        WHERE u.uid IS NULL AND t.owner_id IS NOT NULL
    `);
    console.log(` - 주인이 없는 트리 (Orphan Trees): ${treeOrphans.rowCount} 건`);

    // 트리가 없는 댓글
    const treeCommentOrphans = await pgClient.query(`
        SELECT c.id FROM tree_comments c 
        LEFT JOIN trees t ON c.tree_id = t.id 
        WHERE t.id IS NULL
    `);
    console.log(` - 트리가 없는 댓글 (Orphan Tree Comments): ${treeCommentOrphans.rowCount} 건`);

    // 작성자가 없는 커뮤니티 게시글
    const postOrphans = await pgClient.query(`
        SELECT p.id FROM community_posts p
        LEFT JOIN users u ON p.author_id = u.uid
        WHERE u.uid IS NULL AND p.author_id IS NOT NULL
    `);
    console.log(` - 작성자가 없는 게시글 (Orphan Posts): ${postOrphans.rowCount} 건`);
}

async function run() {
    try {
        await pgClient.connect();
        await verifyCounts();
        await verifySampleData();
        await checkIntegrity();
    } catch (err) {
        console.error('[FATAL] 검증 중 오류 발생:', err);
    } finally {
        await pgClient.end();
        process.exit();
    }
}

run();
