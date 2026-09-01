import type { Material, PersonId } from '../types';

export type ParentQuestion = { id: string; module: string; dimension: string; text: string };

const dimensions = [
  ['TA 的来时路', '人生背景', ['你知道 TA 出生和成长的地方吗？那个地方或家庭背景，曾怎样影响 TA 的选择？', '讲一个你听过的、关于 TA 年轻时家庭处境的具体片段。']],
  ['TA 的来时路', '成长经历与关键事件', ['TA 的成长过程中，有没有一件后来常被提起的事？当时发生了什么？', '你知道 TA 在童年或青春期和谁最亲近、又和谁最难相处吗？']],
  ['TA 的来时路', '未完成的人生', ['TA 曾经特别想做、却没有继续做下去的一件事是什么？你知道原因吗？', '有没有一个 TA 提起时仍会遗憾、感慨或避开的选择？']],
  ['TA 的内在世界', '性格与处事方式', ['遇到陌生人或棘手的事时，TA 通常怎么处理？请想一个具体场景。', '你会怎样向一个不了解 TA 的人描述 TA 的脾气和做事方式？']],
  ['TA 的内在世界', '核心价值观', ['TA 经常用什么标准评价一个人或一件事？', '有没有一句 TA 常说的话，能看出 TA 相信什么、反对什么？']],
  ['TA 的内在世界', '最看重什么', ['在时间、金钱或精力有限时，TA 往往把什么放在最前面？', 'TA 为了什么事情最愿意投入或坚持？请讲一个例子。']],
  ['TA 的内在世界', '最害怕什么', ['什么情境最容易让 TA 紧张、回避或变得严厉？', 'TA 曾经最担心失去什么，或最怕被别人怎样看待？']],
  ['TA 的内在世界', '内在最深的需要', ['当 TA 很累或受委屈时，TA 真正希望身边的人怎么对待 TA？', 'TA 很少直接说出口、但你感觉 TA 在等待的东西是什么？']],
  ['TA 与人相处的方式', '爱的表达', ['TA 关心你时，通常会说什么或做什么？', '你最能感到 TA 的爱的一次经历是什么？']],
  ['TA 与人相处的方式', '情绪表达', ['TA 难过、生气或高兴时，脸上和行为上通常有什么变化？', '家里发生让 TA 情绪很强烈的事时，TA 会怎么表达？']],
  ['TA 与人相处的方式', '沟通与冲突', ['你和 TA 意见不同时，谈话通常怎样开始、又怎样结束？', 'TA 和家人发生冲突时，常用沉默、讲道理、指责还是别的方式？请讲一次。']],
  ['TA 与人相处的方式', '边界与控制', ['TA 会不会替家人做决定或干预很多事？请想一个具体例子。', '当你想按自己的方式做一件事时，TA 通常怎么回应？']],
  ['TA 心里的家庭', '家庭 / 婚姻观与东方家庭文化影响', ['TA 怎么看待婚姻、孝顺、责任或一个家应该怎样运转？', 'TA 对家庭成员各自该做什么，有没有很明确的期待？']],
  ['TA 心里的家庭', 'TA 对孩子的期待', ['TA 希望你成为什么样的人？这些期待通常怎样表达？', '你记得 TA 因为什么事情表扬过你，或对你特别失望过吗？']],
  ['TA 眼中的我', 'TA 如何看待我', ['你感觉在 TA 眼里，你是一个怎样的孩子或成年人？有什么具体话语或经历支持？', '当你需要 TA 的理解或支持时，TA 通常把你看成需要什么的人？']],
  ['TA 留给我的东西', 'TA 对我的影响', ['从 TA 身上，你现在仍会不自觉带着哪一种做事或相处方式？', '回想一件现在仍会影响你的往事，它和 TA 的关系是什么？']]
] as const;

export const parentQuestions: ParentQuestion[] = dimensions.flatMap(([module, dimension, prompts], dimensionIndex) => prompts.map((text, promptIndex) => ({ id: `parent-${dimensionIndex + 1}-${promptIndex + 1}`, module, dimension, text })));

export function nextParentQuestion(personId: PersonId, materials: Material[], excludedIds: Set<string> = new Set()) {
  const records = materials.filter((item) => item.personId === personId && item.isRaw);
  const coverage = new Map<string, number>();
  const used = new Set([...records.map((item) => item.questionId).filter(Boolean), ...excludedIds]);
  for (const item of records) if (item.questionDimension) coverage.set(item.questionDimension, (coverage.get(item.questionDimension) || 0) + 1);
  const lowest = Math.min(...parentQuestions.map((item) => coverage.get(item.dimension) || 0));
  const candidates = parentQuestions.filter((item) => (coverage.get(item.dimension) || 0) === lowest);
  return candidates.find((item) => !used.has(item.id)) || candidates[0];
}
