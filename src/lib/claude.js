async function claudePost(type, payload) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type, payload }),
  });
  if (!res.ok) {
    let msg = `Claude error ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) msg = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function getMealPlan({ bgSummary, schedule, specialNotes, foodHistory }) {
  return claudePost('meal_plan', { bgSummary, schedule, specialNotes, foodHistory });
}

export async function scanPhoto({ imageBase64, mimeType }) {
  return claudePost('photo_scan', { imageBase64, mimeType });
}

export async function scanDexcom({ imageBase64, mimeType }) {
  return claudePost('dexcom_scan', { imageBase64, mimeType });
}

export async function scoreMeal(payload) {
  return claudePost('meal_score', payload);
}
