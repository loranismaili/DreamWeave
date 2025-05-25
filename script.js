document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const storyTitle = document.getElementById('storyTitle');
    const newStoryBtn = document.getElementById('newStoryBtn');
    const saveStoryBtn = document.getElementById('saveStoryBtn');
    const exportStoryBtn = document.getElementById('exportStoryBtn');
    const formatBtn = document.getElementById('formatBtn');
    const distractionFreeBtn = document.getElementById('distractionFreeBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const toggleAiPanelBtn = document.getElementById('toggleAiPanelBtn'); 

    const inspirationCards = document.querySelectorAll('.inspiration-card');
    const quickActions = document.querySelectorAll('.quick-action');


    const generateFullStoryBtn = document.getElementById('generateFullStoryBtn');

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

    const appContainer = document.querySelector('.app-container'); 


    let currentSuggestion = '';
    let lastRequestType = '';
    let lastRequestContext = '';
    let debounceTimer;


    const WORDS_PER_MINUTE = 200;


    updateCreativityDisplay();
    loadSavedStory();
    setupEventListeners();
    updateCounters();
    loadTheme(); 

    function setupEventListeners() {

        editor.addEventListener('input', handleEditorInput);
        storyTitle.addEventListener('input', () => {
            localStorage.setItem('dreamweaver_story_title', storyTitle.value);
        });

     
        newStoryBtn.addEventListener('click', clearDraft);
        saveStoryBtn.addEventListener('click', saveStoryManually);
        exportStoryBtn.addEventListener('click', downloadStory);
        formatBtn.addEventListener('click', formatText);

 
        distractionFreeBtn.addEventListener('click', toggleDistractionFreeMode);

      
        themeToggleBtn.addEventListener('click', toggleTheme);

     
        toggleAiPanelBtn.addEventListener('click', toggleAiPanel);

        
       
        if (generateFullStoryBtn) {
            generateFullStoryBtn.addEventListener('click', () => {
                const context = getStoryContext();
                sendRequest('full_story', context); 
            });
        }

        generateBtn.addEventListener('click', handleGenerateIdeas);
        improveBtn.addEventListener('click', () => sendRequest('improve_current', getStoryContext()));

      
        inspirationCards.forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type; 
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
                        requestType = 'generate_ideas'; 
                        promptSuffix = 'Generate general ideas based on the current story context.';
                }
                const context = getStoryContext() + (editor.textContent.trim() ? `\n\n${promptSuffix}` : '');
                sendRequest(requestType, context);
            });
        });

     
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
                      
                        console.warn('Unknown quick action:', action);
                        return;
                }
                
                const context = getStoryContext() + (editor.textContent.trim() ? `\n\n${promptSuffix}` : '');
                sendRequest(requestType, context);
            });
        });

       
        insertSuggestionBtn.addEventListener('click', insertSuggestion);
        regenerateSuggestionBtn.addEventListener('click', regenerateSuggestion);

   
        creativitySlider.addEventListener('input', updateCreativityDisplay);
    }

    function handleEditorInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            saveStory(); 
            updateCounters();
        }, 500); 
    }

    function saveStory() {
        localStorage.setItem('dreamweaver_story', editor.innerHTML); 
        localStorage.setItem('dreamweaver_story_title', storyTitle.value);
    }

    function loadSavedStory() {
        const savedStory = localStorage.getItem('dreamweaver_story');
        const savedTitle = localStorage.getItem('dreamweaver_story_title');
        if (savedStory) {
            editor.innerHTML = savedStory;
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
        const content = editor.innerText;
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
        toggleAiPanelBtn.querySelector('i').className = isActive ? 'fas fa-times' : 'fas fa-robot';
    }


    function updateCounters() {
        const text = editor.textContent.trim();
        const wordCount = text ? text.split(/\s+/).filter(word => word.length > 0).length : 0;
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

        const fullText = editor.textContent.trim();
        const maxContextLength = 1500;
        if (fullText.length > maxContextLength) {
           
            let context = fullText.substring(fullText.length - maxContextLength);
            const lastPeriodIndex = context.lastIndexOf('.');
            const lastExclamationIndex = context.lastIndexOf('!');
            const lastQuestionIndex = context.lastIndexOf('?');
            const lastBreakIndex = Math.max(lastPeriodIndex, lastExclamationIndex, lastQuestionIndex);

            if (lastBreakIndex > -1 && lastBreakIndex > maxContextLength * 0.75) { 
                context = context.substring(lastBreakIndex + 1).trim();
            } else {
                
                const lastSpaceIndex = context.lastIndexOf(' ');
                if (lastSpaceIndex > -1) {
                    context = context.substring(lastSpaceIndex + 1).trim();
                }
            }
             if (context.length === 0 && fullText.length > 0) { 
                context = fullText.substring(fullText.length - 200).trim(); 
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
            errorDisplay.style.display = 'none'; 
            clearSuggestionDisplay(); 
        } else {
            aiLoading.classList.remove('active');
            suggestionDisplay.classList.remove('loading-skeleton');
            disableButtons(false);
        }
    }

    function disableButtons(disabled) {
        const buttons = [
            generateFullStoryBtn, 
            generateBtn, improveBtn, insertSuggestionBtn, regenerateSuggestionBtn,
            newStoryBtn, saveStoryBtn, exportStoryBtn, formatBtn, distractionFreeBtn,
            themeToggleBtn, toggleAiPanelBtn
        ];
        buttons.forEach(btn => {
            if (btn) btn.disabled = disabled; 
        });

        inspirationCards.forEach(card => card.style.pointerEvents = disabled ? 'none' : 'auto');
        quickActions.forEach(btn => btn.style.pointerEvents = disabled ? 'none' : 'auto');
        editor.contentEditable = !disabled; 
        storyTitle.disabled = disabled; 
    }

    async function sendRequest(type, context = '') {
        setLoading(true);
        clearSuggestion(); 

        lastRequestType = type;
        lastRequestContext = context; 

        try {
            const response = await fetch('api_proxy.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    type: type,
                    context: context, 
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
                currentSuggestion = data.suggestion; 
                insertSuggestionBtn.style.display = 'inline-flex';
                regenerateSuggestionBtn.style.display = 'inline-flex';
                errorDisplay.style.display = 'none'; 
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
            editor.innerHTML += `\n\n${currentSuggestion}`;
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editor);
            range.collapse(false); 
            sel.removeAllRanges();
            sel.addRange(range);
            editor.focus();
            updateCounters();
            displayMessage('Suggestion inserted!', 'success');
            clearSuggestionDisplay(); 
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
        
        const context = getStoryContext();
        sendRequest('generate_ideas', context);
    }

    function displayError(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        
        setTimeout(() => {
            errorDisplay.style.display = 'none';
        }, 5000);
    }

    function displayMessage(message, type) {
        const notification = document.createElement('div');
        notification.classList.add('format-notification');
        notification.textContent = message;

       
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