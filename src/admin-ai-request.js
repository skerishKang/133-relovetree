/**
 * Admin AI Payload & Request Helper
 */
(function () {
    /**
     * Build AI request payload for different modes
     */
    function buildAiRequestPayload(mode, options) {
        const opts = options || {};
        
        if (mode === 'tree') {
            return {
                mode: 'tree',
                payload: {
                    prompt: opts.prompt || '',
                    count: opts.count || 4
                }
            };
        }
        
        if (mode === 'comment') {
            return {
                mode: 'comment',
                payload: {
                    prompt: opts.prompt || '',
                    nodeTitle: opts.nodeTitle || ''
                }
            };
        }
        
        return null;
    }

    /**
     * Format prompt with user profile and settings
     */
    function formatBotPrompt(basePrompt, userData) {
        let finalPrompt = basePrompt || '';
        const buildDesc = window.AdminAi ? window.AdminAi.buildBotSettingsDescription : window.buildBotSettingsDescription;

        if (userData) {
            if (userData.botProfile) {
                finalPrompt += '\n\n[봇 프로필]\n' + String(userData.botProfile);
            }
            if (userData.botSettings && typeof buildDesc === 'function') {
                finalPrompt += buildDesc(userData.botSettings);
            }
        }
        return finalPrompt;
    }

    /**
     * Execute AI request
     */
    async function executeAiRequest(mode, options) {
        const payload = buildAiRequestPayload(mode, options);
        if (!payload || !window.AI_HELPER_ENDPOINT) return null;

        try {
            const res = await fetch(window.AI_HELPER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.error(`AI ${mode} request failed:`, e);
        }
        return null;
    }

    window.AdminAiRequest = {
        buildAiRequestPayload,
        formatBotPrompt,
        executeAiRequest
    };
})();
