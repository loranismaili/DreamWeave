<?php
header('Content-Type: application/json');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$input = json_decode(file_get_contents('php://input'), true);
$type = $input['type'] ?? '';
$context = $input['context'] ?? '';
$context = substr($context, 0, 1000); 

$apiKey = 'api here still not working'; 

switch ($type) {
    case 'full_story':
        $userPrompt = !empty($context) ? $context : "Write a compelling story.";
        $prompt = "Write a complete story, around 1000 words, based on the following prompt or theme: \"{$userPrompt}\". Make sure it has a clear beginning, middle, and end, with character development and a resolution.";
        $maxTokens = 2000;
        $temperature = 0.9;
        break;

    case 'next_paragraph':
        if (empty($context)) {
            echo json_encode(['success' => false, 'error' => 'No story context provided for next paragraph.']);
            exit;
        }
        $prompt = "Given the following story context, write the next paragraph to continue the narrative smoothly:\n\n---\n{$context}\n---";
        $maxTokens = 250;
        $temperature = 0.8;
        break;

    case 'plot_twist':
        $prompt = "Suggest a surprising plot twist for a story, considering the following context (if any):\n\n---\n{$context}\n---";
        $maxTokens = 150;
        $temperature = 0.9;
        break;

    case 'character_idea':
        $prompt = "Suggest a new character idea (name, brief description, a unique trait) that could fit into a story, considering the following context (if any):\n\n---\n{$context}\n---";
        $maxTokens = 100;
        $temperature = 0.8;
        break;

    case 'setting_detail':
        $prompt = "Describe a vivid setting detail (e.g., a specific place, an object, an environmental element) that could enhance a story, considering the following context (if any):\n\n---\n{$context}\n---";
        $maxTokens = 150;
        $temperature = 0.8;
        break;

    case 'generate_prompt':
        $prompt = "Generate a creative and intriguing story starter idea or theme. Make it concise and inspiring.";
        $maxTokens = 80;
        $temperature = 0.9;
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid generation type.']);
        exit;
}

$messages = [
    ["role" => "system", "content" => "You are a helpful creative writing assistant."],
    ["role" => "user", "content" => $prompt]
];

$postData = [
    'model' => 'gpt-3.5-turbo',
    'messages' => $messages,
    'max_tokens' => $maxTokens,
    'temperature' => $temperature,
];

$ch = curl_init("https://api.openai.com/v1/chat/completions");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer $apiKey"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    echo json_encode(['success' => false, 'error' => 'Request failed: ' . $error]);
    exit;
}

if ($httpCode !== 200) {
    $decodedError = json_decode($response, true);
    $message = $decodedError['error']['message'] ?? 'Unknown error';
    echo json_encode(['success' => false, 'error' => "OpenAI API error: $message"]);
    exit;
}

$data = json_decode($response, true);

if (isset($data['choices'][0]['message']['content'])) {
    $suggestion = $data['choices'][0]['message']['content'];
    echo json_encode(['success' => true, 'suggestion' => trim($suggestion)]);
} else {
    echo json_encode(['success' => false, 'error' => 'Unexpected API response structure.']);
}
?>
