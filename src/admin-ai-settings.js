(function () {
    function buildBotSettingsDescription(settings) {
        if (!settings) return '';
        const parts = [];

        if (settings.tone) {
            if (settings.tone === 'over_reactive') parts.push('- 톤: 과몰입 (감탄사와 리액션이 큰 스타일)');
            else if (settings.tone === 'friendly') parts.push('- 톤: 친근 (팬들끼리 편하게 대화하는 느낌)');
            else if (settings.tone === 'calm') parts.push('- 톤: 차분 (설명 위주, 담백한 스타일)');
            else if (settings.tone === 'formal') parts.push('- 톤: 공식 (존댓말, 공지문 같은 느낌)');
        }

        if (settings.fanType) {
            if (settings.fanType === 'fresh') parts.push('- 팬 타입: 입덕러 (최근에 좋아하게 된 팬)');
            else if (settings.fanType === 'core') parts.push('- 팬 타입: 고인물 (활동/정보를 잘 아는 오래된 팬)');
            else if (settings.fanType === 'light') parts.push('- 팬 타입: 라이트팬 (편하게 즐기는 가벼운 팬)');
        }

        if (settings.length) {
            if (settings.length === 'short') parts.push('- 문장 길이: 짧게 (한 문장 정도)');
            else if (settings.length === 'medium') parts.push('- 문장 길이: 보통 (두세 문장 이내)');
            else if (settings.length === 'long') parts.push('- 문장 길이: 길게 (조금 더 자세하게)');
        }

        if (settings.emoji) {
            if (settings.emoji === 'few') parts.push('- 이모지: 거의 사용하지 않음');
            else if (settings.emoji === 'normal') parts.push('- 이모지: 적당히 사용');
            else if (settings.emoji === 'many') parts.push('- 이모지: 자주 사용');
        }

        if (settings.extraNote) {
            parts.push('- 추가 설명: ' + String(settings.extraNote));
        }

        if (!parts.length) return '';

        return '\n\n[봇 설정]\n' + parts.join('\n');
    }

    function buildBotPromptSuffix(botProfile, botSettings) {
        let suffix = '';
        if (botProfile) {
            suffix += '\n\n[봇 프로필]\n' + String(botProfile);
        }
        if (botSettings) {
            suffix += buildBotSettingsDescription(botSettings);
        }
        return suffix;
    }

    window.AdminAiBotSettings = {
        buildBotSettingsDescription,
        buildBotPromptSuffix
    };
    window.buildBotSettingsDescription = buildBotSettingsDescription;
})();