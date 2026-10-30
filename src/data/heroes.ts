export type HeroId =
  | 'wang_lam'
  | 'ly_mo_uyen'
  | 'tham_nguyet'
  | 'so_thien'
  | 'hong_lien'
  | 'vu_minh'
  | 'quan_vo_tran'
  | 'diep_ly';

export interface HeroDef {
  id: HeroId;
  name: string;
  sex: 'male' | 'female';
  school: string;
  symbol: string;
  color: string;
  motto: string;
  desc: string;
  /** Attack, defence, control, support, mobility. Presentation ratings, not bonus stats. */
  ratings: readonly number[];
}

/** Row order is shared by the transparent portrait, pose and effect atlases. */
export const HEROES: readonly HeroDef[] = [
  {
    id: 'wang_lam',
    name: 'Vương Lâm',
    sex: 'male',
    school: 'Kiếm tu',
    symbol: '⚔',
    color: '#68c8ff',
    motto: 'Một niệm nghịch thiên',
    desc: 'Kiếm khí xuyên trận, công thủ vẹn toàn. Viết tiếp hành trình từ Vương Gia Thôn.',
    ratings: [5, 3, 3, 2, 4],
  },
  {
    id: 'ly_mo_uyen',
    name: 'Lý Mộ Uyển',
    sex: 'female',
    school: 'Phù tu',
    symbol: '❄',
    color: '#a4ddff',
    motto: 'Phù chú độ thế',
    desc: 'Băng phù giữ chân đối thủ, kết giới bảo vệ bản thân. Khởi hành tại Vương Gia Thôn.',
    ratings: [3, 4, 5, 4, 2],
  },
  {
    id: 'tham_nguyet',
    name: 'Thẩm Nguyệt',
    sex: 'female',
    school: 'Cung tu',
    symbol: '➶',
    color: '#71e3a0',
    motto: 'Thiên nhiên sinh linh',
    desc: 'Linh tiễn tầm xa, cổ mộc trói chân và linh liên hồi phục.',
    ratings: [4, 2, 4, 5, 3],
  },
  {
    id: 'so_thien',
    name: 'Sở Thiên',
    sex: 'male',
    school: 'Song đao',
    symbol: '✕',
    color: '#d58bff',
    motto: 'Sát ý vô hình',
    desc: 'Áp sát bằng song nhận, bảo vệ bằng ảnh vệ và quét sạch vòng vây.',
    ratings: [5, 2, 2, 1, 5],
  },
  {
    id: 'hong_lien',
    name: 'Hồng Liên',
    sex: 'female',
    school: 'Hỏa tu',
    symbol: '♨',
    color: '#ffac62',
    motto: 'Hồng trần như mộng',
    desc: 'Hỏa chỉ và liên trảm mở đường, hỏa trụ cùng thiên hỏa phá trận.',
    ratings: [5, 2, 3, 1, 3],
  },
  {
    id: 'vu_minh',
    name: 'Vũ Minh',
    sex: 'male',
    school: 'Ma tu',
    symbol: '✧',
    color: '#cb8bff',
    motto: 'Ma tâm thức tỉnh',
    desc: 'Ma trảm tầm xa, ảnh hộ thân và u ngục khống chế chiến trường.',
    ratings: [4, 3, 5, 1, 3],
  },
  {
    id: 'quan_vo_tran',
    name: 'Quân Vô Trần',
    sex: 'male',
    school: 'Thích tu',
    symbol: '☸',
    color: '#ffd47b',
    motto: 'Thanh tịnh nhân tâm',
    desc: 'Kim cang hộ thể, chưởng ấn phá địch và Phật quang hồi phục.',
    ratings: [3, 5, 2, 5, 1],
  },
  {
    id: 'diep_ly',
    name: 'Diệp Ly',
    sex: 'female',
    school: 'Đạo tu',
    symbol: '☯',
    color: '#9bdaff',
    motto: 'Đạo sinh vạn tượng',
    desc: 'Âm dương, thời luân và không gian ảo cảnh tạo nên lối đánh khống chế linh hoạt.',
    ratings: [4, 3, 5, 3, 3],
  },
];

export function isHeroId(value: unknown): value is HeroId {
  return typeof value === 'string' && HEROES.some((hero) => hero.id === value);
}

export function heroFor(player: { heroId?: HeroId; sex?: string }): HeroDef {
  return (
    HEROES.find((hero) => hero.id === player.heroId) ?? HEROES[player.sex === 'female' ? 1 : 0]
  );
}

export function heroRow(id: HeroId): number {
  return HEROES.findIndex((hero) => hero.id === id);
}

export const HERO_ASSETS = '/assets/heroes-v7';
