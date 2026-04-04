/**
 * alchemy-skill.tsx
 * 연금술 스킬트리 화면
 * 진입: village → 연금술 → 스킬트리 (route: /alchemy-skill)
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import {
  getAlchemySkillTree, AlchemySkillView,
  getAlchemyPoints, upgradeAlchemySkill,
} from '@/lib/alchemy-db';

const CAT_META: Record<string, { label: string; color: string; icon: string }> = {
  gem:     { label: '보석 가공', color: '#3498db', icon: '💎' },
  potion:  { label: '포션 제조', color: '#2ecc71', icon: '🧪' },
  enchant: { label: '마법부여', color: '#9b59b6', icon: '✨' },
};

export default function AlchemySkillScreen() {
  const router = useRouter();
  const { db, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<AlchemySkillView[]>([]);
  const [points, setPoints] = useState({ skill_points: 0, total_earned: 0 });
  const [openDepths, setOpenDepths] = useState<Record<number, boolean>>({ 1: true, 2: false, 3: false });
  const [selected, setSelected] = useState<AlchemySkillView | null>(null);

  const load = useCallback(async () => {
    if (!db || !user) return;
    setLoading(true);
    try {
      const [tree, pts] = await Promise.all([
        getAlchemySkillTree(db, user.uid),
        getAlchemyPoints(db, user.uid),
      ]);
      setSkills(tree);
      setPoints(pts);
    } finally {
      setLoading(false);
    }
  }, [db, user]);

  useEffect(() => { load(); }, [load]);

  const handleUpgrade = async (skillId: string) => {
    if (!db || !user) return;
    const result = await upgradeAlchemySkill(db, user.uid, skillId);
    Alert.alert(result.success ? '습득!' : '실패', result.message);
    if (result.success) {
      setSelected(null);
      load();
    }
  };

  const getDepth = (s: AlchemySkillView): number => {
    if (!s.parent_skill_id) return 1;
    const parent = skills.find(x => x.skill_id === s.parent_skill_id);
    if (!parent || !parent.parent_skill_id) return 2;
    return 3;
  };

  const isLocked = (s: AlchemySkillView) => {
    if (!s.parent_skill_id) return false;
    const parent = skills.find(x => x.skill_id === s.parent_skill_id);
    return !parent || parent.level < 1;
  };

  const toggleDepth = (d: number) => setOpenDepths(prev => ({ ...prev, [d]: !prev[d] }));

  const depth1 = skills.filter(s => getDepth(s) === 1);
  const depth2 = skills.filter(s => getDepth(s) === 2);
  const depth3 = skills.filter(s => getDepth(s) === 3);

  if (loading) {
    return <View style={st.center}><ActivityIndicator size="large" color="#2ecc71" /></View>;
  }

  return (
    <View style={st.root}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={st.backText}>← 돌아가기</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>🌳 연금술 스킬트리</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <View style={st.pointsBar}>
          <Text style={st.pointsLabel}>스킬 포인트</Text>
          <Text style={st.pointsValue}>{points.skill_points}p</Text>
          <Text style={st.pointsTotal}>(누적 {points.total_earned}p)</Text>
        </View>

        <DepthSection label="1단계" open={openDepths[1] ?? false} onToggle={() => toggleDepth(1)} skills={depth1} allSkills={skills} onSelect={setSelected} />
        <DepthSection label="2단계" open={openDepths[2] ?? false} onToggle={() => toggleDepth(2)} skills={depth2} allSkills={skills} onSelect={setSelected} />
        <DepthSection label="3단계" open={openDepths[3] ?? false} onToggle={() => toggleDepth(3)} skills={depth3} allSkills={skills} onSelect={setSelected} />
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        {selected && (
          <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
            <TouchableOpacity activeOpacity={1} style={[st.modal, { borderColor: (CAT_META[selected.category]?.color ?? '#888') + '88' }]}>
              <SkillDetailModal
                skill={selected}
                allSkills={skills}
                locked={isLocked(selected)}
                points={points.skill_points}
                onUpgrade={handleUpgrade}
                onClose={() => setSelected(null)}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </Modal>
    </View>
  );
}

function DepthSection({ label, open, onToggle, skills, allSkills, onSelect }: {
  label: string;
  open: boolean;
  onToggle: () => void;
  skills: AlchemySkillView[];
  allSkills: AlchemySkillView[];
  onSelect: (s: AlchemySkillView) => void;
}) {
  const isLocked = (s: AlchemySkillView) => {
    if (!s.parent_skill_id) return false;
    const parent = allSkills.find(x => x.skill_id === s.parent_skill_id);
    return !parent || parent.level < 1;
  };

  return (
    <View style={st.depthSection}>
      <TouchableOpacity style={st.depthHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={st.depthArrow}>{open ? '▼' : '▶'}</Text>
        <Text style={st.depthLabel}>{label}</Text>
        <Text style={st.depthCount}>{skills.length}개</Text>
      </TouchableOpacity>

      {open && (
        <View style={st.skillGrid}>
          {skills.map(s => {
            const locked = isLocked(s);
            const maxed = s.level >= s.max_level;
            const cat = CAT_META[s.category] ?? { label: s.category, color: '#888', icon: '⚙️' };
            return (
              <TouchableOpacity
                key={s.skill_id}
                style={[
                  st.skillCard,
                  { borderColor: locked ? '#333' : maxed ? cat.color : cat.color + '55' },
                  locked && { opacity: 0.45 },
                  maxed && { backgroundColor: cat.color + '15' },
                ]}
                activeOpacity={0.7}
                onPress={() => onSelect(s)}
              >
                <View style={[st.catBadge, { backgroundColor: cat.color + '33' }]}>
                  <Text style={[st.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
                </View>
                <Text style={st.skillIcon}>{s.icon}</Text>
                <Text style={st.skillName} numberOfLines={1}>{s.name}</Text>
                <View style={st.skillLvRow}>
                  <View style={st.skillLvBar}>
                    <View style={[st.skillLvFill, { width: `${(s.level / s.max_level) * 100}%`, backgroundColor: cat.color }]} />
                  </View>
                  <Text style={st.skillLvText}>{s.level}/{s.max_level}</Text>
                </View>
                {locked && <Text style={{ fontSize: 10, color: '#555' }}>🔒</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SkillDetailModal({ skill, allSkills, locked, points, onUpgrade, onClose }: {
  skill: AlchemySkillView;
  allSkills: AlchemySkillView[];
  locked: boolean;
  points: number;
  onUpgrade: (id: string) => void;
  onClose: () => void;
}) {
  const cat = CAT_META[skill.category] ?? { label: skill.category, color: '#888', icon: '⚙️' };
  const maxed = skill.level >= skill.max_level;
  const canBuy = !locked && !maxed && points >= skill.cost_per_level;
  const parentSkill = skill.parent_skill_id ? allSkills.find(x => x.skill_id === skill.parent_skill_id) : null;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Text style={{ fontSize: 36 }}>{skill.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{skill.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={[st.catBadge, { backgroundColor: cat.color + '33' }]}>
              <Text style={[st.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            <Text style={{ color: '#888', fontSize: 12 }}>Lv.{skill.level}/{skill.max_level}</Text>
          </View>
        </View>
      </View>

      <View style={st.mInfoBox}>
        <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 18 }}>{skill.description}</Text>
      </View>

      <View style={st.mInfoBox}>
        <Text style={{ color: '#aaa', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>스킬 레벨</Text>
        <View style={st.mLvBar}>
          <View style={[st.mLvFill, { width: `${(skill.level / skill.max_level) * 100}%`, backgroundColor: cat.color }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: '#888', fontSize: 11 }}>현재 효과: +{(skill.effect_value * skill.level).toFixed(1)}</Text>
          <Text style={{ color: '#888', fontSize: 11 }}>{skill.level}/{skill.max_level}</Text>
        </View>
        {!maxed && (
          <Text style={{ color: '#4ade80', fontSize: 11, marginTop: 2 }}>다음 레벨: +{(skill.effect_value * (skill.level + 1)).toFixed(1)}</Text>
        )}
      </View>

      <View style={st.mInfoBox}>
        <View style={st.mGrid}>
          <View style={st.mGridItem}>
            <Text style={st.mGridLabel}>레벨당 비용</Text>
            <Text style={st.mGridValue}>{skill.cost_per_level}p</Text>
          </View>
          <View style={st.mGridItem}>
            <Text style={st.mGridLabel}>보유 포인트</Text>
            <Text style={[st.mGridValue, { color: '#2ecc71' }]}>{points}p</Text>
          </View>
          <View style={st.mGridItem}>
            <Text style={st.mGridLabel}>선행 스킬</Text>
            <Text style={st.mGridValue}>{parentSkill ? parentSkill.name : '없음'}</Text>
          </View>
          <View style={st.mGridItem}>
            <Text style={st.mGridLabel}>효과 타입</Text>
            <Text style={st.mGridValue}>{skill.effect_type}</Text>
          </View>
        </View>
      </View>

      {locked ? (
        <View style={[st.actionBtn, { backgroundColor: '#222' }]}>
          <Text style={st.actionBtnText}>🔒 선행 스킬 필요: {parentSkill?.name}</Text>
        </View>
      ) : maxed ? (
        <View style={[st.actionBtn, { backgroundColor: cat.color + '44' }]}>
          <Text style={st.actionBtnText}>✅ MAX 달성</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[st.actionBtn, { backgroundColor: canBuy ? cat.color : '#333' }]}
          onPress={() => onUpgrade(skill.skill_id)}
          disabled={!canBuy}
        >
          <Text style={st.actionBtnText}>
            {canBuy ? `⬆️ 습득 (${skill.cost_per_level}p)` : `포인트 부족 (${skill.cost_per_level}p 필요)`}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#333', marginTop: 8 }]} onPress={onClose}>
        <Text style={st.actionBtnText}>닫기</Text>
      </TouchableOpacity>
    </View>
  );
}

const BG = '#0f0f1a';
const CARD = '#1a1a2e';
const ACCENT = '#2ecc71';

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingTop: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  backText: { fontSize: 15, fontWeight: '700', color: ACCENT },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

  pointsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 12 },
  pointsLabel: { fontSize: 13, fontWeight: '700', color: '#aaa' },
  pointsValue: { fontSize: 20, fontWeight: '900', color: ACCENT },
  pointsTotal: { fontSize: 11, color: '#666' },

  depthSection: { marginBottom: 12 },
  depthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#16162a', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  depthArrow: { fontSize: 12, color: '#888' },
  depthLabel: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1 },
  depthCount: { fontSize: 12, color: '#666' },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  skillCard: { width: '31%', backgroundColor: CARD, borderRadius: 10, borderWidth: 1, padding: 10, alignItems: 'center', gap: 4, minHeight: 110 },
  catBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  catBadgeText: { fontSize: 8, fontWeight: '700' },
  skillIcon: { fontSize: 22 },
  skillName: { fontSize: 10, fontWeight: '800', color: '#fff', textAlign: 'center' },
  skillLvRow: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%', marginTop: 2 },
  skillLvBar: { flex: 1, height: 3, backgroundColor: '#ffffff11', borderRadius: 2, overflow: 'hidden' },
  skillLvFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
  skillLvText: { fontSize: 8, color: '#888', fontFamily: 'monospace' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: CARD, borderRadius: 18, borderWidth: 2, padding: 22, width: '88%', maxWidth: 400 },
  mInfoBox: { backgroundColor: '#0f0f1a', borderRadius: 12, padding: 14, marginBottom: 12 },
  mLvBar: { height: 8, backgroundColor: '#ffffff11', borderRadius: 4, overflow: 'hidden' },
  mLvFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  mGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mGridItem: { width: '47%', marginBottom: 4 },
  mGridLabel: { fontSize: 10, color: '#888' },
  mGridValue: { fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 2 },
  actionBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
