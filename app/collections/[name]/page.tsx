'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { getCollection, FieldDef } from '@/lib/schemas';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

export default function CollectionPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const col = getCollection(name);
  const formRef = useRef<HTMLDivElement>(null);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [form, setForm] = useState<Doc>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);

  const initForm = () => {
    if (!col) return {};
    const init: Doc = {};
    col.fields.forEach((f) => { init[f.key] = ''; });
    return init;
  };

  useEffect(() => {
    if (col) setForm(initForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col]);

  // 데이터 조회
  const fetchDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/collections/${name}`);
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      setDocs([]);
    }
    setLoadingDocs(false);
  };

  const handleToggleTable = () => {
    if (!showTable) fetchDocs();
    setShowTable(!showTable);
  };

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 폼 데이터 → payload 변환
  const buildPayload = () => {
    if (!col) return {};
    const payload: Doc = {};
    col.fields.forEach((f) => {
      const val = form[f.key];
      if (val === '' || val === undefined || val === null) {
        payload[f.key] = null;
        return;
      }
      if (f.type === 'number') {
        payload[f.key] = Number(val);
      } else if (f.type === 'json') {
        try { payload[f.key] = JSON.parse(val); }
        catch { payload[f.key] = val; }
      } else {
        payload[f.key] = val;
      }
    });
    return payload;
  };

  // 저장 (신규 or 수정)
  const handleSubmit = async () => {
    if (!col) return;
    setStatus('loading');
    setMessage('');

    const payload = buildPayload();
    const isEdit = !!editingId;

    try {
      const res = await fetch(`/api/collections/${name}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingId, ...payload } : payload),
      });
      if (res.ok) {
        setStatus('success');
        setMessage(isEdit ? '수정 완료! ✅' : '저장 완료! ✅');
        handleCancelEdit();
        if (showTable) fetchDocs();
      } else {
        setStatus('error');
        setMessage(isEdit ? '수정 실패' : '저장 실패');
      }
    } catch {
      setStatus('error');
      setMessage('네트워크 오류');
    }
  };

  // 수정 모드 진입: doc의 데이터를 폼에 로드
  const handleEdit = (doc: Doc) => {
    if (!col) return;
    const loaded: Doc = {};
    col.fields.forEach((f) => {
      const val = doc[f.key];
      if (val === null || val === undefined) {
        loaded[f.key] = '';
      } else if (typeof val === 'object') {
        loaded[f.key] = JSON.stringify(val, null, 2);
      } else {
        loaded[f.key] = String(val);
      }
    });
    setForm(loaded);
    setEditingId(doc._id);
    setMessage('');
    setStatus('idle');
    // 폼으로 스크롤
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initForm());
  };

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/collections/${name}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      // 수정 중이던 항목이 삭제되면 편집 취소
      if (editingId === id) handleCancelEdit();
      fetchDocs();
    } catch {
      alert('삭제 실패');
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
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="text-sm px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
          >
            ← 메인
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {col.emoji} {col.label}
          </h1>
        </div>

        {/* 전체 보기 버튼 */}
        <button
          onClick={handleToggleTable}
          className="mb-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition cursor-pointer"
        >
          {showTable ? '📋 테이블 닫기' : '📋 전체 데이터 보기'}
        </button>

        {/* 테이블 영역 */}
        {showTable && (
          <div className="mb-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            {loadingDocs ? (
              <p className="p-4 text-zinc-500">로딩중...</p>
            ) : docs.length === 0 ? (
              <p className="p-4 text-zinc-500">데이터가 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-700 text-left">
                    {col.tableColumns.map((c) => (
                      <th key={c} className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => {
                    const isEditing = editingId === doc._id;
                    return (
                      <tr
                        key={doc._id || i}
                        className={`border-t border-zinc-100 dark:border-zinc-700 ${
                          isEditing
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                        }`}
                      >
                        {col.tableColumns.map((c) => (
                          <td key={c} className="px-3 py-2 text-zinc-800 dark:text-zinc-200 whitespace-nowrap max-w-[200px] truncate">
                            {typeof doc[c] === 'object' ? JSON.stringify(doc[c]) : String(doc[c] ?? '')}
                          </td>
                        ))}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(doc)}
                              className={`text-xs font-medium cursor-pointer ${
                                isEditing
                                  ? 'text-blue-400'
                                  : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                              }`}
                            >
                              {isEditing ? '수정중...' : '수정'}
                            </button>
                            <button
                              onClick={() => handleDelete(doc._id)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="px-3 py-2 text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-700">
              총 {docs.length}건
            </div>
          </div>
        )}

        {/* 입력/수정 폼 */}
        <div
          ref={formRef}
          className={`rounded-2xl border p-6 ${
            editingId
              ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700'
              : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {editingId ? '✏️ 항목 수정' : '➕ 새 항목 추가'}
            </h2>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-sm px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition cursor-pointer"
              >
                취소
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {col.fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={form[f.key] || ''}
                onChange={(v) => handleChange(f.key, v)}
              />
            ))}
          </div>

          {message && (
            <p className={`mt-4 text-sm font-medium ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={status === 'loading'}
              className={`px-8 py-2.5 rounded-full font-semibold text-sm transition disabled:opacity-50 cursor-pointer ${
                editingId
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-80'
              }`}
            >
              {status === 'loading'
                ? (editingId ? '수정 중...' : '저장 중...')
                : (editingId ? '수정하기' : '저장하기')
              }
            </button>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="px-6 py-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:bg-zinc-300 dark:hover:bg-zinc-600 transition cursor-pointer"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>
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
