const documentStore = require('../document-store');

async function listTrees(options) {
  const limit = Math.max(1, Math.min(100, Number(options && options.limit) || 50));
  const where = [];
  if (options && options.ownerId) {
    where.push({ field: 'ownerId', op: '==', value: options.ownerId });
  }

  const docs = await documentStore.queryCollection('trees', {
    where,
    orderBy: [{ field: 'lastUpdated', direction: 'desc' }],
    limit,
  });

  return docs.map(({ id, data }) => ({
    id,
    name: data.name || id,
    ownerId: data.ownerId || null,
    nodeCount:
      typeof data.nodeCount === 'number'
        ? data.nodeCount
        : Array.isArray(data.nodes)
        ? data.nodes.length
        : 0,
    viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
    likeCount:
      typeof data.likeCount === 'number'
        ? data.likeCount
        : Array.isArray(data.likes)
        ? data.likes.length
        : 0,
    shareCount: typeof data.shareCount === 'number' ? data.shareCount : 0,
    isDemo: !!data.isDemo,
    isAiBot: !!data.isAiBot,
    lastUpdated: data.lastUpdated || null,
  }));
}

async function getTree(treeId) {
  return documentStore.getDoc(`trees/${treeId}`);
}

async function updateTree(treeId, updates) {
  return documentStore.setDoc(`trees/${treeId}`, updates, { merge: true });
}

async function createTree(data) {
  // Ensure we are adding to the 'trees' collection
  return documentStore.addDoc('trees', data);
}

module.exports = {
  listTrees,
  getTree,
  updateTree,
  createTree,
};
