import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiMessageCircle, FiRotateCcw, FiSend, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { cx, ProductImage } from '../../shared/ui';
import { formatPrice } from '../../shared/utils/format';
import { aiApi } from '../api';

const STORAGE_KEY = 'shop.chat';
const GREETING = {
  role: 'bot',
  text: 'Xin chào! Mình là trợ lý mua sắm AI 👋 Bạn đang tìm sản phẩm gì hôm nay?',
  products: [],
};
const SUGGESTIONS = ['Laptop dưới 15 triệu', 'Điện thoại pin trâu', 'Sách bán chạy', 'Đơn hàng của tôi'];

function loadHistory() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : [GREETING];
  } catch {
    return [GREETING];
  }
}

/** Renders the bot's [label](/path) markdown links as router links. */
function RichText({ text }) {
  const parts = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <Link key={match.index} to={match[2]} className="font-medium text-brand-600 underline underline-offset-2">
        {match[1]}
      </Link>
    );
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className="whitespace-pre-line">{parts}</span>;
}

function Message({ message }) {
  const isBot = message.role === 'bot';
  return (
    <div className={cx('flex flex-col gap-2', isBot ? 'items-start' : 'items-end')}>
      <div
        className={cx(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isBot ? 'rounded-tl-md bg-slate-100 text-slate-800' : 'rounded-tr-md bg-brand-600 text-white',
          message.error && 'bg-rose-50 text-rose-700'
        )}
      >
        <RichText text={message.text} />
      </div>
      {message.products?.length > 0 && (
        <div className="flex w-full gap-2 overflow-x-auto pb-1 scrollbar-none">
          {message.products.map((p) => (
            <Link
              key={p.id}
              to={`/products/${p.id}`}
              className="w-36 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 transition hover:shadow-md"
            >
              <div className="h-24 bg-slate-100">
                <ProductImage src={p.image} name={p.name} id={p.id} />
              </div>
              <div className="p-2">
                <p className="line-clamp-2 text-xs font-medium text-slate-800">{p.name}</p>
                <p className="mt-1 text-xs font-semibold text-brand-700">{formatPrice(p.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  }, [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, sending]);

  const toggle = () => {
    setOpen((o) => {
      if (!o) {
        setUnread(0);
        if (user) aiApi.track(user.id, null, 'open_chatbot');
      }
      return !o;
    });
  };

  const send = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || sending) return;
      setInput('');
      setMessages((m) => [...m, { role: 'user', text: content }]);
      setSending(true);
      try {
        const res = await aiApi.chat(user?.id, content);
        setMessages((m) => [...m, { role: 'bot', text: res.reply || '…', products: res.products || [] }]);
      } catch {
        setMessages((m) => [...m, { role: 'bot', text: 'Xin lỗi, mình đang gặp sự cố kết nối. Bạn thử lại sau nhé.', error: true }]);
      } finally {
        setSending(false);
        setUnread((u) => (open ? u : u + 1));
      }
    },
    [user, sending, open]
  );

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Trợ lý mua sắm AI"
          className="fixed bottom-24 right-4 z-50 flex h-[min(36rem,calc(100vh-8rem))] w-[calc(100vw-2rem)] max-w-sm animate-slide-up flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:right-6"
        >
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">🤖</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Trợ lý mua sắm AI</p>
              <p className="flex items-center gap-1.5 text-xs text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Đang hoạt động
              </p>
            </div>
            <button onClick={() => setMessages([GREETING])} className="rounded-lg p-2 hover:bg-white/15" aria-label="Cuộc trò chuyện mới">
              <FiRotateCcw className="h-4 w-4" />
            </button>
            <button onClick={toggle} className="rounded-lg p-2 hover:bg-white/15" aria-label="Đóng">
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {messages.map((m, i) => (
              <Message key={i} message={m} />
            ))}
            {sending && (
              <div className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-tl-md bg-slate-100 px-3 py-3">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-100 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi về sản phẩm, giá, đơn hàng…"
              maxLength={500}
              className="h-10 flex-1 rounded-xl border-0 bg-slate-100 px-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
              aria-label="Gửi"
            >
              <FiSend className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={toggle}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:scale-105 hover:bg-brand-700 sm:right-6"
        aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
      >
        {open ? <FiX className="h-6 w-6" /> : <FiMessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
