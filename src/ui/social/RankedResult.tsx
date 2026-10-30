import { useStore } from 'zustand';
import { rankedStore, rankedTier } from '../../net/ranked';
export function RankedResult() {
  const { page, error } = useStore(rankedStore);
  return (
    <p role="status">
      {error ||
        (!page || page.match
          ? 'Đang xác nhận kết quả với server…'
          : page.status === 'disputed'
            ? 'Hai bên báo kết quả khác nhau · chưa tính điểm.'
            : page.status === 'expired'
              ? 'Trận mất kết nối · chưa xác nhận kết quả.'
              : `${rankedTier(page.rating)} · ${page.rating} điểm mùa này`)}
      <br />
      {page?.result?.status === 'finished' && !page.result.scored && (
        <small>
          Trận này vượt giới hạn lượt tính điểm.
          <br />
        </small>
      )}
      <small>Chi tiết cập nhật trong Tỷ Võ Xếp Hạng.</small>
    </p>
  );
}
