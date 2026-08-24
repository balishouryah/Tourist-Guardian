/**
 * Returns a human-readable relative time string (e.g., "Just now", "2 minutes ago").
 * @param {string|Date} timestamp - The ISO string or Date object
 * @returns {string} Human readable relative time
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(timestamp);
  const now = new Date();
  
  // Calculate difference in seconds
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 0) return 'Just now'; // Handle slight clock skews
  if (diffInSeconds < 30) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) return '1 minute ago';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return '1 hour ago';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  // Fallback to formatted date if older than a week
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
