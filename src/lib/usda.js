export async function searchFoods(query) {
  const res = await fetch(`/api/usda?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('USDA search failed');
  return res.json();
}

export async function getFoodDetail(fdcId) {
  const res = await fetch(`/api/usda?fdcId=${fdcId}`);
  if (!res.ok) throw new Error('USDA detail fetch failed');
  return res.json();
}

export function carbsForServing(food, servingG) {
  if (food.carbsPer100g == null) return null;
  return Math.round((food.carbsPer100g * servingG) / 100);
}
