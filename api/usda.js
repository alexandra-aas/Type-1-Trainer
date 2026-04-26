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

    const words = q.trim().split(/\s+/);
    let rawFoods;

    if (words.length > 1) {
      // Run the full query plus a brand-focused search on the first word in parallel,
      // then merge and re-rank by how many query terms appear in description + brand.
      const [mainRes, brandRes] = await Promise.all([
        usdaSearch(q, apiKey),
        usdaSearch(words[0], apiKey),
      ]);

      const seen = new Set(mainRes.map((f) => f.fdcId));
      const merged = [...mainRes];
      for (const f of brandRes) {
        if (!seen.has(f.fdcId)) {
          merged.push(f);
          seen.add(f.fdcId);
        }
      }

      const lowerWords = words.map((w) => w.toLowerCase());
      rawFoods = merged
        .map((f) => {
          const text = `${f.description} ${f.brandOwner ?? ''}`.toLowerCase();
          const hits = lowerWords.filter((w) => text.includes(w)).length;
          return { ...f, _hits: hits };
        })
        .sort((a, b) => b._hits - a._hits)
        .slice(0, 20);
    } else {
      rawFoods = await usdaSearch(q, apiKey);
    }

    const results = rawFoods.map((food) => {
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

async function usdaSearch(query, apiKey) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=20&dataType=SR%20Legacy,Foundation,Branded`;
  const res = await fetch(url);
  const data = await res.json();
  return data.foods ?? [];
}
