import type { Material, ParentHighValueSignals } from '../types';

const emptySignals = (): ParentHighValueSignals => ({ frequentQuotes: [], shapingChains: [], implicitRules: [], positiveLegacy: [] });

/** Only promotes words the user actually recorded; it deliberately leaves uncertain fields blank. */
export function deriveParentHighValueSignals(materials: Material[]): ParentHighValueSignals {
  const signals = emptySignals();
  const raw = materials.filter((item) => item.isRaw);
  for (const item of raw) {
    const quotes = item.text.match(/[“\"]([^”\"]{3,80})[”\"]/g) || [];
    for (const quote of quotes) {
      const text = quote.slice(1, -1).trim();
      if (text && !signals.frequentQuotes.some((entry) => entry.text === text)) signals.frequentQuotes.push({ text, context: '用户记录', sourceId: item.id });
    }
    const source = [item.id];
    if (/贫穷|困难|吃苦|很早.*工作|早早.*工作|辍学|失业|挫折|生病|疾病/.test(item.text)) {
      const fact = item.text.replace(/\s+/g, ' ').slice(0, 120);
      signals.shapingChains.push({ facts: [fact], possibleInfluence: '从这段经历看，TA 也许因此更看重安全、稳定或节俭；这还需要更多材料核对。', sourceIds: source });
    }
    const ruleMap: Array<[RegExp, string]> = [
      [/稳定|铁饭碗|风险|冒险/, '稳定比冒险更重要'],
      [/听话|懂事|应该听|不许顶嘴/, '孩子应该听大人的'],
      [/面子|丢脸|别人怎么看/, '不要给家里丢脸'],
      [/忍|别哭|不许哭|情绪|脆弱/, '情绪最好不要表达出来'],
      [/责任|牺牲|为家|照顾/, '家庭责任比个人感受更重要']
    ];
    for (const [pattern, rule] of ruleMap) if (pattern.test(item.text) && !signals.implicitRules.some((entry) => entry.rule === rule)) signals.implicitRules.push({ rule, confidence: 'low', sourceIds: source });
    const legacyMap: Array<[RegExp, string]> = [
      [/坚持|吃苦|熬过|不放弃/, '面对困难坚持下去的能力'],
      [/责任|照顾|承担/, '责任感与家庭担当'],
      [/节俭|省|珍惜/, '节俭与资源意识'],
      [/善良|帮助|体谅/, '善良与共情'],
      [/手艺|审美|创造|做东西/, '创造力或手艺']
    ];
    for (const [pattern, strength] of legacyMap) if (pattern.test(item.text) && !signals.positiveLegacy.some((entry) => entry.strength === strength)) signals.positiveLegacy.push({ strength, howItShows: '来自用户记录的家庭经历，仍可继续补充具体例子。', sourceIds: source });
  }
  signals.frequentQuotes = signals.frequentQuotes.slice(0, 6);
  signals.shapingChains = signals.shapingChains.slice(0, 3);
  signals.implicitRules = signals.implicitRules.slice(0, 5);
  signals.positiveLegacy = signals.positiveLegacy.slice(0, 5);
  return signals;
}
