export const formatMoney = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

export const formatPercent = (value: number) =>
  `${(((Number.isFinite(value) ? value : 0) || 0) * 100).toFixed(2)}%`;

