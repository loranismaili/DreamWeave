<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$type = $input['type'] ?? '';
$context = $input['context'] ?? '';

$context = substr($context, 0, 1000);

$openaiApiKey = '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';

switch ($type) {
    case 'full_story':
        $userPrompt = !empty($context) ? $context : "Write a compelling story.";
        $promptText = "Write a complete story, around 1000 words, based on the following prompt or theme: \"{$userPrompt}\". Make sure it has a clear beginning, middle, and end, with character development and a resolution.";
        break;

    case 'next_paragraph':
        if (empty($context)) {
            echo json_encode(['success' => false, 'error' => 'No story context provided for next paragraph.']);
            exit;
        }
        $promptText = "Given the following story context, write the next paragraph to continue the narrative smoothly:\n\n---\n{$context}\n---";
        break;

    case 'plot_twist':
        $promptText = "Suggest a surprising plot twist for a story, considering the following context (if any):\n\n---\n{$context}\n---";
        break;

    case 'character_idea':
        $promptText = "Suggest a new character idea (name, brief description, a unique trait) that could fit into a story, considering the following context (if any):\n\n---\n{$context}\n---";
        break;

    case 'setting_detail':
        $promptText = "Describe a vivid setting detail (e.g., a specific place, an object, an environmental element) that could enhance a story, considering the following context (if any):\n\n---\n{$context}\n---";
        break;

    case 'generate_prompt':
        $promptText = "Generate a creative and intriguing story starter idea or theme. Make it concise and inspiring.";
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid generation type.']);
        exit;
}

$postData = [
    'model' => 'gpt-3.5-turbo',
    'messages' => [
        ['role' => 'system', 'content' => 'You are a helpful creative writing assistant.'],
        ['role' => 'user', 'content' => $promptText],
    ],
    'max_tokens' => 1000,
    'temperature' => 0.7,
];

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer {$openaiApiKey}",
]);

$response = curl_exec($ch);

if ($response === false) {
    $error = curl_error($ch);
    curl_close($ch);
    echo json_encode(['success' => false, 'error' => 'cURL request failed: ' . $error]);
    exit;
}

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo json_encode(['success' => false, 'error' => "OpenAI API returned HTTP code $httpCode", 'raw_response' => $response]);
    exit;
}

$data = json_decode($response, true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'Failed to decode JSON response from OpenAI.', 'raw_response' => $response]);
    exit;
}

if (isset($data['choices'][0]['message']['content'])) {
    $suggestion = trim($data['choices'][0]['message']['content']);
    echo json_encode(['success' => true, 'suggestion' => $suggestion]);
} else {
    echo json_encode(['success' => false, 'error' => 'Unexpected OpenAI API response structure.', 'raw_response' => $data]);
}
?>
