document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Corrected IDs based on HTML
    const editor = document.getElementById('editor');
    const storyTitle = document.getElementById('storyTitle');
    const newStoryBtn = document.getElementById('newStoryBtn');
    const saveStoryBtn = document.getElementById('saveStoryBtn');
    const exportStoryBtn = document.getElementById('exportStoryBtn');
    const formatBtn = document.getElementById('formatBtn');
    const distractionFreeBtn = document.getElementById('distractionFreeBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const toggleAiPanelBtn = document.getElementById('toggleAiPanelBtn'); // New button for mobile AI panel

    const inspirationCards = document.querySelectorAll('.inspiration-card');
    const quickActions = document.querySelectorAll('.quick-action');

    // New: "Generate Full Story" button
    const generateFullStoryBtn = document.getElementById('generateFullStoryBtn'); // Added this line

    const generateBtn = document.getElementById('generateBtn');
    const improveBtn = document.getElementById('improveBtn');
    const suggestionDisplay = document.getElementById('suggestionDisplay');
    const insertSuggestionBtn = document.getElementById('insertSuggestionBtn');
    const regenerateSuggestionBtn = document.getElementById('regenerateSuggestionBtn');
    const aiLoading = document.getElementById('aiLoading');
    const errorDisplay = document.getElementById('errorDisplay');

    const wordCountDisplay = document.getElementById('wordCount');
    const characterCountDisplay = document.getElementById('characterCount');
    const readTimeDisplay = document.getElementById('readTime');

    const creativitySlider = document.getElementById('creativitySlider');
    const creativityValueDisplay = document.getElementById('creativityValue');

    const appContainer = document.querySelector('.app-container'); // Get the main app container

    // State
    let currentSuggestion = '';
    let lastRequestType = '';
    let lastRequestContext = '';
    let debounceTimer;

    // Constants
    const WORDS_PER_MINUTE = 200; // Average reading speed

    // Initialize
    updateCreativityDisplay();
    loadSavedStory();
    setupEventListeners();
    updateCounters(); // Initial update after loading story
    loadTheme(); // Load theme on startup

    function setupEventListeners() {
        // Story editor events
        editor.addEventListener('input', handleEditorInput);
        storyTitle.addEventListener('input', () => {
            localStorage.setItem('dreamweaver_story_title', storyTitle.value);
        });

        // Story actions
        newStoryBtn.addEventListener('click', clearDraft);
        saveStoryBtn.addEventListener('click', saveStoryManually);
        exportStoryBtn.addEventListener('click', downloadStory);
        formatBtn.addEventListener('click', formatText);

        // Distraction Free Button functionality
        distractionFreeBtn.addEventListener('click', toggleDistractionFreeMode);

        // Theme Toggle functionality
        themeToggleBtn.addEventListener('click', toggleTheme);

        // AI Panel Toggle (mobile-only) functionality
        toggleAiPanelBtn.addEventListener('click', toggleAiPanel);

        // AI action buttons
        // Event listener for the new "Generate Full Story" button
        if (generateFullStoryBtn) {
            generateFullStoryBtn.addEventListener('click', () => {
                const context = getStoryContext(); // Use current editor content as prompt for full story
                sendRequest('full_story', context); // Call with 'full_story' type
            });
        }

        generateBtn.addEventListener('click', handleGenerateIdeas);
        improveBtn.addEventListener('click', () => sendRequest('improve_current', getStoryContext()));

        // Dynamic inspiration cards
        inspirationCards.forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type; // e.g., 'character', 'setting', 'plot'
                let requestType;
                let promptSuffix = '';

                switch(type) {
                    case 'character':
                        requestType = 'character_idea';
                        promptSuffix = 'Generate a detailed character idea based on the current story context.';
                        break;
                    case 'setting':
                        requestType = 'setting_detail';
                        promptSuffix = 'Generate descriptive details for a setting based on the current story context.';
                        break;
                    case 'plot':
                        requestType = 'plot_twist';
                        promptSuffix = 'Suggest an unexpected plot twist for the current story.';
                        break;
                    default:
                        requestType = 'generate_ideas'; // Fallback
                        promptSuffix = 'Generate general ideas based on the current story context.';
                }
                const context = getStoryContext() + (editor.textContent.trim() ? `\n\n${promptSuffix}` : '');
                sendRequest(requestType, context);
            });
        });

        // Quick action buttons
        quickActions.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                let requestType;
                let promptSuffix = '';

                switch(action) {
                    case 'continue':
                        requestType = 'next_paragraph';
                        promptSuffix = 'Continue the story from the last sentence or paragraph.';
                        break;
                    case 'describe':
                        requestType = 'describe_scene';
                        promptSuffix = 'Elaborate and describe the current scene or character in more detail. Focus on sensory details.';
                        break;
                    case 'rewrite':
                        requestType = 'rewrite_text';
                        promptSuffix = 'Rewrite the last paragraph or selected text to make it more engaging, dramatic, or concise.';
                        break;
                    default:
                        // This case shouldn't be reached if data-action is always one of the above
                        console.warn('Unknown quick action:', action);
                        return;
                }
                // For quick actions, the context is usually the relevant part of the story
                const context = getStoryContext() + (editor.textContent.trim() ? `\n\n${promptSuffix}` : '');
                sendRequest(requestType, context);
            });
        });

        // Suggestion actions
        insertSuggestionBtn.addEventListener('click', insertSuggestion);
        regenerateSuggestionBtn.addEventListener('click', regenerateSuggestion);

        // Creativity control
        creativitySlider.addEventListener('input', updateCreativityDisplay);
    }

    function handleEditorInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            saveStory(); // Save automatically on input
            updateCounters();
        }, 500); // Debounce to prevent excessive saving
    }

    function saveStory() {
        localStorage.setItem('dreamweaver_story', editor.innerHTML); // Save innerHTML for contenteditable
        localStorage.setItem('dreamweaver_story_title', storyTitle.value);
    }

    function loadSavedStory() {
        const savedStory = localStorage.getItem('dreamweaver_story');
        const savedTitle = localStorage.getItem('dreamweaver_story_title');
        if (savedStory) {
            editor.innerHTML = savedStory; // Load innerHTML
        }
        if (savedTitle) {
            storyTitle.value = savedTitle;
        }
    }

    function saveStoryManually() {
        saveStory();
        displayMessage('Story saved successfully!', 'success');
    }

    function downloadStory() {
        const title = storyTitle.value.trim() || 'Untitled Story';
        const content = editor.innerText; // Use innerText to get plain text
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${title}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        displayMessage('Story exported as text!', 'success');
    }

    function clearDraft() {
        if (confirm('Are you sure you want to start a new story? Your current unsaved progress will be lost.')) {
            editor.innerHTML = '';
            storyTitle.value = '';
            localStorage.removeItem('dreamweaver_story');
            localStorage.removeItem('dreamweaver_story_title');
            updateCounters();
            displayMessage('New story started!', 'success');
        }
    }

    function formatText() {
        // Example: Basic formatting. You might want more sophisticated logic.
        // For contenteditable, direct manipulation or a rich-text editor library is better.
        // This is a placeholder for actual formatting logic.
        // For now, let's just make sure it triggers a visual feedback.
        displayMessage('Text formatting applied!', 'info');
    }

    function toggleDistractionFreeMode() {
        appContainer.classList.toggle('distraction-free');
        const isDistractionFree = appContainer.classList.contains('distraction-free');
        distractionFreeBtn.title = isDistractionFree ? 'Exit Distraction Free Mode' : 'Distraction Free Mode';
        distractionFreeBtn.querySelector('i').className = isDistractionFree ? 'fas fa-compress-alt' : 'fas fa-expand';
        displayMessage(isDistractionFree ? 'Entered distraction-free mode!' : 'Exited distraction-free mode.', 'info');
    }

    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggleBtn.querySelector('span').textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        themeToggleBtn.querySelector('i').className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        displayMessage(`Switched to ${newTheme} mode!`, 'info');
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        themeToggleBtn.querySelector('span').textContent = savedTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        themeToggleBtn.querySelector('i').className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    function toggleAiPanel() {
        const aiPanel = document.querySelector('.ai-panel');
        aiPanel.classList.toggle('active');
        const isActive = aiPanel.classList.contains('active');
        toggleAiPanelBtn.title = isActive ? 'Hide AI Panel' : 'Show AI Panel';
        // You might want to change the icon too, e.g., robot vs times
        toggleAiPanelBtn.querySelector('i').className = isActive ? 'fas fa-times' : 'fas fa-robot';
    }


    function updateCounters() {
        const text = editor.textContent.trim(); // Use textContent for counts
        const wordCount = text ? text.split(/\s+/).filter(word => word.length > 0).length : 0; // Filter out empty strings from split
        const charCount = text.length;
        const readTime = wordCount > 0 ? Math.ceil(wordCount / WORDS_PER_MINUTE) : 0;

        wordCountDisplay.textContent = wordCount;
        characterCountDisplay.textContent = charCount;
        readTimeDisplay.textContent = readTime;
    }

    function updateCreativityDisplay() {
        creativityValueDisplay.textContent = parseFloat(creativitySlider.value).toFixed(1);
    }

    function getStoryContext() {
        // Get the last N characters or paragraphs for context
        const fullText = editor.textContent.trim();
        const maxContextLength = 1500; // Limit context sent to AI
        if (fullText.length > maxContextLength) {
            // Get the last N characters, try to end at a natural break (like end of sentence)
            let context = fullText.substring(fullText.length - maxContextLength);
            const lastPeriodIndex = context.lastIndexOf('.');
            const lastExclamationIndex = context.lastIndexOf('!');
            const lastQuestionIndex = context.lastIndexOf('?');
            const lastBreakIndex = Math.max(lastPeriodIndex, lastExclamationIndex, lastQuestionIndex);

            if (lastBreakIndex > -1 && lastBreakIndex > maxContextLength * 0.75) { // Ensure it's not too far back
                context = context.substring(lastBreakIndex + 1).trim();
            } else {
                // Fallback to cutting at word boundary if no good sentence end found
                const lastSpaceIndex = context.lastIndexOf(' ');
                if (lastSpaceIndex > -1) {
                    context = context.substring(lastSpaceIndex + 1).trim();
                }
            }
             if (context.length === 0 && fullText.length > 0) { // If cutting resulted in empty string, just take last part
                context = fullText.substring(fullText.length - 200).trim(); // Take last 200 chars as minimal context
            }
            return context;
        }
        return fullText;
    }

    function setLoading(isLoading) {
        if (isLoading) {
            aiLoading.classList.add('active');
            suggestionDisplay.classList.add('loading-skeleton');
            disableButtons(true);
            errorDisplay.style.display = 'none'; // Hide error when loading
            clearSuggestionDisplay(); // Clear display while loading
        } else {
            aiLoading.classList.remove('active');
            suggestionDisplay.classList.remove('loading-skeleton');
            disableButtons(false);
        }
    }

    function disableButtons(disabled) {
        const buttons = [
            generateFullStoryBtn, // Include the new button
            generateBtn, improveBtn, insertSuggestionBtn, regenerateSuggestionBtn,
            newStoryBtn, saveStoryBtn, exportStoryBtn, formatBtn, distractionFreeBtn,
            themeToggleBtn, toggleAiPanelBtn
        ];
        buttons.forEach(btn => {
            if (btn) btn.disabled = disabled; // Check if button exists before disabling
        });

        inspirationCards.forEach(card => card.style.pointerEvents = disabled ? 'none' : 'auto');
        quickActions.forEach(btn => btn.style.pointerEvents = disabled ? 'none' : 'auto');
        editor.contentEditable = !disabled; // Disable editing during AI request
        storyTitle.disabled = disabled; // Disable title editing
    }

    async function sendRequest(type, context = '') {
        setLoading(true);
        clearSuggestion(); // Clear previous suggestion text

        lastRequestType = type;
        lastRequestContext = context; // Store full context, not just last part

        try {
            const response = await fetch('api_proxy.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    type: type,
                    context: context, // Send the determined context
                    creativity: parseFloat(creativitySlider.value)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.suggestion) {
                displaySuggestion(data.suggestion, type);
                currentSuggestion = data.suggestion; // Store for insert/regenerate
                insertSuggestionBtn.style.display = 'inline-flex';
                regenerateSuggestionBtn.style.display = 'inline-flex';
                errorDisplay.style.display = 'none'; // Hide error on success
            } else {
                displayError('No suggestion received. Please try again.');
                insertSuggestionBtn.style.display = 'none';
                regenerateSuggestionBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error generating AI response:', error);
            displayError(`Failed to generate: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    function displaySuggestion(suggestion, type) {
        suggestionDisplay.innerHTML = `
            <div class="suggestion-item">
                <div class="suggestion-title">
                    <i class="fas fa-magic"></i>
                    <span>${formatTypeLabel(type)} Suggestion</span>
                </div>
                <div class="suggestion-text">${suggestion}</div>
            </div>
        `;
    }

    function formatTypeLabel(type) {
        // Converts 'next_paragraph' to 'Next Paragraph' etc.
        return type.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }

    function clearSuggestionDisplay() {
        suggestionDisplay.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lightbulb"></i>
                <p>Ask for inspiration or guidance to enhance your story</p>
            </div>
        `;
        insertSuggestionBtn.style.display = 'none';
        regenerateSuggestionBtn.style.display = 'none';
        currentSuggestion = '';
    }

    function clearSuggestion() {
        suggestionDisplay.innerHTML = '';
        insertSuggestionBtn.style.display = 'none';
        regenerateSuggestionBtn.style.display = 'none';
        currentSuggestion = '';
    }

    function insertSuggestion() {
        if (currentSuggestion) {
            // Append the suggestion to the editor content
            editor.innerHTML += `\n\n${currentSuggestion}`;
            // Move cursor to the end
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editor);
            range.collapse(false); // collapse to end
            sel.removeAllRanges();
            sel.addRange(range);
            editor.focus();
            updateCounters();
            displayMessage('Suggestion inserted!', 'success');
            clearSuggestionDisplay(); // Clear suggestion after insertion
        }
    }

    function regenerateSuggestion() {
        if (lastRequestType && lastRequestContext) {
            displayMessage('Regenerating suggestion...', 'info');
            sendRequest(lastRequestType, lastRequestContext);
        } else {
            displayError('No previous request to regenerate.');
        }
    }

    function handleGenerateIdeas() {
        // This button will now default to 'generate_ideas' but can be extended
        const context = getStoryContext();
        sendRequest('generate_ideas', context);
    }

    function displayError(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        // Clear error after some time if desired
        setTimeout(() => {
            errorDisplay.style.display = 'none';
        }, 5000);
    }

    function displayMessage(message, type) {
        const notification = document.createElement('div');
        notification.classList.add('format-notification');
        notification.textContent = message;

        // Apply type-specific styling
        if (type === 'success') {
            notification.style.backgroundColor = 'var(--success)';
        } else if (type === 'info') {
            notification.style.backgroundColor = 'var(--accent)';
        } else if (type === 'error') {
            notification.style.backgroundColor = 'var(--error)';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.addEventListener('transitionend', () => {
                notification.remove();
            });
        }, 3000);
    }

});