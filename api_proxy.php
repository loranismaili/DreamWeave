<?php
header('Content-Type: application/json');

// IMPORTANT: Store your API key securely, e.g., using environment variables.
// For demonstration, it's directly in the script, but this is NOT recommended for production.
// Best practice: getenv('GOOGLE_GEMINI_API_KEY') or a config file outside web root.
define('GOOGLE_GEMINI_API_KEY', 'AIzaSyDyKZRHK63UG_HIHu2l7niqyOasEo-fubQ'); 

if (GOOGLE_GEMINI_API_KEY === 'YOUR_GOOGLE_GEMINI_API_KEY' || empty(GOOGLE_GEMINI_API_KEY)) {
    echo json_encode(['success' => false, 'error' => 'API Key not configured. Please set GOOGLE_GEMINI_API_KEY in api_proxy.php']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$type = $input['type'] ?? '';
$context = $input['context'] ?? '';

// Sanitize context input
$context = htmlspecialchars(substr($context, 0, 1000)); // Max 1000 chars for safety and relevance

$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" . GOOGLE_GEMINI_API_KEY;

$prompt = '';
$maxOutputTokens = 1000; // Default for incremental, ~500 words
$temperature = 0.8;
$topP = 0.9;
$topK = 40;

switch ($type) {
    case 'full_story':
        $userPrompt = !empty($context) ? $context : "Write a compelling story.";
        $prompt = "Write a complete story, around 1000 words, based on the following prompt or theme: \"{$userPrompt}\". Make sure it has a clear beginning, middle, and end, with character development and a resolution.";
        $maxOutputTokens = 2000; // ~1000 words
        $temperature = 0.9;
        break;
    case 'next_paragraph':
        if (empty($context)) {
            echo json_encode(['success' => false, 'error' => 'No story context provided for next paragraph.']);
            exit;
        }
        $prompt = "Given the following story context, write the next paragraph to continue the narrative smoothly:\n\n---\n{$context}\n---";
        $maxOutputTokens = 250; // Roughly 100-150 words for a paragraph
        $temperature = 0.8;
        break;
    case 'plot_twist':
        $prompt = "Suggest a surprising plot twist for a story, considering the following context (if any):\n\n---\n{$context}\n---";
        $maxOutputTokens = 150;
        $temperature = 0.9;
        break;
    case 'character_idea':
        $prompt = "Suggest a new character idea (name, brief description, a unique trait) that could fit into a story, considering the following context (if any):\n\n---\n{$context}\n---";
        $maxOutputTokens = 100;
        $temperature = 0.8;
        break;
    case 'setting_detail':
        $prompt = "Describe a vivid setting detail (e.g., a specific place, an object, an environmental element) that could enhance a story, considering the following context (if any):\n\n---\n{$context}\n---";
        $maxOutputTokens = 150;
        $temperature = 0.8;
        break;
    case 'generate_prompt':
        $prompt = "Generate a creative and intriguing story starter idea or theme. Make it concise and inspiring.";
        $maxOutputTokens = 80;
        $temperature = 0.9;
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid generation type.']);
        exit;
}

$data = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => $temperature,
        'topP' => $topP,
        'topK' => $topK,
        'maxOutputTokens' => $maxOutputTokens,
    ]
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    error_log("cURL error: " . $error);
    echo json_encode(['success' => false, 'error' => 'API request failed: ' . $error]);
    exit;
}

$responseData = json_decode($response, true);

if ($httpCode !== 200) {
    $errorMessage = $responseData['error']['message'] ?? 'Unknown API error.';
    error_log("API returned HTTP {$httpCode}: " . $errorMessage);
    echo json_encode(['success' => false, 'error' => "AI API Error: {$errorMessage}"]);
    exit;
}

if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
    $aiSuggestion = $responseData['candidates'][0]['content']['parts'][0]['text'];
    echo json_encode(['success' => true, 'suggestion' => $aiSuggestion]);
} else {
    error_log("Unexpected API response structure: " . print_r($responseData, true));
    echo json_encode(['success' => false, 'error' => 'Could not retrieve AI suggestion. Unexpected API response.']);
}
?>