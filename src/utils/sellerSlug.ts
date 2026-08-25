const SELLER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizeSellerSlug = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'seller';
};

export const normalizeSellerSlugInput = (value: string): string | null => {
  const slug = value.trim().toLowerCase();
  return SELLER_SLUG_PATTERN.test(slug) ? slug : null;
};
