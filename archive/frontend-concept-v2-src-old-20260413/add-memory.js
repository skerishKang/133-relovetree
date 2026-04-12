// frontend-concept-v2/src/add-memory.js

document.addEventListener('DOMContentLoaded', () => {
    const btnSubmit = document.getElementById('btn-submit-memory');
    if (!btnSubmit) return;

    btnSubmit.addEventListener('click', async () => {
        const idleText = btnSubmit.querySelector('.state-idle');
        const loadingText = btnSubmit.querySelector('.state-loading');

        // Start Submitting State
        btnSubmit.classList.add('is-submitting');
        idleText.classList.add('is-hidden');
        loadingText.classList.remove('is-hidden');

        try {
            // Mocking a backend request
            await mockSaveMemory(); 
            
            // On Success: Redirect or Success Message
            window.location.href = 'mobile-add-branch.html';
        } catch (error) {
            // Error Handling: UI Recovery
            console.error('Planting failed:', error);
            
            btnSubmit.classList.remove('is-submitting');
            loadingText.classList.add('is-hidden');
            idleText.classList.remove('is-hidden');
            
            // Emotional Error Feedback
            idleText.textContent = "기억을 심지 못했어요. 다시 시도해볼까요?";
            btnSubmit.style.background = 'var(--color-primary-dark)'; 
            
            // Recovery to original state after 3s
            setTimeout(() => {
                idleText.textContent = "러브트리에 심기";
                btnSubmit.style.background = '';
            }, 3000);
        }
    });
});

/**
 * Mock saving memory to a backend
 */
async function mockSaveMemory() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate 30% chance of failure for concept testing
            if (Math.random() < 0.3) {
                reject(new Error("Internal Server Error (500)"));
            } else {
                resolve({ success: true });
            }
        }, 1500);
    });
}
