'use client';

import Link from 'next/link';
import { collections } from '@/lib/schemas';

export default function Home() {
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
          {collections.map((col) => (
            <Link
              key={col.name}
              href={`/collections/${col.name}`}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-md transition-all cursor-pointer"
            >
              <span className="text-2xl">{col.emoji}</span>
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 text-center leading-tight">
                {col.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
