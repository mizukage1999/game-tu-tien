const FEATURES = {
  alchemy: { title: 'Đan Phòng', subtitle: 'Giữ lửa · Kết đan', desc: 'Thu thập linh thảo, phối hợp dược liệu và khai lò luyện đan.', tag: 'Đan đạo' },
  home: { title: 'Động Phủ', subtitle: 'Một chốn giữa ngàn mây', desc: 'Bồi dưỡng linh mạch, chăm dược điền và tu luyện tại động phủ riêng.', tag: 'Chốn an thân' },
  mounts: { title: 'Ngự Hành', subtitle: 'Đạp gió · Vượt ngàn mây', desc: 'Kết duyên cùng thanh kiếm và bạch hạc, mở những hành trình xa.', tag: 'Kiếm & Hạc' },
};

export function JourneyFeatureHeader({ type, detail }: { type: keyof typeof FEATURES; detail: string }) {
  const data = FEATURES[type];
  return <header className={`journey-feature-hero feature-${type}`}>
    <img src={`/assets/journey/${type}.png`} alt=""/>
    <div><small>{data.subtitle}</small><h2>{data.title}</h2><p>{data.desc}</p><span className="journey-feature-detail">{detail}</span></div>
    <span className="journey-feature-seal">{data.tag}</span>
  </header>;
}
