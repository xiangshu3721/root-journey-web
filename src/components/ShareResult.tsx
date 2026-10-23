import { useEffect, useState } from "react";
import type { FamilyPatternAssessment } from "../types";
import { kit } from "../lib/records";
import { activateRootShare, retryRootShare, rootShareKey, watchRootShare, type ShareView } from "../lib/cloud-share";

function readRootNickname() {
  try {
    const fromKit = kit()?.nick?.get?.();
    if (fromKit) return fromKit;
  } catch {
    /* 没有结果工具时仍显示本地结果。 */
  }
  try {
    return globalThis.localStorage?.getItem("rk.v1.nickname") || "";
  } catch {
    return "";
  }
}

export function ShareResult({ assessment }: { assessment: FamilyPatternAssessment }) {
  const nickname = readRootNickname();
  const key = rootShareKey(nickname, assessment);
  const [view, setView] = useState<ShareView>({ saving: false, note: "", url: "", failed: false });
  useEffect(() => watchRootShare({ nickname, assessment }, setView).stop, [key, nickname, assessment]);
  const busy = view.saving && !view.url;
  const warn = Boolean(view.note && view.note !== "链接已复制" && view.note !== "链接生成中");
  return <>
    <button type="button" className="primary" disabled={busy} aria-busy={busy || undefined} onClick={() => void activateRootShare(key)}>{busy ? "分享结果 · 生成中" : "分享结果"}</button>
    {view.failed && !busy && <button type="button" className="text-button" onClick={() => retryRootShare(key)}>重试</button>}
    {view.note && <small className={warn ? "rj-share-note warn" : "rj-share-note"} role="status">{view.note}</small>}
  </>;
}
