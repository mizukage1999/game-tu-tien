import type { SkillDef, SkillId } from './index';
import { HEROES, type HeroId } from './heroes';

export type HeroSkillId = `${HeroId}_${1 | 2 | 3 | 4 | 5}`;
export type SpellShape = 'line' | 'circle' | 'cone' | 'self';
export interface HeroSpell {
  id: HeroSkillId;
  hero: HeroId;
  row: number;
  col: number;
  shape: SpellShape;
  rootMs?: number;
}

type Spec = [
  name: string,
  kind: NonNullable<SkillDef['kind']>,
  shape: SpellShape,
  desc: string,
  rootMs?: number,
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
  SETS[row].forEach(([name, kind, shape, desc, rootMs], col) => {
    const id = `${hero.id}_${col + 1}` as HeroSkillId;
    const support = shape === 'self';
    HERO_SPELLS[id] = { id, hero: hero.id, row, col, shape, ...(rootMs ? { rootMs } : {}) };
    HERO_SKILLS[id] = {
      hero: hero.id,
      name,
      kind,
      key: '',
      mpCost: [14, 20, 28, 36, 42][col],
      cooldownMs: [5000, 8000, 12000, 16000, 20000][col],
      multiplier: support ? 0 : [1.8, 2.2, 2.4, 3.2, 3.8][col],
      range: support
        ? 0
        : shape === 'line'
          ? 300
          : shape === 'cone'
            ? 160
            : [100, 110, 120, 145, 160][col],
      arc: shape === 'cone' ? 100 : 0,
      unlockLevel: [1, 1, 1, 8, 12][col],
      desc: `${desc}${kind === 'shield' ? ' Lá chắn bằng 35% sinh lực tối đa.' : ''}`,
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
  return [1, 2, 3, 4, 5].map((n) => `${hero}_${n}` as HeroSkillId);
}
export function heroDefaultLoadout(hero: HeroId): SkillId[] {
  return ['basic', ...heroSkillIds(hero).slice(0, 3)];
}
export function spellVisualId(id:SkillId,hero:HeroId):HeroSkillId {
  if(heroSpell(id))return id as HeroSkillId;
  const kind=id==='basic'||id==='bang_tam_tram'?'melee':id==='phi_kiem'||id==='loi_kich'?'projectile':id==='moc_linh'?'heal':id==='kim_cang'?'shield':id==='than_phap'?'dash':'nova';
  return heroSkillIds(hero).find(sid=>HERO_SKILLS[sid].kind===kind)??heroSkillIds(hero)[kind==='nova'?2:0];
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
