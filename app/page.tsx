'use client'

import { useState } from 'react'

export default function Home() {
  const [form, setForm] = useState({ title: '', content: '', author: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage('저장되었습니다! ✅')
        setForm({ title: '', content: '', author: '' })
      } else {
        setStatus('error')
        setMessage(data.error || '오류가 발생했습니다.')
      }
    } catch {
      setStatus('error')
      setMessage('네트워크 오류가 발생했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-800 rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          새 글 작성
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 제목 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="제목을 입력하세요"
              required
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 transition"
            />
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="내용을 입력하세요"
              required
              rows={5}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 transition resize-none"
            />
          </div>

          {/* 작성자 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              작성자
            </label>
            <input
              type="text"
              name="author"
              value={form.author}
              onChange={handleChange}
              placeholder="작성자 (선택)"
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 transition"
            />
          </div>

          {/* 상태 메시지 */}
          {message && (
            <p
              className={`text-sm font-medium ${
                status === 'success' ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {message}
            </p>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-1 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold py-3 text-sm hover:opacity-80 transition disabled:opacity-50 cursor-pointer"
          >
            {status === 'loading' ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
