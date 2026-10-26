import type { SkillDef, SkillId } from './index';
import { HEROES, type HeroId } from './heroes';

export type HeroSkillId = `${HeroId}_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`;
export type SpellShape = 'line' | 'circle' | 'cone' | 'self';
export type SpellMotion = 'travel' | 'sweep' | 'eruption' | 'orbit' | 'ward' | 'bloom';
interface SpellTuning {
  motion?: SpellMotion;
  range?: number;
  arc?: number;
  multiplier?: number;
  healFraction?: number;
  shieldFraction?: number;
  shieldMs?: number;
}
export interface HeroSpell {
  id: HeroSkillId;
  hero: HeroId;
  row: number;
  col: number;
  shape: SpellShape;
  rootMs?: number;
  motion: SpellMotion;
  windupMs: number;
  duration: number;
  healFraction: number;
  shieldFraction: number;
  shieldMs: number;
}

type Spec = [
  name: string,
  kind: NonNullable<SkillDef['kind']>,
  shape: SpellShape,
  desc: string,
  rootMs?: number,
  tuning?: SpellTuning,
];

/** New skills retain the first five IDs so existing characters keep their loadout. */
const ADVANCED: Spec[][] = [
  [
    [
      'Lưu Quang',
      'melee',
      'cone',
      'Kiếm khí uốn thành sóng quét rộng phía trước.',
      0,
      { range: 210, arc: 125, motion: 'sweep' },
    ],
    [
      'Nhất Kiếm',
      'projectile',
      'line',
      'Dồn kiếm ý vào một đường đâm xa, hẹp và mạnh.',
      0,
      { range: 390, multiplier: 3.5 },
    ],
    [
      'Bách Xuyên',
      'melee',
      'cone',
      'Kiếm triều xuyên qua nhóm địch trong hình quạt.',
      0,
      { range: 260, arc: 70 },
    ],
    [
      'Vạn Kiếm',
      'nova',
      'circle',
      'Vạn kiếm xoay quanh người, chặn chân địch 0,6 giây.',
      600,
      { range: 180, motion: 'orbit' },
    ],
    [
      'Kiếm Thần',
      'nova',
      'circle',
      'Thiên kiếm giáng xuống, bộc phát kiếm ý diện rộng.',
      0,
      { range: 210, motion: 'eruption' },
    ],
  ],
  [
    [
      'Hộ Thân Băng Giáp',
      'shield',
      'self',
      'Băng giáp hấp thụ sát thương bằng 42% sinh lực trong 5 giây.',
      0,
      { shieldFraction: 0.42, shieldMs: 5000 },
    ],
    [
      'Tẩy Uế',
      'heal',
      'self',
      'Tuyết trắng hồi 20% sinh lực tối đa; hồi chiêu ngắn hơn đại pháp hồi phục.',
      0,
      { healFraction: 0.2 },
    ],
    [
      'Phục Sinh Băng Liên',
      'heal',
      'self',
      'Băng liên hồi 32% sinh lực khi còn sống; không hồi sinh sau khi tử trận.',
      0,
      { healFraction: 0.32 },
    ],
    [
      'Thiên Giới',
      'nova',
      'circle',
      'Băng trụ khóa vòng vây, giữ chân địch 1,4 giây.',
      1400,
      { range: 175 },
    ],
    [
      'Thần Phù',
      'projectile',
      'line',
      'Thần phù phá không, xuyên thẳng và đóng băng 0,8 giây.',
      800,
      { range: 360 },
    ],
  ],
  [
    [
      'Đằng La',
      'projectile',
      'line',
      'Dây gai vươn dài theo hướng bắn, trói chân địch 1,2 giây.',
      1200,
      { range: 320 },
    ],
    [
      'Bách Thảo',
      'heal',
      'self',
      'Linh thảo nở hoa, hồi 30% sinh lực tối đa.',
      0,
      { healFraction: 0.3 },
    ],
    [
      'Linh Thú Tiễn',
      'melee',
      'cone',
      'Linh tiễn hóa bóng hươu lao qua nhóm địch phía trước.',
      0,
      { range: 250, arc: 65 },
    ],
    [
      'Thiên La',
      'nova',
      'circle',
      'Lưới gai phủ quanh người, trói chân địch 1,5 giây.',
      1500,
      { range: 170 },
    ],
    [
      'Mộc Thần',
      'shield',
      'self',
      'Cổ thụ linh quang tạo lá chắn bằng 50% sinh lực trong 8 giây.',
      0,
      { shieldFraction: 0.5, shieldMs: 8000 },
    ],
  ],
  [
    [
      'Cuồng Sát',
      'melee',
      'cone',
      'Liên trảm ba vệt đao thành một đòn quét gần đầy uy lực.',
      0,
      { range: 165, arc: 120, multiplier: 3.1 },
    ],
    [
      'Huyết Ảnh',
      'projectile',
      'line',
      'Bóng sát thủ hóa huyết nhận đâm thẳng về trước.',
      0,
      { range: 330 },
    ],
    [
      'Loạn Vũ',
      'nova',
      'circle',
      'Lốc song đao cắt mọi mục tiêu áp sát.',
      0,
      { range: 150, motion: 'orbit' },
    ],
    [
      'Tử Sát',
      'projectile',
      'line',
      'Sát nhận tầm xa ghim chân địch 0,8 giây.',
      800,
      { range: 350 },
    ],
    [
      'Sát Thần',
      'melee',
      'cone',
      'Đao ảnh khổng lồ bổ xuống hình quạt hẹp phía trước.',
      0,
      { range: 240, arc: 60, multiplier: 5 },
    ],
  ],
  [
    [
      'Hỏa Long',
      'projectile',
      'line',
      'Hỏa long bay thẳng xuyên qua mục tiêu trên đường.',
      0,
      { range: 360 },
    ],
    [
      'Phượng Hoàng',
      'melee',
      'cone',
      'Phượng hoàng xòe cánh quét lửa thành hình quạt rộng.',
      0,
      { range: 230, arc: 135 },
    ],
    ['Diễm Ngục', 'nova', 'circle', 'Cột lửa dựng thành hỏa ngục quanh người.', 0, { range: 175 }],
    [
      'Tịnh Hỏa',
      'heal',
      'self',
      'Hỏa liên tái tạo hồi 28% sinh lực tối đa.',
      0,
      { healFraction: 0.28 },
    ],
    [
      'Hỏa Thần',
      'nova',
      'circle',
      'Pháp tướng hỏa thần giáng một đòn bộc phát diện rộng.',
      0,
      { range: 205 },
    ],
  ],
  [
    ['Hồn Tức', 'projectile', 'line', 'Ma tức hóa linh hồn lao thẳng về trước.', 0, { range: 330 }],
    [
      'Vong Hồn',
      'melee',
      'cone',
      'Ba vong hồn hợp thành một đợt công kích hình quạt.',
      0,
      { range: 220, arc: 110 },
    ],
    [
      'Ma Liên Hoa',
      'nova',
      'circle',
      'Hắc liên nở rộ rồi nổ tung quanh người.',
      0,
      { range: 170, motion: 'bloom' },
    ],
    [
      'Tà Linh Chú',
      'nova',
      'circle',
      'Chú ấn giáng xuống, giữ chân địch 1,3 giây.',
      1300,
      { range: 150 },
    ],
    [
      'Diệt Thế',
      'nova',
      'circle',
      'U minh xoáy thành vực ma khí diện rộng.',
      0,
      { range: 215, motion: 'orbit' },
    ],
  ],
  [
    [
      'Bát Nhã',
      'projectile',
      'line',
      'Pháp luân trí tuệ xuyên thẳng qua hàng địch.',
      0,
      { range: 310 },
    ],
    [
      'La Hán',
      'melee',
      'cone',
      'Kim quyền quét mạnh hình quạt phía trước.',
      0,
      { range: 190, arc: 115 },
    ],
    [
      'Phật Ấn',
      'nova',
      'circle',
      'Pháp ấn trấn áp quanh người, giữ chân địch 1,2 giây.',
      1200,
      { range: 160 },
    ],
    [
      'Kim Thân',
      'shield',
      'self',
      'Kim thân hấp thụ sát thương bằng 48% sinh lực trong 8 giây.',
      0,
      { shieldFraction: 0.48, shieldMs: 8000 },
    ],
    [
      'Phật Thần',
      'heal',
      'self',
      'Đại liên đài hồi 38% sinh lực tối đa.',
      0,
      { healFraction: 0.38 },
    ],
  ],
  [
    [
      'Ảo Cảnh',
      'nova',
      'circle',
      'Hoa trận mê ảnh khóa chân địch quanh người 1 giây.',
      1000,
      { range: 155, motion: 'bloom' },
    ],
    [
      'Phân Thân',
      'projectile',
      'line',
      'Bóng ảo ngưng thành đao khí lao thẳng; tan sau một đòn.',
      0,
      { range: 340 },
    ],
    [
      'Hoa Tán',
      'melee',
      'cone',
      'Đàn hồ điệp hóa lưỡi đao quét rộng phía trước.',
      0,
      { range: 220, arc: 140 },
    ],
    [
      'Tịnh Mộng',
      'nova',
      'circle',
      'Mộng ấn trấn giữ địch 1,5 giây trong vùng ảnh hưởng.',
      1500,
      { range: 155 },
    ],
    [
      'Ảo Thần',
      'shield',
      'self',
      'Ảo thần kết liên đài tạo lá chắn bằng 50% sinh lực trong 7 giây.',
      0,
      { shieldFraction: 0.5, shieldMs: 7000 },
    ],
  ],
];
const SETS: Spec[][] = [
  [
    ['Thanh Phong Kiếm', 'melee', 'cone', 'Chém kiếm khí theo hướng đánh.'],
    ['Vô Ảnh Trảm', 'projectile', 'line', 'Kiếm khí xuyên các mục tiêu trên đường thẳng.'],
    ['Kiếm Vực', 'nova', 'circle', 'Gọi kiếm trận quanh người.'],
    ['Thiên Kiếm Giáng Thế', 'nova', 'circle', 'Thiên kiếm đánh xuống vòng vây.'],
    ['Kiếm Tâm Thông Minh', 'shield', 'self', 'Kiếm tâm tạo lá chắn trong 6 giây.'],
  ],
  [
    ['Thanh Linh Phù', 'projectile', 'line', 'Băng phù xuyên theo hướng chỉ định.'],
    ['Băng Tâm Chú', 'nova', 'circle', 'Băng ấn gây sát thương và giữ chân 1 giây.', 1000],
    ['Phong Tuyết Kết Giới', 'shield', 'self', 'Kết giới tuyết bảo hộ trong 6 giây.'],
    ['Cửu Thiên Băng Hoa', 'nova', 'circle', 'Băng liên nở quanh người, giữ chân 1 giây.', 1000],
    ['Thiên Tuyết Vĩnh Hằng', 'nova', 'circle', 'Bão tuyết phủ quanh người.'],
  ],
  [
    ['Lục Diệp Tiễn', 'projectile', 'line', 'Linh tiễn xuyên mục tiêu trên đường bay.'],
    ['Phong Linh Tiễn', 'melee', 'cone', 'Bắn loạt linh tiễn hình quạt.'],
    ['Trấn Hương Vạn Mộc', 'nova', 'circle', 'Cổ mộc trói mục tiêu quanh người 1 giây.', 1000],
    ['Sinh Sinh Bất Tận', 'heal', 'self', 'Linh liên hồi 24% sinh lực tối đa.'],
    ['Thiên Mộc Hộ Thể', 'shield', 'self', 'Cổ thụ tạo lá chắn trong 6 giây.'],
  ],
  [
    ['Ảnh Sát', 'projectile', 'line', 'Ảnh nhận đâm xuyên theo hướng đánh.'],
    ['Song Phách Trảm', 'melee', 'cone', 'Song đao chém chéo phía trước.'],
    ['Vô Ảnh Hộ', 'shield', 'self', 'Ảnh vệ hấp thụ sát thương trong 6 giây.'],
    ['Huyết Nguyệt Loạn Vũ', 'nova', 'circle', 'Song nhận xoáy quanh bản thân.'],
    ['Ám Dạ Diệt Thế', 'nova', 'circle', 'Ảnh sát bộc phát thành vòng tròn.'],
  ],
  [
    ['Hỏa Ma Chỉ', 'projectile', 'line', 'Hỏa chỉ xuyên các mục tiêu trên đường thẳng.'],
    ['Liên Hoa Trảm', 'melee', 'cone', 'Chém hỏa liên phía trước.'],
    ['Thiêu Thiên', 'nova', 'circle', 'Bộc phát hỏa trụ quanh người.'],
    ['Hồng Liên Ngục Hỏa', 'nova', 'circle', 'Hỏa liên nở rộ thiêu đốt vòng vây.'],
    ['Vạn Hỏa Triều Thiên', 'nova', 'circle', 'Thiên hỏa giáng xuống quanh người.'],
  ],
  [
    ['Huyết Ma Trảm', 'projectile', 'line', 'Ma nhận xuyên theo hướng đánh.'],
    ['U Minh Hộ', 'shield', 'self', 'Ma ảnh bảo vệ bản thân trong 6 giây.'],
    ['Ma Ảnh Loạn Vũ', 'nova', 'circle', 'Ma nhận xoay quanh bản thân.'],
    ['Cửu U Ngục', 'nova', 'circle', 'U ngục giữ chân đối thủ trong 1 giây.', 1000],
    ['Ma Thần Giáng Lâm', 'shield', 'self', 'Ma thần tạo lá chắn trong 6 giây.'],
  ],
  [
    ['Kim Cang Chưởng', 'projectile', 'line', 'Phóng kim chưởng theo đường thẳng.'],
    ['Phật Quang Phổ Độ', 'heal', 'self', 'Phật quang hồi 24% sinh lực tối đa.'],
    ['Vô Tướng Thân Công', 'shield', 'self', 'Kim cang hộ thân trong 6 giây.'],
    ['Như Lai Thần Ấn', 'nova', 'circle', 'Chưởng ấn giáng quanh người, giữ chân 1 giây.', 1000],
    ['Đại Bi Truyền Đạo', 'heal', 'self', 'Kim liên hồi 24% sinh lực tối đa.'],
  ],
  [
    ['Ảo Ảnh Trảm', 'projectile', 'line', 'Ảo đao xuyên theo hướng đánh.'],
    ['Mê Tiệt Hoa', 'nova', 'circle', 'Hoa ấn giữ chân mục tiêu 1 giây.', 1000],
    ['Tử Đằng Loạn Vũ', 'nova', 'circle', 'Hoa nhận xoáy quanh bản thân.'],
    ['Vạn Hoa Ảnh Giới', 'shield', 'self', 'Kính ảnh tạo lá chắn trong 6 giây.'],
    ['Đạo Tâm Linh Cảnh', 'heal', 'self', 'Linh cảnh hồi 24% sinh lực tối đa.'],
  ],
];

export const HERO_SPELLS = {} as Record<HeroSkillId, HeroSpell>;
export const HERO_SKILLS = {} as Record<HeroSkillId, SkillDef>;
HEROES.forEach((hero, row) =>
  [...SETS[row], ...ADVANCED[row]].forEach(([name, kind, shape, desc, rootMs, tuning], col) => {
    const id = `${hero.id}_${col + 1}` as HeroSkillId;
    const support = shape === 'self';
    const motion =
      tuning?.motion ??
      (shape === 'line'
        ? 'travel'
        : shape === 'cone'
          ? 'sweep'
          : kind === 'heal'
            ? 'bloom'
            : kind === 'shield'
              ? 'ward'
              : 'eruption');
    HERO_SPELLS[id] = {
      id,
      hero: hero.id,
      row,
      col,
      shape,
      motion,
      ...(rootMs ? { rootMs } : {}),
      windupMs: col < 5 ? 400 : [300, 450, 500, 550, 650][col - 5],
      duration: col < 5 ? 960 : 1120,
      healFraction: tuning?.healFraction ?? 0.24,
      shieldFraction: tuning?.shieldFraction ?? 0.35,
      shieldMs: tuning?.shieldMs ?? 6000,
    };
    HERO_SKILLS[id] = {
      hero: hero.id,
      name,
      kind,
      key: '',
      mpCost: [14, 20, 28, 36, 42, 30, 34, 42, 48, 60][col],
      cooldownMs: [5000, 8000, 12000, 16000, 20000, 9000, 11000, 15000, 19000, 26000][col],
      multiplier: support
        ? 0
        : (tuning?.multiplier ?? [1.8, 2.2, 2.4, 3.2, 3.8, 2.7, 3.1, 3.5, 3.8, 4.7][col]),
      range:
        tuning?.range ??
        (support
          ? 0
          : shape === 'line'
            ? 300
            : shape === 'cone'
              ? 160
              : [100, 110, 120, 145, 160, 150, 155, 170, 180, 205][col]),
      arc: shape === 'cone' ? (tuning?.arc ?? 100) : 0,
      unlockLevel: [1, 1, 1, 8, 12, 16, 20, 25, 30, 40][col],
      desc: `${desc}${kind === 'shield' && col < 5 ? ' Lá chắn bằng 35% sinh lực tối đa.' : ''}`,
      growth: { multiplier: 0.08, cooldown: -0.025, range: support ? 0 : 0.015 },
      bonus: { desc: 'Lĩnh ngộ: uy lực tiếp tục tăng theo cấp kỹ năng.' },
    };
  }),
);

export function heroSpell(id: string): HeroSpell | undefined {
  return Object.prototype.hasOwnProperty.call(HERO_SPELLS, id)
    ? HERO_SPELLS[id as HeroSkillId]
    : undefined;
}
export function heroSkillIds(hero: HeroId): HeroSkillId[] {
  return Array.from({ length: 10 }, (_, i) => `${hero}_${i + 1}` as HeroSkillId);
}
export function heroDefaultLoadout(hero: HeroId): SkillId[] {
  return ['basic', ...heroSkillIds(hero).slice(0, 3), 'bang_tam_tram', 'phi_kiem', 'han_bang_tran'];
}
export function spellVisualId(id: SkillId, hero: HeroId): HeroSkillId {
  if (heroSpell(id)) return id as HeroSkillId;
  const kind =
    id === 'basic' || id === 'bang_tam_tram'
      ? 'melee'
      : id === 'phi_kiem' || id === 'loi_kich'
        ? 'projectile'
        : id === 'moc_linh'
          ? 'heal'
          : id === 'kim_cang'
            ? 'shield'
            : id === 'than_phap'
              ? 'dash'
              : 'nova';
  return (
    heroSkillIds(hero).find((sid) => HERO_SKILLS[sid].kind === kind) ??
    heroSkillIds(hero)[kind === 'nova' ? 2 : 0]
  );
}

/** Shared by the world and arena, so spell art and the actual hit area agree. */
export function heroSpellHit(
  shape: SpellShape,
  from: { x: number; y: number },
  facing: { x: number; y: number },
  range: number,
  arc: number,
  target: { x: number; y: number },
): boolean {
  const x = target.x - from.x,
    y = target.y - from.y;
  if (shape === 'self') return false;
  if (shape === 'circle') return Math.hypot(x, y) <= range;
  const along = x * facing.x + y * facing.y;
  if (shape === 'line')
    return along >= 0 && along <= range && Math.abs(x * facing.y - y * facing.x) <= 24;
  return Math.hypot(x, y) <= range && along >= Math.hypot(x, y) * Math.cos((arc * Math.PI) / 360);
}
