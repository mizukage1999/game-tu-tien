import { useGame } from '../../store/gameStore';
import { CorrespondenceIcon } from '../social/CorrespondenceIcon';
import '../social/correspondence.css';

/** No mail source is connected yet; never render sample letters or claimable rewards. */
export function MailPanel() {
  const name = useGame((s) => s.player.name);
  return (
    <div className="cult-correspondence cult-mail">
      <nav className="cult-side correspondence-nav" aria-label="Mục thư">
        <button className="active" aria-current="page">
          <CorrespondenceIcon kind="mail" />
          <span>Tất cả</span>
          <small>0</small>
        </button>
        <div className="correspondence-side-note">
          <span>THƯ TÍN</span>Một phong thư,
          <br />
          một mối duyên.
        </div>
      </nav>
      <section className="correspondence-list" aria-label="Danh sách thư">
        <header className="correspondence-list-heading">
          <h4>Hộp thư</h4>
          <span>0 thư</span>
        </header>
        <div className="correspondence-empty">
          <CorrespondenceIcon kind="mail" />
          <h4>Hộp thư trống</h4>
          <p>Hiện chưa có thư nào.</p>
        </div>
        <footer className="correspondence-list-foot">Tất cả thư của bạn</footer>
      </section>
      <section className="cult-letter" aria-label="Nội dung thư">
        <div className="cult-letter-scroll">
          <span className="cult-letter-eyebrow">THƯ TÍN GIANG HỒ</span>
          <h2>Chưa có thư mới</h2>
          <p className="cult-letter-recipient">
            Đạo hữu: <b>{name}</b>
          </p>
          <div className="cult-letter-rule" />
          <div className="cult-letter-empty">
            <CorrespondenceIcon kind="mail" />
            <h3>Chờ một phong thư</h3>
            <p>Nội dung thư và vật phẩm đính kèm sẽ hiển thị ở đây khi bạn nhận được thư.</p>
          </div>
          <p className="cult-letter-poem">Sơn hà vạn dặm, thư gửi người hữu duyên.</p>
        </div>
      </section>
    </div>
  );
}
