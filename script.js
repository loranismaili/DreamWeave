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

    function displaySuggestion(suggestion) {
        currentSuggestion = suggestion;
        aiSuggestionDisplay.innerHTML = `<p>${suggestion.replace(/\n/g, '<br>')}</p>`;
        aiSuggestionDisplay.classList.remove('placeholder-text');
        insertSuggestionBtn.style.display = 'block';
    }

    function clearSuggestion() {
        currentSuggestion = '';
        aiSuggestionDisplay.innerHTML = '<p class="placeholder-text">Suggestions will appear here.</p>';
        insertSuggestionBtn.style.display = 'none';
        errorDisplay.style.display = 'none';
        errorDisplay.textContent = '';
    }

    function displayError(message) {
        errorDisplay.style.display = 'block';
        errorDisplay.textContent = message;
        clearSuggestion();
    }

    async function sendRequest(type, context = '') {
        setLoading(true);
        clearSuggestion();
        errorDisplay.style.display = 'none';

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

            const responseText = await response.text();
            console.log('Raw response text:', responseText);

            const data = JSON.parse(responseText);

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

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

    generateFullStoryBtn.addEventListener('click', () => {
        const userPrompt = prompt('Enter a prompt or theme for your full story (e.g., "A lone astronaut discovers a hidden civilization on Mars"):');
        if (userPrompt) {
            sendRequest('full_story', userPrompt.substring(0, 1000));
        }
    });

    generatePromptBtn.addEventListener('click', () => {
        sendRequest('generate_prompt');
    });

    nextParagraphBtn.addEventListener('click', () => {
        const currentStory = storyEditor.value.trim();
        if (currentStory.length > 0) {
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

    insertSuggestionBtn.addEventListener('click', () => {
        if (currentSuggestion) {
            const cursorPosition = storyEditor.selectionStart;
            const textBefore = storyEditor.value.substring(0, cursorPosition);
            const textAfter = storyEditor.value.substring(storyEditor.selectionEnd, storyEditor.value.length);

            storyEditor.value = textBefore + currentSuggestion + textAfter;

            storyEditor.selectionStart = storyEditor.selectionEnd = cursorPosition + currentSuggestion.length;
            storyEditor.focus();

            clearSuggestion();
        }
    });

    clearSuggestion();
    setLoading(false);
});
