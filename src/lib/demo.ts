import type { JourneyData, Material, PersonId } from '../types';
const id = () => crypto.randomUUID();
export const sections = ['家庭系统', '生命故事', '性格特质', '优势与资源', '局限与代价', '擅长与不擅长', '价值观与三观', '生存方式', '对我的影响', '其他'];
export const selfSections = ['成长故事', '教育经历', '社会与工作经历', '性格特质', '优势与资源', '局限与代价', '关系与生存方式', '我与原生家庭', '当前困惑与成长课题', '其他'];
export const freshJourney = (): JourneyData => ({
  profile: { name: '林然', phone: '', avatar: '林', motto: '把人生重新拿回来。', wechatQr: '' },
  people: {
    self: { id: 'self', name: '我自己', nickname: '林然', avatar: '我', birthDate: '', birthplace: '' },
    father: { id: 'father', name: '父亲', nickname: '父亲', avatar: '父', birthDate: '', birthplace: '' },
    mother: { id: 'mother', name: '母亲', nickname: '母亲', avatar: '母', birthDate: '', birthplace: '' }
  },
  materials: [], insights: [],
  innerRoles: [
    { id: 'innerFather', name: '内在父亲', avatar: '父', trait: '力量 · 边界 · 方向', basedOn: ['father', 'self'] },
    { id: 'innerMother', name: '内在母亲', avatar: '母', trait: '接纳 · 滋养 · 连接', basedOn: ['mother', 'self'] },
    { id: 'innerChild', name: '内在小孩', avatar: '我', trait: '感受 · 需要 · 天真', basedOn: ['self'] }
  ]
});
export const createMaterial = (personId: PersonId, section: string, text: string, source: Material['source']): Material => ({ id: id(), personId, section, text, source, createdAt: new Date().toISOString() });
