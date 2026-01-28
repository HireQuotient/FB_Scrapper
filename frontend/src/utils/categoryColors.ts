export const CATEGORY_COLORS: Record<string, string> = {
  'tech': '#3B82F6',
  'healthcare': '#EF4444',
  'blue-collar': '#F97316',
  'sales-marketing': '#8B5CF6',
  'food-hospitality': '#EC4899',
  'admin-office': '#6366F1',
  'education': '#10B981',
  'transportation-logistics': '#F59E0B',
  'other': '#6B7280',
};

export const CATEGORY_NAMES: Record<string, string> = {
  'tech': 'Tech',
  'healthcare': 'Healthcare',
  'blue-collar': 'Blue Collar',
  'sales-marketing': 'Sales & Marketing',
  'food-hospitality': 'Food & Hospitality',
  'admin-office': 'Admin & Office',
  'education': 'Education',
  'transportation-logistics': 'Transportation',
  'other': 'Other',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['other'];
}

export function getCategoryName(category: string): string {
  return CATEGORY_NAMES[category] || 'Other';
}
