const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' });

export const formatPrice = (value) => currency.format(Number(value) || 0);

export const formatDateTime = (value) => (value ? dateTime.format(new Date(value)) : '');

export const formatDate = (value) => (value ? dateOnly.format(new Date(value)) : '');

/** Price shown is the selling price; `discount` is the % off the original price. */
export const originalPrice = (price, discount) => {
  const d = Number(discount) || 0;
  return d > 0 && d < 100 ? Number(price) / (1 - d / 100) : null;
};
