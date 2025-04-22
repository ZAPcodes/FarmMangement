export const STATUS_NAMES: { [key: number]: string } = {
  1: "Pending",
  2: "Confirmed",
  3: "Shipped",
  4: "Delivered",
  5: "Cancelled"
};

export const STATUS_MAP = {
  PENDING: 1,
  CONFIRMED: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: 5
} as const;

// Type for status IDs
export type OrderStatusId = typeof STATUS_MAP[keyof typeof STATUS_MAP];

// Type for status names
export type OrderStatusName = typeof STATUS_NAMES[OrderStatusId]; 