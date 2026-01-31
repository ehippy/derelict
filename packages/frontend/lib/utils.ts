/**
 * Generate a URL-safe slug from a guild name (preserves capitalization)
 * Removes special characters and replaces spaces with hyphens
 */
export function generateGuildSlug(guildName: string): string {
  return guildName
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Create a full guild URL path: slug-id
 */
export function createGuildPath(guildName: string, guildId: string): string {
  const slug = generateGuildSlug(guildName);
  return `/${slug}-${guildId}`;
}

/**
 * Parse a guild path to extract the guild ID
 * Returns null if path is invalid
 */
export function parseGuildPath(pathname: string): string | null {
  // Remove leading slash
  const path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  
  // Extract ID from the end (everything after last hyphen)
  const lastHyphenIndex = path.lastIndexOf('-');
  if (lastHyphenIndex === -1) return null;
  
  const guildId = path.slice(lastHyphenIndex + 1);
  
  // Validate that ID looks like a Discord snowflake (numeric string)
  if (!/^\d+$/.test(guildId)) return null;
  
  return guildId;
}
