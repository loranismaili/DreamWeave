<?php
header('Content-Type: application/json');


$input = json_decode(file_get_contents('php://input'), true);
$type = $input['type'] ?? '';
$context = $input['context'] ?? '';


$context = substr($context, 0, 1000);


$apiKey = getenv('keyyyyyyyyyy');




$apiUrl = "https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-2.7B";


switch ($type) {
    case 'full_story':
        $userPrompt = !empty($context) ? $context : "Write a compelling story.";
        $prompt = "Write a complete story, around 1000 words, based on the following prompt or theme: \"{$userPrompt}\". Make sure it has a clear beginning, middle, and end, with character development and a resolution.";
        break;

    case 'next_paragraph':
        if (empty($context)) {
            echo json_encode(['success' => false, 'error' => 'No story context provided for next paragraph.']);
            exit;
        }
        $prompt = "Given the following story context, write the next paragraph to continue the narrative smoothly:\n\n---\n{$context}\n---";
        break;

    case 'plot_twist':
        $prompt = "Suggest a surprising plot twist for a story, considering the following context (if any):\n\n---\n{$context}\n---";
        break;

    case 'character_idea':
        $prompt = "Suggest a new character idea (name, brief description, a unique trait) that could fit into a story, considering the following context (if any):\n\n---\n{$context}\n---";
        break;

    case 'setting_detail':
        $prompt = "Describe a vivid setting detail (e.g., a specific place, an object, an environmental element) that could enhance a story, considering the following context (if any):\n\n---\n{$context}\n---";
        break;

    case 'generate_prompt':
        $prompt = "Generate a creative and intriguing story starter idea or theme. Make it concise and inspiring.";
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid generation type.']);
        exit;
}


$postData = [
    'inputs' => $prompt,
    'parameters' => [
        'max_new_tokens' => 200,
        'temperature' => 0.7,
    ],
];


$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiToken",
    "Content-Type: application/json"
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
    echo json_encode(['success' => false, 'error' => "Hugging Face API error: HTTP $httpCode"]);
    exit;
}

$data = json_decode($response, true);

if (isset($data[0]['generated_text'])) {
    echo json_encode(['success' => true, 'suggestion' => trim($data[0]['generated_text'])]);
} else {
    echo json_encode(['success' => false, 'error' => 'Unexpected API response structure.']);
}
?>
