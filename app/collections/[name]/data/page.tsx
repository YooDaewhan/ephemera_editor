'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getCollection, FieldDef } from '@/lib/schemas';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

export default function CollectionDataPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const col = getCollection(name);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [editForm, setEditForm] = useState<Doc>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 컬럼 순서: 코드 → 이름 → 설명 → 나머지 tableColumns → pairedColumns
  const buildColumns = (): string[] => {
    if (!col) return [];
    const tableSet = [...col.tableColumns];
    const ordered: string[] = [];

    const codeCol = tableSet.find((c) => c.endsWith('_code') || c === 'code' || c === 'rank');
    if (codeCol) ordered.push(codeCol);

    if (col.fields.some((f) => f.key === 'name') && !ordered.includes('name')) {
      ordered.push('name');
    }

    if (col.fields.some((f) => f.key === 'description')) {
      ordered.push('description');
    }

    for (const c of tableSet) {
      if (!ordered.includes(c)) ordered.push(c);
    }

    return ordered;
  };

  const columns = buildColumns();

  // pairedColumns의 main 키 → { main, sub, label } 맵
  const pairedMap = new Map(
    (col?.pairedColumns ?? []).map((p) => [p.main, p])
  );

  const fetchDocs = () => {
    if (!col) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/collections/${name}`)
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, col]);

  // 수정 패널 열기
  const openEdit = (doc: Doc) => {
    setEditingDoc(doc);
    const init: Doc = {};
    col?.fields.forEach((f) => {
      const val = doc[f.key];
      if (val === null || val === undefined) {
        init[f.key] = '';
      } else if (f.type === 'json' && typeof val === 'object') {
        init[f.key] = JSON.stringify(val, null, 2);
      } else {
        init[f.key] = String(val);
      }
    });
    setEditForm(init);
  };

  const closeEdit = () => {
    setEditingDoc(null);
    setEditForm({});
  };

  // 수정 저장
  const handleSave = async () => {
    if (!col || !editingDoc?._id) return;
    setSaving(true);
    const payload: Doc = {};
    col.fields.forEach((f) => {
      const val = editForm[f.key];
      if (val === '' || val === undefined || val === null) {
        payload[f.key] = null;
      } else if (f.type === 'number') {
        payload[f.key] = Number(val);
      } else if (f.type === 'json') {
        try { payload[f.key] = JSON.parse(val); }
        catch { payload[f.key] = val; }
      } else {
        payload[f.key] = val;
      }
    });
    try {
      const res = await fetch(`/api/collections/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingDoc._id, ...payload }),
      });
      if (res.ok) {
        closeEdit();
        fetchDocs();
      }
    } finally {
      setSaving(false);
    }
  };

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/collections/${name}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setDocs((prev) => prev.filter((d) => d._id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  if (!col) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-500">컬렉션을 찾을 수 없습니다: {name}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-6">
      <div className="max-w-full mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/collections/${name}`}
            className="text-sm px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
          >
            ← 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {col.emoji} {col.label} — 전체 데이터
          </h1>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
          {loading ? (
            <p className="p-4 text-zinc-500">로딩중...</p>
          ) : docs.length === 0 ? (
            <p className="p-4 text-zinc-500">데이터가 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-700 text-left">
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
                    >
                      {col.fields.find((f) => f.key === c)?.label ?? c}
                    </th>
                  ))}
                  {(col.pairedColumns ?? []).map((p) => (
                    <th
                      key={`paired_${p.main}`}
                      className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
                    >
                      {p.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap text-right">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, i) => (
                  <tr
                    key={doc._id || i}
                    className="border-t border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  >
                    {columns.map((c) => (
                      <td
                        key={c}
                        className={`px-3 py-2 text-zinc-800 dark:text-zinc-200 ${
                          c === 'description' ? 'max-w-100 whitespace-pre-wrap wrap-break-word' : 'whitespace-nowrap max-w-50 truncate'
                        }`}
                        title={typeof doc[c] === 'object' ? JSON.stringify(doc[c]) : String(doc[c] ?? '')}
                      >
                        {typeof doc[c] === 'object' ? JSON.stringify(doc[c]) : String(doc[c] ?? '')}
                      </td>
                    ))}
                    {(col.pairedColumns ?? []).map((p) => {
                      const mainVal = String(doc[p.main] ?? '');
                      const subVal = String(doc[p.sub] ?? '');
                      const display = mainVal
                        ? subVal ? `${mainVal}(${subVal})` : mainVal
                        : '';
                      return (
                        <td
                          key={`paired_${p.main}`}
                          className="px-3 py-2 text-zinc-800 dark:text-zinc-200 whitespace-nowrap max-w-50 truncate"
                          title={display}
                        >
                          {display}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(doc)}
                          className="px-2.5 py-1 text-xs rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition cursor-pointer"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(doc._id)}
                          disabled={deletingId === doc._id}
                          className="px-2.5 py-1 text-xs rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/60 transition cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === doc._id ? '삭제중...' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-3 py-2 text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-700">
            총 {docs.length}건
          </div>
        </div>
      </div>

      {/* 수정 패널 (오버레이) */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex">
          {/* 백드롭 */}
          <div
            className="flex-1 bg-black/40"
            onClick={closeEdit}
          />
          {/* 패널 */}
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">✏️ 항목 수정</h2>
              <button
                onClick={closeEdit}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {col.fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    field={f}
                    value={editForm[f.key] ?? ''}
                    onChange={(v) => setEditForm((prev) => ({ ...prev, [f.key]: v }))}
                  />
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
              <button
                onClick={closeEdit}
                className="px-6 py-2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:bg-zinc-300 dark:hover:bg-zinc-600 transition cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 필드 입력 컴포넌트
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    'rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full';

  const isFullWidth = field.type === 'textarea' || field.type === 'json';

  return (
    <div className={`flex flex-col gap-1 ${isFullWidth ? 'sm:col-span-2' : ''}`}>
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {field.type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">선택...</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o || '(없음)'}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className={`${base} resize-none`}
        />
      ) : field.type === 'json' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${base} resize-none font-mono text-xs`}
        />
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      )}
    </div>
  );
}
