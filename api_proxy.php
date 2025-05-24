<?php
header('Content-Type: application/json');


$input = json_decode(file_get_contents('php://input'), true);
$type = $input['type'] ?? '';
$context = $input['context'] ?? '';

$context = substr($context, 0, 1000);


$geminiApiKey = 'AIzaSyBk0BGrmwa-050xMdu5iaL-iWwq7dA9D4Y';


$geminiModel = 'gemini-1.5-flash';
$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$geminiModel}:generateContent?key={$geminiApiKey}";

$promptText = '';
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
    'contents' => [
        [
            'parts' => [
                ['text' => $promptText]
            ]
        ]
    ],
    
    'generationConfig' => [
        'maxOutputTokens' => 1000,
        'temperature' => 0.7,
        'topP' => 1,
        'topK' => 1
    ]
];


$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json" 
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
   
    $errorData = json_decode($response, true);
    $errorMessage = 'Google Gemini API error';
    if (isset($errorData['error']['message'])) {
        $errorMessage .= ': ' . $errorData['error']['message'];
    } else {
        $errorMessage .= ": HTTP $httpCode - " . $response;
    }
    echo json_encode(['success' => false, 'error' => $errorMessage, 'raw_response' => $response]);
    exit;
}


$data = json_decode($response, true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'Failed to decode JSON response from Gemini.', 'raw_response' => $response]);
    exit;
}


if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
    $suggestion = trim($data['candidates'][0]['content']['parts'][0]['text']);
    echo json_encode(['success' => true, 'suggestion' => $suggestion]);
} else if (isset($data['promptFeedback']['blockReason'])) {

    echo json_encode(['success' => false, 'error' => 'Content was blocked by safety policy: ' . $data['promptFeedback']['blockReason'], 'raw_response' => $data]);
} else {
  
    echo json_encode([
        'success' => false,
        'error' => 'Unexpected Gemini API response structure or no generated content.',
        'raw_response' => $data
    ]);
}
?>