// Mirrors the backend state machines and models. Keep in sync with:
//   order-service  order_app/views.py      VALID_TRANSITIONS / PAYMENT_METHODS
//   shipping-service shipping_app/views.py VALID_TRANSITIONS
//   product-service product_app/models.py  category detail models

export const ORDER_STATUS = {
  pending: { label: 'Chờ xử lý', tone: 'amber' },
  processing: { label: 'Đang xử lý', tone: 'blue' },
  shipped: { label: 'Đang giao', tone: 'violet' },
  delivered: { label: 'Đã giao', tone: 'green' },
  cancelled: { label: 'Đã huỷ', tone: 'red' },
};

export const ORDER_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const ORDER_FLOW = ['pending', 'processing', 'shipped', 'delivered'];

export const PAYMENT_STATUS = {
  pending: { label: 'Chờ thanh toán', tone: 'amber' },
  success: { label: 'Đã thanh toán', tone: 'green' },
  failed: { label: 'Thất bại / Hoàn tiền', tone: 'red' },
};

export const PAYMENT_METHODS = {
  card: { label: 'Thẻ tín dụng / ghi nợ', hint: 'Thanh toán ngay, đơn được xử lý tự động' },
  bank: { label: 'Chuyển khoản ngân hàng', hint: 'Đơn được xử lý sau khi cửa hàng xác nhận tiền về' },
  cash: { label: 'Thanh toán khi nhận hàng (COD)', hint: 'Trả tiền mặt cho nhân viên giao hàng' },
};

export const SHIPMENT_STATUS = {
  pending_payment: { label: 'Chờ thanh toán', tone: 'amber' },
  processing: { label: 'Đang chuẩn bị', tone: 'blue' },
  shipping: { label: 'Đang vận chuyển', tone: 'violet' },
  delivered: { label: 'Đã giao', tone: 'green' },
  cancelled: { label: 'Đã huỷ', tone: 'red' },
};

export const SHIPMENT_TRANSITIONS = {
  pending_payment: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const ROLES = {
  admin: { label: 'Quản trị viên', tone: 'red' },
  staff: { label: 'Nhân viên', tone: 'blue' },
  customer: { label: 'Khách hàng', tone: 'gray' },
};

// Category name (catalog-service) -> product-service endpoint + specific fields.
export const PRODUCT_TYPES = {
  Books: {
    endpoint: 'books',
    fields: [
      { name: 'author', label: 'Tác giả' },
      { name: 'publisher', label: 'Nhà xuất bản' },
      { name: 'isbn', label: 'ISBN' },
    ],
  },
  Electronics: {
    endpoint: 'electronics',
    fields: [
      { name: 'brand', label: 'Thương hiệu' },
      { name: 'warranty', label: 'Bảo hành (tháng)', type: 'number' },
    ],
  },
  Fashion: {
    endpoint: 'fashion',
    fields: [
      { name: 'size', label: 'Kích cỡ' },
      { name: 'color', label: 'Màu sắc' },
    ],
  },
  'Home & Living': {
    endpoint: 'home-living',
    fields: [
      { name: 'material', label: 'Chất liệu' },
      { name: 'dimensions', label: 'Kích thước' },
    ],
  },
  'Sports & Outdoors': {
    endpoint: 'sports-outdoors',
    fields: [
      { name: 'sport_type', label: 'Môn thể thao' },
      { name: 'weight', label: 'Trọng lượng' },
    ],
  },
  'Beauty & Health': {
    endpoint: 'beauty-health',
    fields: [
      { name: 'ingredient', label: 'Thành phần' },
      { name: 'volume', label: 'Dung tích' },
    ],
  },
  'Toys & Games': {
    endpoint: 'toys-games',
    fields: [
      { name: 'age_range', label: 'Độ tuổi' },
      { name: 'players', label: 'Số người chơi' },
    ],
  },
  Automotive: {
    endpoint: 'automotive',
    fields: [
      { name: 'vehicle_type', label: 'Loại xe' },
      { name: 'compatibility', label: 'Tương thích' },
    ],
  },
  'Food & Grocery': {
    endpoint: 'food-grocery',
    fields: [
      { name: 'expiry_days', label: 'Hạn dùng (ngày)', type: 'number' },
      { name: 'weight', label: 'Khối lượng' },
    ],
  },
  'Office Supplies': {
    endpoint: 'office-supplies',
    fields: [
      { name: 'pack_size', label: 'Số lượng / gói', type: 'number' },
      { name: 'material', label: 'Chất liệu' },
    ],
  },
};

/** Human label for a product detail field, falling back to the raw key. */
export const DETAIL_LABELS = Object.values(PRODUCT_TYPES)
  .flatMap((t) => t.fields)
  .reduce((acc, f) => ({ ...acc, [f.name]: f.label }), {});
