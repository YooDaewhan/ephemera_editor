'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getCollection } from '@/lib/schemas';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

export default function CollectionDataPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const col = getCollection(name);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  // 컬럼 순서: 코드 → 이름 → 설명 → 나머지 tableColumns
  const buildColumns = (): string[] => {
    if (!col) return [];
    const tableSet = [...col.tableColumns];
    const ordered: string[] = [];

    // 코드 필드 (tableColumns 중 _code로 끝나거나 첫 번째)
    const codeCol = tableSet.find((c) => c.endsWith('_code') || c === 'code' || c === 'rank');
    if (codeCol) ordered.push(codeCol);

    // 이름 필드
    if (col.fields.some((f) => f.key === 'name') && !ordered.includes('name')) {
      ordered.push('name');
    }

    // 설명 필드 (tableColumns에 없어도 추가)
    if (col.fields.some((f) => f.key === 'description')) {
      ordered.push('description');
    }

    // 나머지 tableColumns
    for (const c of tableSet) {
      if (!ordered.includes(c)) ordered.push(c);
    }

    return ordered;
  };

  const columns = buildColumns();

  useEffect(() => {
    if (!col) { setLoading(false); return; }
    fetch(`/api/collections/${name}`)
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [name, col]);

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
                        className={`px-3 py-2 text-zinc-800 dark:text-zinc-200 truncate ${
                          c === 'description' ? 'max-w-[320px]' : 'whitespace-nowrap max-w-[200px]'
                        }`}
                        title={typeof doc[c] === 'object' ? JSON.stringify(doc[c]) : String(doc[c] ?? '')}
                      >
                        {typeof doc[c] === 'object' ? JSON.stringify(doc[c]) : String(doc[c] ?? '')}
                      </td>
                    ))}
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
    </div>
  );
}
