import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
  ScrollView, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import {
  getForgeSkillTree, ForgeSkillView,
  getForgePoints, upgradeForgeSkill,
  migrateForgeSkills, seedForgeSkillTree, seedUserForgePoints,
} from '@/lib/forge-db';

const CATEGORY_INFO: Record<string, { label: string; color: string; icon: string }> = {
  weapon:  { label: '무기', color: '#e74c3c', icon: '⚔️' },
  armor:   { label: '방어구', color: '#3498db', icon: '🛡️' },
  enhance: { label: '강화', color: '#f39c12', icon: '⬆️' },
  repair:  { label: '수리', color: '#27ae60', icon: '🔧' },
};

const BOX_W = 100;
const BOX_H = 90;
const GAP_X = 16;
const GAP_Y = 32;

interface LayoutNode { skill: ForgeSkillView; x: number; y: number; }
interface LayoutEdge { x1: number; y1: number; x2: number; y2: number; }

function layoutTree(skills: ForgeSkillView[], category: string) {
  const cat = skills.filter(s => s.category === category);
  const getChildren = (pid: string) => cat.filter(s => s.parent_skill_id === pid);
  const roots = cat.filter(s => !s.parent_skill_id);
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  let col = 0;

  function place(skill: ForgeSkillView, depth: number): { cx: number } {
    const children = getChildren(skill.skill_id);
    if (children.length === 0) {
      const x = col * (BOX_W + GAP_X);
      const y = depth * (BOX_H + GAP_Y);
      col++;
      nodes.push({ skill, x, y });
      return { cx: x + BOX_W / 2 };
    }
    const childCxs = children.map(c => place(c, depth + 1).cx);
    const myCx = (Math.min(...childCxs) + Math.max(...childCxs)) / 2;
    const x = myCx - BOX_W / 2;
    const y = depth * (BOX_H + GAP_Y);
    nodes.push({ skill, x, y });
    children.forEach(c => {
      const cn = nodes.find(n => n.skill.skill_id === c.skill_id);
      if (cn) edges.push({ x1: myCx, y1: y + BOX_H, x2: cn.x + BOX_W / 2, y2: cn.y });
    });
    return { cx: myCx };
  }

  roots.forEach(r => place(r, 0));
  const totalW = nodes.length > 0 ? Math.max(...nodes.map(n => n.x + BOX_W)) + GAP_X : 300;
  const totalH = nodes.length > 0 ? Math.max(...nodes.map(n => n.y + BOX_H)) + GAP_Y : 200;
  return { nodes, edges, totalW, totalH };
}

export default function ForgeSkillScreen() {
  const router = useRouter();
  const { user, db, dbReady } = useAuth();

  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<ForgeSkillView[]>([]);
  const [points, setPoints] = useState({ skill_points: 0, total_earned: 0 });
  const [activeCat, setActiveCat] = useState('weapon');
  const [modalSkill, setModalSkill] = useState<ForgeSkillView | null>(null);

  const load = useCallback(async () => {
    if (!user || !db || !dbReady) return;
    setLoading(true);
    try {
      await migrateForgeSkills(db);
      await seedForgeSkillTree(db);
      await seedUserForgePoints(db, user.uid);
      const [skillTree, pts] = await Promise.all([
        getForgeSkillTree(db, user.uid),
        getForgePoints(db, user.uid),
      ]);
      setSkills(skillTree);
      setPoints(pts);
    } finally {
      setLoading(false);
    }
  }, [user, db, dbReady]);

  useEffect(() => { load(); }, [load]);

  const handleUpgrade = async (skillId: string) => {
    if (!user || !db) return;
    const result = await upgradeForgeSkill(db, user.uid, skillId);
    if (result.success) await load();
    Alert.alert(result.success ? '✨ 스킬 습득!' : '⚠️', result.message);
    setModalSkill(null);
  };

  if (loading) {
    return (
      <View style={st.root}>
        <ActivityIndicator size="large" color="#e67e22" style={{ marginTop: 100 }} />
      </View>
    );
  }

  const catInfo = CATEGORY_INFO[activeCat];
  const { nodes, edges, totalW, totalH } = layoutTree(skills, activeCat);
  const PAD = 16;

  return (
    <View style={st.root}>
      {/* 헤더 */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={st.backText}>← 돌아가기</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>🌳 스킬트리</Text>
      </View>

      {/* SP 바 */}
      <View style={st.spBar}>
        <Text style={st.spLabel}>🔶 스킬 포인트</Text>
        <Text style={st.spValue}>{points.skill_points}</Text>
        <Text style={st.spTotal}>(누적 {points.total_earned})</Text>
      </View>

      {/* 카테고리 탭 */}
      <View style={st.catRow}>
        {Object.entries(CATEGORY_INFO).map(([key, info]) => (
          <TouchableOpacity key={key}
            style={[st.catBtn, activeCat === key && { borderColor: info.color, backgroundColor: info.color + '22' }]}
            onPress={() => setActiveCat(key)}>
            <Text style={[st.catBtnText, activeCat === key && { color: info.color }]}>
              {info.icon} {info.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 트리 캔버스 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ minWidth: totalW + PAD * 2 }}>
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width: totalW + PAD * 2, height: totalH + PAD * 2 }}>
          {edges.map((e, i) => {
            const midY = (e.y1 + e.y2) / 2;
            return (
              <View key={`e${i}`}>
                <View style={{ position: 'absolute', left: e.x1 + PAD - 1, top: e.y1 + PAD, width: 2, height: midY - e.y1, backgroundColor: catInfo.color + '44' }} />
                <View style={{ position: 'absolute', left: Math.min(e.x1, e.x2) + PAD, top: midY + PAD - 1, width: Math.abs(e.x2 - e.x1) + 2, height: 2, backgroundColor: catInfo.color + '44' }} />
                <View style={{ position: 'absolute', left: e.x2 + PAD - 1, top: midY + PAD, width: 2, height: e.y2 - midY, backgroundColor: catInfo.color + '44' }} />
              </View>
            );
          })}
          {nodes.map(n => {
            const sk = n.skill;
            const maxed = sk.level >= sk.max_level;
            const unlocked = !sk.parent_skill_id || (skills.find(s => s.skill_id === sk.parent_skill_id)?.level ?? 0) >= 1;
            const pct = sk.level / sk.max_level;
            return (
              <TouchableOpacity key={sk.skill_id} activeOpacity={0.7} onPress={() => setModalSkill(sk)}
                style={[st.treeBox, {
                  position: 'absolute', left: n.x + PAD, top: n.y + PAD,
                  width: BOX_W, height: BOX_H,
                  borderColor: maxed ? '#4ade80' : unlocked ? catInfo.color + '88' : '#333',
                  opacity: unlocked ? 1 : 0.4,
                }]}>
                <View style={[st.treeBoxFill, { height: `${pct * 100}%`, backgroundColor: catInfo.color + '18' }]} />
                <Text style={st.treeBoxIcon}>{sk.icon}</Text>
                <Text style={st.treeBoxName} numberOfLines={2}>{sk.name}</Text>
                <Text style={[st.treeBoxLv, { color: maxed ? '#4ade80' : sk.level > 0 ? catInfo.color : '#555' }]}>
                  {sk.level}/{sk.max_level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ScrollView>

      {/* 스킬 상세 모달 */}
      <Modal visible={!!modalSkill} transparent animationType="fade" onRequestClose={() => setModalSkill(null)}>
        {modalSkill && (
          <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={() => setModalSkill(null)}>
            <TouchableOpacity activeOpacity={1} style={[st.modal, { borderColor: CATEGORY_INFO[modalSkill.category]?.color ?? '#666' }]}>
              <SkillModal
                skill={modalSkill}
                allSkills={skills}
                points={points.skill_points}
                onUpgrade={handleUpgrade}
                onClose={() => setModalSkill(null)}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </Modal>
    </View>
  );
}

function SkillModal({ skill, allSkills, points, onUpgrade, onClose }: {
  skill: ForgeSkillView;
  allSkills: ForgeSkillView[];
  points: number;
  onUpgrade: (id: string) => void;
  onClose: () => void;
}) {
  const cc = CATEGORY_INFO[skill.category]?.color ?? '#666';
  const isMaxed = skill.level >= skill.max_level;
  const parentUnlocked = !skill.parent_skill_id || (allSkills.find(s => s.skill_id === skill.parent_skill_id)?.level ?? 0) >= 1;
  const canUpgrade = !isMaxed && parentUnlocked && points >= skill.cost_per_level;
  const totalEffect = skill.effect_value * skill.level;
  const parentName = skill.parent_skill_id
    ? allSkills.find(s => s.skill_id === skill.parent_skill_id)?.name ?? ''
    : null;

  return (
    <View>
      <View style={st.mHeader}>
        <Text style={st.mIcon}>{skill.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={st.mName}>{skill.name}</Text>
          <Text style={[st.mCat, { color: cc }]}>
            {CATEGORY_INFO[skill.category]?.icon} {CATEGORY_INFO[skill.category]?.label} 계열
          </Text>
        </View>
        {isMaxed && (
          <View style={[st.mMaxBadge, { backgroundColor: '#4ade80' }]}>
            <Text style={st.mMaxText}>MAX</Text>
          </View>
        )}
      </View>

      <View style={st.mInfoBox}>
        <Text style={st.mDesc}>{skill.description}</Text>
        <View style={st.mGrid}>
          <View style={st.mGridItem}>
            <Text style={st.mGridLabel}>레벨</Text>
            <Text style={[st.mGridValue, { color: cc }]}>{skill.level}/{skill.max_level}</Text>
          </View>
          <View style={st.mGridItem}>
            <Text style={st.mGridLabel}>비용</Text>
            <Text style={[st.mGridValue, { color: '#f0c040' }]}>{skill.cost_per_level} SP</Text>
          </View>
          <View style={st.mGridItem}>
            <Text style={st.mGridLabel}>효과</Text>
            <Text style={[st.mGridValue, { color: '#4ade80' }]}>{skill.effect_type}</Text>
          </View>
          <View style={st.mGridItem}>
            <Text style={st.mGridLabel}>현재</Text>
            <Text style={[st.mGridValue, { color: '#fff' }]}>+{totalEffect}</Text>
          </View>
        </View>
      </View>

      <View style={st.mLvBarWrap}>
        <View style={st.mLvBar}>
          <View style={[st.mLvFill, {
            width: `${(skill.level / skill.max_level) * 100}%`,
            backgroundColor: isMaxed ? '#4ade80' : cc,
          }]} />
        </View>
      </View>

      {parentName && <Text style={st.mParent}>선행 스킬: {parentName}</Text>}

      <TouchableOpacity
        style={[st.mUpgradeBtn, { backgroundColor: canUpgrade ? cc : '#333' }]}
        disabled={!canUpgrade}
        onPress={() => onUpgrade(skill.skill_id)}
      >
        <Text style={st.mUpgradeText}>
          {isMaxed ? '최대 레벨 도달' :
           !parentUnlocked ? '🔒 선행 스킬 필요' :
           points < skill.cost_per_level ? `포인트 부족 (${points}/${skill.cost_per_level})` :
           `⬆️ 습득 (${skill.cost_per_level} SP)`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={st.mCloseBtn} onPress={onClose}>
        <Text style={st.mCloseText}>닫기</Text>
      </TouchableOpacity>
    </View>
  );
}

const BG = '#0f0f1a';
const CARD = '#1a1a2e';
const ACCENT = '#e67e22';

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingTop: 60 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  backText: { fontSize: 15, fontWeight: '700', color: ACCENT },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

  spBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: CARD, borderRadius: 10, padding: 12,
  },
  spLabel: { fontSize: 13, fontWeight: '700', color: '#f0c040' },
  spValue: { fontSize: 22, fontWeight: '900', color: '#fff' },
  spTotal: { fontSize: 11, color: '#555' },

  catRow: { flexDirection: 'row', marginHorizontal: 16, gap: 6, marginBottom: 10 },
  catBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 2,
    borderColor: 'transparent', backgroundColor: CARD, alignItems: 'center',
  },
  catBtnText: { fontSize: 11, fontWeight: '700', color: '#888' },

  treeBox: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  treeBoxFill: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  treeBoxIcon: { fontSize: 22, zIndex: 1 },
  treeBoxName: { fontSize: 10, fontWeight: '700', color: '#ddd', textAlign: 'center', paddingHorizontal: 4, zIndex: 1, lineHeight: 14, marginTop: 2 },
  treeBoxLv: { fontSize: 12, fontWeight: '800', fontFamily: 'monospace', zIndex: 1, marginTop: 2 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: CARD, borderRadius: 18, borderWidth: 2, padding: 22, width: '88%', maxWidth: 400 },

  mHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  mIcon: { fontSize: 40 },
  mName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  mCat: { fontSize: 12, marginTop: 2 },
  mMaxBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  mMaxText: { fontSize: 11, fontWeight: '900', color: '#fff' },

  mInfoBox: { backgroundColor: '#0f0f1a', borderRadius: 12, padding: 14, marginBottom: 12 },
  mDesc: { color: '#ccc', fontSize: 13, marginBottom: 10, lineHeight: 18 },
  mGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mGridItem: { width: '47%', marginBottom: 4 },
  mGridLabel: { fontSize: 10, color: '#888' },
  mGridValue: { fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 2 },

  mLvBarWrap: { marginBottom: 10 },
  mLvBar: { height: 8, backgroundColor: '#ffffff11', borderRadius: 4, overflow: 'hidden' },
  mLvFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  mParent: { fontSize: 11, color: '#888', marginBottom: 12 },

  mUpgradeBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  mUpgradeText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  mCloseBtn: { backgroundColor: '#333', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  mCloseText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
