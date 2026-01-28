export function formatTimeAgo(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString();
}

export function formatSalary(salary: string): string {
  if (!salary) return 'Not specified';
  return salary;
}

export function calculateEngagementScore(
  likes?: number,
  shares?: number,
  comments?: number
): number {
  const l = likes || 0;
  const s = shares || 0;
  const c = comments || 0;
  const score = l + s * 2 + c;
  return Math.min(99, Math.round(score / 2));
}
