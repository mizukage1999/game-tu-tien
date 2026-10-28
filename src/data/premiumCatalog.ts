/** Presentation only: these packs are not payment offers or client-side rewards. */
export const JADE_PACK_PREVIEWS = [
  { jade: 60, bonus: 0, vnd: 25000, art: 0 },
  { jade: 300, bonus: 30, vnd: 99000, art: 1 },
  { jade: 680, bonus: 80, vnd: 199000, art: 2 },
  { jade: 1280, bonus: 180, vnd: 349000, art: 3 },
  { jade: 2880, bonus: 480, vnd: 699000, art: 4 },
  { jade: 6480, bonus: 1280, vnd: 1499000, art: 5 },
  { jade: 12880, bonus: 2880, vnd: 2999000, art: 6 },
  { jade: 25880, bonus: 6880, vnd: 5999000, art: 7 },
] as const;

/** Only this entitlement currently has a server-backed exchange. */
export const JADE_ENTITLEMENT = { id: 'tien_phap_bao', price: 200 } as const;
export const JADE_SHOP = [
  {
    id: 'tien_phap_bao',
    name: 'Thiên Ngọc Tiên Ấn',
    group: 'rare',
    price: 200,
    live: true,
    detail:
      'Tiên pháp bảo · Ngọc Bội · Lv.10. Công +40, Thủ +25, Sinh lực +220. Mỗi tài khoản sở hữu một lần.',
  },
  {
    id: 'hoi_xuan_dan',
    name: 'Đan Hồi Phục',
    group: 'power',
    price: 50,
    live: false,
    detail: 'Dự kiến bổ sung đan dược hỗ trợ hành trình. Chưa mở đổi bằng Tiên Ngọc.',
  },
  {
    id: 'cong_thuc_ngoc',
    name: 'Công Thức Luyện Ngọc',
    group: 'rare',
    price: 150,
    live: false,
    detail: 'Gian hàng nguyên liệu quý đang được chuẩn bị.',
  },
  {
    id: 'ao_tuyet_vu',
    icon: 'armor_blue',
    name: 'Ngoại Trang · Tuyết Vũ',
    group: 'outfit',
    price: 1280,
    live: false,
    detail: 'Mẫu ngoại trang dự kiến. Chưa mở bán hoặc thay đổi ngoại hình.',
  },
  {
    id: 'tui_duong_linh',
    icon: 'thuc_an_linh_thu',
    name: 'Túi Dưỡng Linh',
    group: 'other',
    price: 1800,
    live: false,
    detail:
      'Túi chăm sóc linh thú đang được chuẩn bị. Linh thú chiến đấu vẫn thu phục trong thế giới.',
  },
  {
    id: 'ho_dao_phu',
    icon: 'cong_thuc_ngoc',
    name: 'Hộ Đạo Phù',
    group: 'power',
    price: 100,
    live: false,
    detail: 'Mẫu đạo cụ hỗ trợ. Quyền lợi và giá sẽ được công bố khi mở bán.',
  },
] as const;
