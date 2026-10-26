import type { ItemDef, ShopOffer } from './index';
export const EXPANSION_ITEMS: Record<string, ItemDef> = {
  hat_thanh_linh: {
    name: 'Hạt Thanh Linh',
    kind: 'material',
    color: '#acd79b',
    desc: 'Gieo tại linh điền; trưởng thành sau 2 ngày game.',
  },
  hat_linh_chi: {
    name: 'Bào Tử Linh Chi',
    kind: 'material',
    color: '#dda18c',
    desc: 'Gieo tại linh điền; trưởng thành sau 12 ngày game.',
  },
  hat_ngung_lo: {
    name: 'Hạt Ngưng Lộ',
    kind: 'material',
    color: '#9bd8e4',
    desc: 'Gieo tại linh điền; trưởng thành sau 6 ngày game.',
  },
  huyen_thiet: {
    name: 'Huyền Thiết',
    kind: 'material',
    color: '#a2b7c6',
    desc: 'Khoáng thạch dùng chế tạo pháp bảo.',
  },
  cong_thuc_ngoc: {
    name: 'Công Thức Ngọc Hộ Thân',
    kind: 'material',
    color: '#dbc88e',
    desc: 'Học trong động phủ để chế tạo pháp bảo.',
  },
  cong_thuc_pha_canh: {
    name: 'Đan Phương Phá Cảnh',
    kind: 'material',
    color: '#dbc88e',
    desc: 'Học tại xưởng động phủ để luyện Phá Cảnh Đan.',
  },
  thuc_an_linh_thu: {
    name: 'Linh Thú Đan',
    kind: 'material',
    color: '#d5b17e',
    desc: 'Dùng nuôi dưỡng yêu thú đồng hành.',
  },
  phap_bao_ngoc: {
    name: 'Ngọc Hộ Thân',
    kind: 'material',
    color: '#9ad5bd',
    desc: 'Vận dụng trong động phủ: +12 phòng ngự, +100 sinh lực.',
  },
  moc_kiem: {
    name: 'Mộc Kiếm',
    kind: 'equipment',
    slot: 'weapon',
    rarity: 'white',
    reqLevel: 1,
    bonus: { atk: 4 },
    color: '#c4a17b',
    desc: 'Kiếm gỗ đầu tiên của người nhập đạo.',
  },
};
export const EXPANSION_OFFERS: ShopOffer[] = [
  ...['hat_thanh_linh', 'hat_linh_chi', 'hat_ngung_lo', 'huyen_thiet', 'thuc_an_linh_thu'].map(
    (item) => ({ item, qty: 1, price: { linh_thach: 1 } }),
  ),
  { item: 'cong_thuc_ngoc', qty: 1, price: { linh_thach: 3 } },
  { item: 'cong_thuc_pha_canh', qty: 1, price: { linh_thach: 3 } },
];
