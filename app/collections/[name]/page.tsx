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

  const [form, setForm] = useState<Doc>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const initForm = (autoCode?: string) => {
    if (!col) return {};
    const init: Doc = {};
    col.fields.forEach((f) => { init[f.key] = ''; });
    if (autoCode && col.codeField) {
      init[col.codeField] = autoCode;
    }
    return init;
  };

  const generateCode = async (): Promise<string | undefined> => {
    if (!col?.codeField || !col?.codePrefix) return undefined;
    try {
      const res = await fetch(`/api/collections/${name}`);
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      return `${col.codePrefix}${String(count + 1).padStart(3, '0')}`;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    if (!col) return;
    generateCode().then((code) => setForm(initForm(code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col]);

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
      } else {
        setStatus('error');
        setMessage(isEdit ? '수정 실패' : '저장 실패');
      }
    } catch {
      setStatus('error');
      setMessage('네트워크 오류');
    }
  };

  // 수정 취소 또는 저장 후 초기화
  const handleCancelEdit = () => {
    setEditingId(null);
    generateCode().then((code) => setForm(initForm(code)));
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
            href={`/collections/${name}/data`}
            className="text-sm px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
          >
            ← 목록
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {col.emoji} {col.label}
          </h1>
        </div>

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
