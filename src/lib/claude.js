export async function getMealPlan({ bgSummary, schedule, specialNotes, foodHistory }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'meal_plan', payload: { bgSummary, schedule, specialNotes, foodHistory } }),
  });
  if (!res.ok) throw new Error('Claude meal plan failed');
  return res.json();
}

export async function scanPhoto({ imageBase64, mimeType }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'photo_scan', payload: { imageBase64, mimeType } }),
  });
  if (!res.ok) throw new Error('Claude photo scan failed');
  return res.json();
}
