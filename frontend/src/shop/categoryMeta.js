import {
  FiBookOpen,
  FiCoffee,
  FiGift,
  FiHeart,
  FiHome,
  FiMonitor,
  FiPaperclip,
  FiShoppingBag,
  FiSun,
  FiTag,
  FiTruck,
} from 'react-icons/fi';

const ICONS = {
  Books: { icon: FiBookOpen, label: 'Sách', className: 'bg-amber-50 text-amber-600' },
  Electronics: { icon: FiMonitor, label: 'Điện tử', className: 'bg-sky-50 text-sky-600' },
  Fashion: { icon: FiShoppingBag, label: 'Thời trang', className: 'bg-pink-50 text-pink-600' },
  'Home & Living': { icon: FiHome, label: 'Nhà cửa', className: 'bg-emerald-50 text-emerald-600' },
  'Sports & Outdoors': { icon: FiSun, label: 'Thể thao', className: 'bg-orange-50 text-orange-600' },
  'Beauty & Health': { icon: FiHeart, label: 'Làm đẹp', className: 'bg-rose-50 text-rose-600' },
  'Toys & Games': { icon: FiGift, label: 'Đồ chơi', className: 'bg-violet-50 text-violet-600' },
  Automotive: { icon: FiTruck, label: 'Ô tô - xe máy', className: 'bg-slate-100 text-slate-600' },
  'Food & Grocery': { icon: FiCoffee, label: 'Thực phẩm', className: 'bg-lime-50 text-lime-700' },
  'Office Supplies': { icon: FiPaperclip, label: 'Văn phòng phẩm', className: 'bg-cyan-50 text-cyan-600' },
};

/** Icon + Vietnamese label for a catalog category name (falls back to the raw name). */
export function categoryMeta(name) {
  return ICONS[name] || { icon: FiTag, label: name, className: 'bg-brand-50 text-brand-600' };
}
