'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { collections, CollectionDef } from '@/lib/schemas';

export default function Home() {
  const router = useRouter();
  const [pending, setPending] = useState<CollectionDef | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          Ephemera Editor
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          게임 데이터를 MongoDB에 입력/관리하는 에디터
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {collections.map((col) =>
            col.comingSoon ? (
              <button
                key={col.name}
                onClick={() => setPending(col)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-md transition-all cursor-pointer opacity-60"
              >
                <span className="text-2xl">{col.emoji}</span>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 text-center leading-tight">
                  {col.label}
                </span>
              </button>
            ) : (
              <Link
                key={col.name}
                href={`/collections/${col.name}/data`}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-md transition-all cursor-pointer"
              >
                <span className="text-2xl">{col.emoji}</span>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 text-center leading-tight">
                  {col.label}
                </span>
              </Link>
            )
          )}
        </div>
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPending(null)}
        >
          <div
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-6 w-72 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{pending.emoji}</div>
              <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                {pending.label}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                준비 중입니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPending(null)}
                className="flex-1 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                확인
              </button>
              <button
                onClick={() => {
                  setPending(null);
                  router.push(`/collections/${pending.name}/data`);
                }}
                className="flex-1 py-2 rounded-lg bg-zinc-900 dark:bg-white text-sm font-medium text-white dark:text-zinc-900 hover:opacity-80 transition-opacity"
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
