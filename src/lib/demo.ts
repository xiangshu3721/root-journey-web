import type { JourneyData, Material, PersonId } from '../types';
const id = () => crypto.randomUUID();
export const freshJourney = (): JourneyData => ({
  profile: { name: '', phone: '', avatar: '我', motto: '把人生重新拿回来。', wechatQr: '', gender: '', birthYear: '', birthplace: '', siblings: '', lifeStages: [] },
  people: {
    father: { id: 'father', name: '父亲', nickname: '父亲', avatar: '父', birthDate: '', birthplace: '', growthPlace: '', education: '', work: '', marriage: '', wealth: '', majorIllness: '', setbacks: '', lifeEvents: '', keyInteractions: '' },
    mother: { id: 'mother', name: '母亲', nickname: '母亲', avatar: '母', birthDate: '', birthplace: '', growthPlace: '', education: '', work: '', marriage: '', wealth: '', majorIllness: '', setbacks: '', lifeEvents: '', keyInteractions: '' }
  },
  materials: [], insights: [],
  innerRoles: [
    { id: 'innerFather', name: '内在父亲', avatar: '父', trait: '力量 · 边界 · 方向', basedOn: ['father'] },
    { id: 'innerMother', name: '内在母亲', avatar: '母', trait: '接纳 · 滋养 · 连接', basedOn: ['mother'] }
  ]
});
export const createMaterial = (personId: PersonId, section: string, text: string, source: Material['source']): Material => ({ id: id(), personId, section, text, source, createdAt: new Date().toISOString() });
