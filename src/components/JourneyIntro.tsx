import type { CSSProperties } from 'react';
import journeyPath from '../assets/journey-path-starry.png';

export function JourneyIntro({ onStart }: { onStart: () => void }) {
  return <main className="journey-gate" style={{ '--journey-path': `url(${journeyPath})` } as CSSProperties}>
    <div className="journey-gate__glow" aria-hidden="true" />
    <header className="journey-gate__brand">
      <b>寻根之旅</b>
      <span>原生家庭考古</span>
      <p className="journey-gate__eyebrow">一段回望来处的旅程</p>
    </header>
    <section className="journey-gate__content" aria-labelledby="journey-gate-title">
      <h1 id="journey-gate-title">有些答案，藏在来时的路上。</h1>
      <p className="journey-gate__copy">从原生家庭出发，理解自己如何成为今天的你。</p>
      <button className="journey-gate__start" onClick={onStart}>开启旅程 <b>→</b></button>
    </section>
  </main>;
}
