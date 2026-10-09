// 历史记录 / 导出图片：用 public/result-kit.js（共用小工具，纯前端，只存本机）。
type Kit = {
  configure: (o: { id: string; title: string; capture?: () => unknown; start?: unknown }) => void;
  save: (s: unknown, o?: { key?: string }) => { ok: boolean };
  list: () => unknown[];
  exportImage: (s: unknown, t?: number) => void;
  showHistory: () => void;
  lastSave: () => { ok: boolean } | null;
  ensureNick: (cb: () => void, o?: { onCancel?: () => void }) => void;
  guard: (answering: boolean, onCancel?: () => void) => void;
  nickReset: () => void;
  capture: (root: Element | null, o?: { skip?: string }) => unknown;
  refreshSections: () => void;
};

export type RecordSummary = { headline: string; sub: string; metrics: Array<{ label: string; value: string; frac: number; tone: string }>; notes: string[] };

export function kit(): Kit | undefined {
  return (window as unknown as { ResultKit?: Kit }).ResultKit;
}

export function setupKit() {
  const k = kit();
  // capture：导出图片时，把「生命成长地图」页上展示的全部内容（能力卡、雷达图、关键发现、成长阶段等）抓下来画进长图
  k?.configure({
    id: 'root',
    title: '寻根之旅 · 我的生命成长地图',
    start: [{ sel: 'button', text: '^\\s*(开启旅程|开始探索)' }],
    capture: () => {
      const page = document.querySelector('.life-map-page');
      return page ? k.capture(page, { skip: '.rj-tools' }) : null;
    },
  });
}

/** 交卷时保存一条记录。失败（无痕模式、空间满）时不影响结果页。 */
export function saveRecord(summary: RecordSummary, key: string): boolean {
  const k = kit();
  if (!k) return false;
  try {
    return k.save(summary, { key }).ok;
  } catch {
    return false;
  }
}

export function historyCount(): number {
  try {
    return kit()?.list().length ?? 0;
  } catch {
    return 0;
  }
}

setupKit();
