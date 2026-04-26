export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'USDA_API_KEY not configured' });
  }

  const { q, fdcId } = req.query;

  try {
    if (fdcId) {
      const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      const carbNutrient = data.foodNutrients?.find(
        (n) => n.nutrient?.name === 'Carbohydrate, by difference'
      );
      return res.status(200).json({
        fdcId: data.fdcId,
        description: data.description,
        carbsPer100g: carbNutrient?.amount ?? null,
        servingG: data.servingSize ?? 100,
      });
    }

    if (!q) {
      return res.status(400).json({ error: 'q or fdcId required' });
    }

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(q)}&pageSize=20&dataType=SR%20Legacy,Foundation,Branded`;
    const response = await fetch(url);
    const data = await response.json();

    const results = (data.foods ?? []).map((food) => {
      const carbNutrient = food.foodNutrients?.find(
        (n) => n.nutrientName === 'Carbohydrate, by difference'
      );
      return {
        fdcId: food.fdcId,
        description: food.description,
        carbsPer100g: carbNutrient?.value ?? null,
        servingG: food.servingSize ?? 100,
        brand: food.brandOwner ?? null,
      };
    });

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
