/** Only show an AI response when it reads like an insight, never like a leaked prompt or fallback template. */
export function isActionableInsight(text: string | undefined) {
  if (!text) return false;
  const value = text.trim();
  if (value.length < 12 || value.length > 260) return false;
  return !/(请基于|任务[:：]|材料[:：]|输出一条|生成结构化|整理[“"]|维度可能呈现|不诊断|不下定论|等待用户核对|当前材料提示|从这段关于|暂时看到一种为了适应环境|值得继续被补充和核对|不是被匆忙定义|这只是一个等待你核对)/.test(value);
}
