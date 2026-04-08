// simple-prototype Supabase helper
(function (window) {
    const SUPABASE_URL = 'https://rcyouuorsyjeiafpasoa.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeW91dW9yc3lqZWlhZnBhc29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTU0NDEsImV4cCI6MjA3OTkzMTQ0MX0.zQDvIe477oy5twxDLY3PupYSLjqPOAirpL-sm_mRYtA';

    let cachedClient = null;

    function getClient() {
        if (!window.supabase) {
            console.warn('[LoveTreeSupabase] Supabase SDK가 로드되지 않았습니다.');
            return null;
        }
        if (!cachedClient) {
            cachedClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        return cachedClient;
    }

    function normalizeNode(row, nodeMoments) {
        return {
            id: row.id,
            title: row.title,
            date: row.occurred_on,
            videoId: row.video_id,
            summary: row.summary || '',
            x: typeof row.position_x === 'number' ? row.position_x : 40 + Math.random() * 600,
            y: typeof row.position_y === 'number' ? row.position_y : 60 + Math.random() * 280,
            moments: nodeMoments || []
        };
    }

    async function fetchTree(slug) {
        const client = getClient();
        if (!client) return null;

        try {
            const { data: artist, error: artistError } = await client
                .from('artists')
                .select('id,slug,name,summary')
                .eq('slug', slug)
                .maybeSingle();

            if (artistError) {
                console.warn('[LoveTreeSupabase] artists 조회 오류', artistError);
                return null;
            }

            if (!artist) {
                return null;
            }

            const { data: nodes, error: nodesError } = await client
                .from('nodes')
                .select('id,title,summary,video_id,occurred_on,position_x,position_y')
                .eq('artist_id', artist.id);

            if (nodesError) {
                console.warn('[LoveTreeSupabase] nodes 조회 오류', nodesError);
                return null;
            }

            const nodeIds = (nodes || []).map((node) => node.id);
            const momentsByNode = {};

            if (nodeIds.length > 0) {
                const { data: moments, error: momentsError } = await client
                    .from('moments')
                    .select('id,node_id,time_label,note,feeling')
                    .in('node_id', nodeIds);

                if (momentsError) {
                    console.warn('[LoveTreeSupabase] moments 조회 오류', momentsError);
                } else if (moments) {
                    moments.forEach((moment) => {
                        if (!momentsByNode[moment.node_id]) {
                            momentsByNode[moment.node_id] = [];
                        }
                        momentsByNode[moment.node_id].push({
                            id: moment.id,
                            time: moment.time_label,
                            text: moment.note,
                            feeling: moment.feeling || 'love'
                        });
                    });
                }
            }

            const { data: connections, error: connectionsError } = await client
                .from('connections')
                .select('from_node_id,to_node_id')
                .eq('artist_id', artist.id);

            if (connectionsError) {
                console.warn('[LoveTreeSupabase] connections 조회 오류', connectionsError);
            }

            return {
                artist,
                nodes: (nodes || []).map((row) => normalizeNode(row, momentsByNode[row.id] || [])),
                connections: (connections || []).map((conn) => ({
                    from: conn.from_node_id,
                    to: conn.to_node_id
                }))
            };
        } catch (error) {
            console.error('[LoveTreeSupabase] fetchTree 실패', error);
            return null;
        }
    }

    async function createNode(node, artist) {
        const client = getClient();
        if (!client || !artist?.id) return null;

        try {
            const payload = {
                artist_id: artist.id,
                title: node.title,
                summary: node.summary || '',
                video_id: node.videoId || null,
                occurred_on: node.date,
                position_x: node.x,
                position_y: node.y
            };

            const { data, error } = await client.from('nodes').insert(payload).select().single();
            if (error) throw error;

            return normalizeNode(data, []);
        } catch (error) {
            console.error('[LoveTreeSupabase] createNode 실패', error);
            return null;
        }
    }

    async function createMoment(nodeId, moment) {
        const client = getClient();
        if (!client || !nodeId) return null;

        try {
            const payload = {
                node_id: nodeId,
                time_label: moment.time,
                note: moment.text,
                feeling: moment.feeling || 'love'
            };

            const { data, error } = await client.from('moments').insert(payload).select().single();
            if (error) throw error;

            return {
                id: data.id,
                time: data.time_label,
                text: data.note,
                feeling: data.feeling || 'love'
            };
        } catch (error) {
            console.error('[LoveTreeSupabase] createMoment 실패', error);
            return null;
        }
    }

    async function createConnection(artistId, fromNodeId, toNodeId) {
        const client = getClient();
        if (!client || !artistId) return null;

        try {
            const payload = {
                artist_id: artistId,
                from_node_id: fromNodeId,
                to_node_id: toNodeId
            };

            const { data, error } = await client.from('connections').insert(payload).select().single();
            if (error) throw error;

            return { from: data.from_node_id, to: data.to_node_id };
        } catch (error) {
            console.error('[LoveTreeSupabase] createConnection 실패', error);
            return null;
        }
    }

    window.LoveTreeSupabase = {
        fetchTree,
        createNode,
        createMoment,
        createConnection
    };
})(window);
