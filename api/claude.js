export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { type, payload } = req.body;

  let messages;
  let systemPrompt;

  if (type === 'meal_plan') {
    const { bgSummary, schedule, specialNotes, foodHistory } = payload;
    systemPrompt =
      'You are a Type 1 diabetes nutrition coach helping a parent plan their child\'s meals. Always respond with valid JSON only — no markdown, no explanation.';
    messages = [
      {
        role: 'user',
        content: `Child context:
- Last 24 hrs BG: ${bgSummary}
- Today's schedule: ${schedule}
- Special notes: ${specialNotes || 'None'}
- Recent food reactions (last 7 days): ${foodHistory || 'No history yet'}

Suggest breakfast, morning snack, and lunch. For each meal return:
- carbRangeG: [min, max]
- suggestions: array of { name, carbsG } (2-3 items)
- reasoning: one sentence tied to today's BG and schedule

Return ONLY valid JSON:
{
  "breakfast": { "carbRangeG": [30,45], "suggestions": [{"name":"...","carbsG":20}], "reasoning": "..." },
  "snack": { "carbRangeG": [15,25], "suggestions": [...], "reasoning": "..." },
  "lunch": { "carbRangeG": [40,55], "suggestions": [...], "reasoning": "..." }
}`,
      },
    ];
  } else if (type === 'photo_scan') {
    const { imageBase64, mimeType } = payload;
    systemPrompt =
      'You extract nutrition facts from food label images. Always respond with valid JSON only — no markdown, no explanation.';
    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'Extract nutrition facts from this label. Return ONLY valid JSON:\n{"servingSize":"<e.g. 1 cup>","servingG":<number|null>,"totalCarbsG":<number>,"sugarsG":<number>,"confidence":<0.0-1.0>}\nIf you cannot read a value clearly, use null.',
          },
        ],
      },
    ];
  } else {
    return res.status(400).json({ error: 'Unknown type' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
