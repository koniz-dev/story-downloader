import { useState, FormEvent } from 'react';
import { detectPlatform } from '../lib/platform';

interface Props {
  loading: boolean;
  onSubmit: (url: string) => void;
}

export function UrlForm({ loading, onSubmit }: Props) {
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);

  const platform = url ? detectPlatform(url) : null;
  const showInvalid = touched && url.length > 0 && platform === null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!platform || loading) return;
    onSubmit(url.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-2">URL story</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.instagram.com/stories/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !platform}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed px-6 py-3 font-semibold transition"
        >
          {loading ? 'Đang xử lý…' : 'Tải story'}
        </button>
      </div>
      {showInvalid && (
        <p className="mt-2 text-sm text-amber-400">
          URL không phải Instagram hoặc Facebook. Hãy dán URL từ thanh địa chỉ trình duyệt khi đang xem story.
        </p>
      )}
    </form>
  );
}
