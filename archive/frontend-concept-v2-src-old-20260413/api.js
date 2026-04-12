/**
 * Mock API for Lovetree UI Concept
 * Handles creating moments and navigating to personal trees
 */

async function createMoment(momentData) {
    console.log("Simulating API call: Creating new moment...", momentData);
    
    // Simulate server processing time
    return new Promise((resolve) => {
        setTimeout(() => {
            // Push to the shared dummy state if available
            if (typeof dummyMemories !== 'undefined') {
                dummyMemories.push({
                    id: "m" + (dummyMemories.length + 1),
                    ...momentData
                });
            }
            
            console.log("Moment created successfully. Redirecting...");
            
            // Final Step: Redirect to My Trees Dashboard
            window.location.href = 'my-trees.html';
            
            resolve({ success: true });
        }, 1000);
    });
}
