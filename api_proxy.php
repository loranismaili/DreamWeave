<?php
// Turn off all error reporting for clean JSON output in production
error_reporting(0);
ini_set('display_errors', 0);

// Set response header
header('Content-Type: application/json');

// Allow CORS - IMPORTANT: Adjust 'Access-Control-Allow-Origin' for production!
// Replace '*' with your specific frontend domain (e.g., 'https://your-app-domain.com')
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, OPTIONS"); // Add OPTIONS for preflight requests
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simple session-based rate limiting
session_start();
$rateLimit = 30; // requests per minute
$rateLimitWindow = 60; // seconds

if (!isset($_SESSION['last_request_time'])) {
    $_SESSION['last_request_time'] = time();
    $_SESSION['request_count'] = 1;
} else {
    $elapsed = time() - $_SESSION['last_request_time'];
    if ($elapsed > $rateLimitWindow) {
        $_SESSION['last_request_time'] = time();
        $_SESSION['request_count'] = 1;
    } else {
        $_SESSION['request_count']++;
        if ($_SESSION['request_count'] > $rateLimit) {
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'error' => 'Rate limit exceeded. Please wait before making more requests.'
            ]);
            exit;
        }
    }
}

// Read input JSON from the request body
$input = json_decode(file_get_contents('php://input'), true);

// Check for JSON decoding errors
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input: ' . json_last_error_msg()]);
    exit;
}

// Validate and sanitize input
// Using trim() instead of FILTER_SANITIZE_STRING (deprecated)
$type = trim($input['type'] ?? '');
$context = trim($input['context'] ?? '');
$temperature = filter_var(
    $input['temperature'] ?? 0.7,
    FILTER_VALIDATE_FLOAT,
    ['options' => ['min_range' => 0.1, 'max_range' => 1.0, 'default' => 0.7]]
);

// Define valid generation types - IMPORTANT: Added new types from JS!
$validTypes = [
    'full_story',
    'next_paragraph',
    'plot_twist',
    'character_idea',
    'setting_detail',
    'generate_prompt',
    'generate_ideas',    // Added from JS
    'describe_scene',    // Added from JS
    'rewrite_text',      // Added from JS
    'improve_current'    // Added from JS
];

if (!in_array($type, $validTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid generation type provided: ' . htmlspecialchars($type)]);
    exit;
}

// Your OpenAI API key here.
// IMPORTANT: For production, load this from an environment variable (e.g., getenv('OPENAI_API_KEY'))
// or a secure configuration file outside the web root. DO NOT hardcode in production.
$openaiApiKey = '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'; // This is a placeholder, replace with your actual key or env var

if (empty($openaiApiKey) || $openaiApiKey === 'YOUR_OPENAI_API_KEY') { // Check for empty or placeholder key
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'OpenAI API key not configured. Please set it in api_proxy.php.']);
    exit;
}

// Prepare prompt text & max tokens based on type
$promptText = '';
$maxTokens = 200; // Default max tokens

switch ($type) {
    case 'full_story':
        $userPrompt = !empty($context) ? $context : "Write a compelling story.";
        $promptText = "Write a complete, engaging story, around 1000 words, based on the following prompt or theme: \"{$userPrompt}\". 
                       Ensure it has a clear beginning, rising action, climax, falling action, and resolution, with character development and a compelling narrative arc.";
        $maxTokens = 1000; // Aim for 1000 tokens, which is ~750 words for English
        break;

    case 'next_paragraph':
        if (empty($context)) {
            echo json_encode(['success' => false, 'error' => 'No story context provided for next paragraph.']);
            exit;
        }
        $promptText = "Given the following story context, write the next paragraph to seamlessly continue the narrative:\n\n---\n{$context}\n---";
        $maxTokens = 300;
        break;

    case 'plot_twist':
        $promptText = "Suggest a surprising and impactful plot twist for a story, considering the following context (if any):\n\n---\n{$context}\n---";
        $maxTokens = 200;
        break;

    case 'character_idea':
        $promptText = "Suggest a new, unique character idea (including name, brief background, and a defining trait or secret) that could fit into a story, considering the following context (if any):\n\n---\n{$context}\n---";
        $maxTokens = 150;
        break;

    case 'setting_detail':
        $promptText = "Describe a vivid and immersive setting detail (e.g., a specific location, an atmospheric element, or a significant object) that could enhance a story, considering the following context (if any):\n\n---\n{$context}\n---";
        $maxTokens = 200;
        break;

    case 'generate_prompt':
        $promptText = "Generate a creative and intriguing story starter idea or theme. Make it concise and inspiring, suitable for a new story.";
        $maxTokens = 100;
        break;

    case 'generate_ideas':
        // This type handles a general "generate ideas" prompt from the user
        $userPrompt = !empty($context) ? $context : "Generate some creative ideas for a story.";
        $promptText = "Generate a few diverse and creative ideas related to the following general request: \"{$userPrompt}\". Provide short, distinct suggestions.";
        $maxTokens = 300;
        break;

    case 'describe_scene':
        if (empty($context)) {
            echo json_encode(['success' => false, 'error' => 'No story context provided for scene description.']);
            exit;
        }
        $promptText = "Elaborate and describe the current scene or character in more vivid detail, based on the following story context:\n\n---\n{$context}\n---";
        $maxTokens = 250;
        break;

    case 'rewrite_text':
        if (empty($context)) {
            echo json_encode(['success' => false, 'error' => 'No story context provided for rewriting.']);
            exit;
        }
        $promptText = "Rewrite the last paragraph or section of the following text to make it more engaging, dramatic, or concise, as appropriate:\n\n---\n{$context}\n---";
        $maxTokens = 300;
        break;

    case 'improve_current':
        if (empty($context)) {
            echo json_encode(['success' => false, 'error' => 'No story context provided to improve.']);
            exit;
        }
        $promptText = "Review the following story text and suggest ways to improve it. Focus on aspects like pacing, character depth, descriptive language, or plot coherence. Provide actionable suggestions or a revised passage:\n\n---\n{$context}\n---";
        $maxTokens = 400;
        break;
}

// Setup cURL request to OpenAI
$postData = [
    'model' => 'gpt-3.5-turbo', // You can change this to 'gpt-4' or other models if you have access
    'messages' => [
        ['role' => 'system', 'content' => 'You are a helpful and creative writing assistant. Provide clear and concise suggestions or continuations for stories.'],
        ['role' => 'user', 'content' => $promptText],
    ],
    'max_tokens' => $maxTokens,
    'temperature' => $temperature,
    'top_p' => 0.9,
    'frequency_penalty' => 0.5,
    'presence_penalty' => 0.5,
];

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, // Return the response as a string
    CURLOPT_POST => true,           // Set as POST request
    CURLOPT_POSTFIELDS => json_encode($postData), // Encode data as JSON
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "Authorization: Bearer {$openaiApiKey}",
    ],
    CURLOPT_TIMEOUT => 60, // Increased timeout for potentially longer AI responses
    CURLOPT_CONNECTTIMEOUT => 10, // Timeout for connection
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Handle cURL errors
if ($response === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to connect to AI service or cURL error', 'details' => $curlError]);
    exit;
}

// Handle non-200 HTTP responses from OpenAI
if ($httpCode !== 200) {
    // Attempt to decode OpenAI's error message if available
    $errorData = json_decode($response, true);
    $errorMessage = 'Unknown AI service error.';
    if (isset($errorData['error']['message'])) {
        $errorMessage = $errorData['error']['message'];
    }
    http_response_code(502); // Bad Gateway - indicates upstream server error
    echo json_encode(['success' => false, 'error' => "AI service returned error: {$errorMessage}", 'http_code' => $httpCode, 'raw_response' => $response]);
    exit;
}

// Decode the successful response from OpenAI
$data = json_decode($response, true);
if (!$data) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to decode AI service response (invalid JSON from OpenAI)']);
    exit;
}

// Extract and return the AI's suggestion
if (isset($data['choices'][0]['message']['content'])) {
    $suggestion = trim($data['choices'][0]['message']['content']);
    echo json_encode(['success' => true, 'suggestion' => $suggestion]);
} else {
    // Fallback for unexpected response structure
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unexpected response structure from AI service', 'raw_response' => $data]);
}
exit; // Ensure no further output