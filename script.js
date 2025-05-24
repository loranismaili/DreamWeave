document.addEventListener('DOMContentLoaded', () => {
    const storyEditor = document.getElementById('storyEditor');
    const generateFullStoryBtn = document.getElementById('generateFullStoryBtn');
    const generatePromptBtn = document.getElementById('generatePromptBtn');
    const nextParagraphBtn = document.getElementById('nextParagraphBtn');
    const plotTwistBtn = document.getElementById('plotTwistBtn');
    const characterIdeaBtn = document.getElementById('characterIdeaBtn');
    const settingDetailBtn = document.getElementById('settingDetailBtn');
    const aiSuggestionDisplay = document.getElementById('aiSuggestionDisplay');
    const insertSuggestionBtn = document.getElementById('insertSuggestionBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');

    let currentSuggestion = '';

    // Function to show/hide loading indicator and disable/enable buttons
    function setLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        generateFullStoryBtn.disabled = isLoading;
        generatePromptBtn.disabled = isLoading;
        nextParagraphBtn.disabled = isLoading;
        plotTwistBtn.disabled = isLoading;
        characterIdeaBtn.disabled = isLoading;
        settingDetailBtn.disabled = isLoading;
        insertSuggestionBtn.disabled = isLoading;
    }

    // Function to display AI suggestion
    function displaySuggestion(suggestion) {
        currentSuggestion = suggestion;
        aiSuggestionDisplay.innerHTML = `<p>${suggestion.replace(/\n/g, '<br>')}</p>`;
        aiSuggestionDisplay.classList.remove('placeholder-text');
        insertSuggestionBtn.style.display = 'block';
    }

    // Function to clear suggestion display
    function clearSuggestion() {
        currentSuggestion = '';
        aiSuggestionDisplay.innerHTML = '<p class="placeholder-text">Suggestions will appear here.</p>';
        insertSuggestionBtn.style.display = 'none';
        errorDisplay.style.display = 'none';
        errorDisplay.textContent = '';
    }

    // Function to display error message
    function displayError(message) {
        errorDisplay.style.display = 'block';
        errorDisplay.textContent = message;
        clearSuggestion(); // Clear any previous suggestion
    }

    // Function to send requests to the PHP backend
    async function sendRequest(type, context = '') {
        setLoading(true);
        clearSuggestion();
        errorDisplay.style.display = 'none'; // Hide previous errors

        try {
            const response = await fetch('api_proxy.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: type,
                    context: context
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                displaySuggestion(data.suggestion);
            } else {
                displayError(data.error || 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            displayError(`Failed to fetch AI suggestion: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    // Event Listeners for AI Assistant buttons
    generateFullStoryBtn.addEventListener('click', () => {
        const prompt = prompt('Enter a prompt or theme for your full story (e.g., "A lone astronaut discovers a hidden civilization on Mars"):');
        if (prompt) {
            sendRequest('full_story', prompt.substring(0, 1000)); // Max 1000 chars for prompt
        }
    });

    generatePromptBtn.addEventListener('click', () => {
        sendRequest('generate_prompt');
    });

    nextParagraphBtn.addEventListener('click', () => {
        const currentStory = storyEditor.value.trim();
        if (currentStory.length > 0) {
            // Send last 500 characters as context
            sendRequest('next_paragraph', currentStory.slice(-500));
        } else {
            displayError('Please write some text in the editor to generate the next paragraph.');
        }
    });

    plotTwistBtn.addEventListener('click', () => {
        const currentStory = storyEditor.value.trim();
        if (currentStory.length > 0) {
            sendRequest('plot_twist', currentStory.slice(-500));
        } else {
            displayError('Please write some text in the editor for a plot twist suggestion.');
        }
    });

    characterIdeaBtn.addEventListener('click', () => {
        const currentStory = storyEditor.value.trim();
        sendRequest('character_idea', currentStory.slice(-500));
    });

    settingDetailBtn.addEventListener('click', () => {
        const currentStory = storyEditor.value.trim();
        sendRequest('setting_detail', currentStory.slice(-500));
    });

    // Event Listener for Insert Suggestion button
    insertSuggestionBtn.addEventListener('click', () => {
        if (currentSuggestion) {
            const cursorPosition = storyEditor.selectionStart;
            const textBefore = storyEditor.value.substring(0, cursorPosition);
            const textAfter = storyEditor.value.substring(storyEditor.selectionEnd, storyEditor.value.length);

            storyEditor.value = textBefore + currentSuggestion + textAfter;

            // Set cursor after the inserted text
            storyEditor.selectionStart = storyEditor.selectionEnd = cursorPosition + currentSuggestion.length;
            storyEditor.focus(); // Keep focus on the editor

            clearSuggestion(); // Clear the suggestion panel after insertion
        }
    });

    // Initialize UI state
    clearSuggestion();
    setLoading(false);
});