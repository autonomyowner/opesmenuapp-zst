// Category mappings - maps new simple categories to legacy database category names
// This allows filtering to work even if database has old French category names
// Synced with website (zst/src/data/products.ts)

export const categoryMappings: Record<string, string[]> = {
  'Automobiles': ['Automobiles', 'Véhicules', 'Automobiles & Véhicules', 'Auto', 'Voiture', 'Car'],
  'Telephones': ['Téléphones', 'Téléphones & Accessoires', 'Mobile', 'Phone', 'Smartphone'],
  'Accessoires': ['Accessoires', 'Téléphones & Accessoires', 'Accessories'],
  'Vetements': ['Vêtements', 'Vêtements & Mode', 'Mode', 'Clothes', 'Fashion', 'Clothing'],
  'Electronique': ['Électronique', 'Électroménager', 'Électroménager & Électronique', 'Informatique', 'Technologie', 'Electronics'],
  'Maison': ['Maison', 'Meubles & Maison', 'Meubles', 'Matériaux & Équipement', 'Home', 'Furniture'],
  'Beaute': ['Beauté', 'Santé & Beauté', 'Santé', 'Parfums', 'Beauty', 'Health', 'Cosmétique', 'Parfum'],
}

// Helper function to check if a product matches a category filter
// Uses fuzzy keyword matching to support both new and legacy category names
export function matchesCategory(productCategory: string, filterCategoryId: string): boolean {
  if (!filterCategoryId) return true // No filter applied

  // Direct exact match first (for products already using new category names)
  if (productCategory === filterCategoryId) return true

  // Then check keyword mappings (for products with old category names)
  const categoryKeywords = categoryMappings[filterCategoryId] || []
  return categoryKeywords.some(keyword =>
    productCategory.toLowerCase().includes(keyword.toLowerCase())
  )
}
