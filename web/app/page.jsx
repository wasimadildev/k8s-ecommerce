'use client';

import { useEffect, useMemo, useState } from 'react';

const emojis = { 1: '⌨️', 2: '🖱️', 3: '🔌', 4: '🖥️' };

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [auth, setAuth] = useState(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [registering, setRegistering] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const token = typeof window === 'undefined' ? null : localStorage.getItem('kindcart_token');
  const items = useMemo(() => Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId: Number(productId), quantity })), [cart]);
  const total = items.reduce((sum, item) =>
    sum + (products.find((product) => product.id === item.productId)?.price_cents || 0) * item.quantity, 0);

  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('kindcart_token')
          ? { Authorization: `Bearer ${localStorage.getItem('kindcart_token')}` }
          : {}),
        ...options.headers,
      },
    });
    const result = response.status === 204 ? null : await response.json();
    if (!response.ok) throw Error(result?.error || 'Request failed');
    return result;
  }

  async function reload() {
    try {
      const result = await request('/api/products', { cache: 'no-store' });
      setProducts(result);
      if (token) {
        const savedCart = await request('/api/cart');
        setCart(Object.fromEntries(savedCart.items.map((item) => [item.productId, item.quantity])));
      }
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    reload();
    if (token) request('/api/auth/me').then((result) => setAuth(result.user)).catch(() => localStorage.removeItem('kindcart_token'));
  }, []);

  function add(id) {
    setCart((old) => ({ ...old, [id]: (old[id] || 0) + 1 }));
  }

  async function authenticate(event) {
    event.preventDefault();
    setStatus('');
    try {
      const result = await request(`/api/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(authForm),
      });
      localStorage.setItem('kindcart_token', result.accessToken);
      setAuth(result.user);
      setAuthForm({ name: '', email: '', password: '' });
      setStatus(`Welcome, ${result.user.name}`);
      await reload();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function checkout(event) {
    event.preventDefault();
    if (!auth) return setStatus('Sign in before placing an order');
    setLoading(true);
    try {
      const result = await request('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ customerName: auth.name, items }),
      });
      await request('/api/cart', { method: 'PUT', body: JSON.stringify({ items: [] }) });
      setCart({});
      setStatus(`Order #${result.id} placed! Total $${(result.total_cents / 100).toFixed(2)}`);
      await reload();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
          <nav className="flex items-center justify-between">
            <a href="/" className="text-xl font-black tracking-tight text-ink">Kind<span className="text-teal-600">Cart</span></a>
            <span className="hidden text-xs font-bold uppercase tracking-[0.2em] text-slate-400 sm:block">Secure commerce platform</span>
            {auth && <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">{auth.name}</span>}
          </nav>
        </div>
      </header>

      <section className="bg-ink">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-teal-100">Thoughtful essentials</p>
          <h1 className="max-w-2xl text-4xl font-black tracking-tight text-white sm:text-6xl">Better gear for your everyday setup.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Quality technology, reliable delivery, and a checkout experience built for confidence.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {!auth && <section className="mb-10 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-ink">{registering ? 'Create your account' : 'Welcome back'}</h2>
            <p className="mt-1 text-sm text-slate-500">{registering ? 'Save your cart and checkout faster.' : 'Sign in to access your saved cart.'}</p>
          </div>
          <form className="space-y-3" onSubmit={authenticate}>
            {registering && <input className="field" aria-label="Full name" placeholder="Full name" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} required maxLength={100} />}
            <input className="field" type="email" aria-label="Email address" placeholder="Email address" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required />
            <input className="field" type="password" aria-label="Password" placeholder="Password (12+ characters)" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} required minLength={12} />
            <button className="primary-button w-full" type="submit">{registering ? 'Create account' : 'Sign in'}</button>
          </form>
          <button className="mt-4 text-sm font-semibold text-teal-700 hover:text-teal-600" onClick={() => setRegistering(!registering)}>{registering ? 'Already have an account?' : 'Create an account'}</button>
        </section>}

        {auth && <div className="mb-8 flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <span>Signed in as <strong>{auth.name}</strong></span>
          <button className="font-semibold underline underline-offset-4" onClick={() => { localStorage.removeItem('kindcart_token'); setAuth(null); setCart({}); }}>Sign out</button>
        </div>}

        <section className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-semibold text-teal-600">The collection</p><h2 className="mt-1 text-3xl font-black tracking-tight text-ink">Featured products</h2></div><span className="text-sm text-slate-500">{products.length} products</span></div>
            <div className="grid gap-5 sm:grid-cols-2">
              {products.map((product) => <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-teal-200" key={product.id}>
                <div className="flex h-44 items-center justify-center rounded-xl bg-slate-50 text-7xl transition group-hover:bg-teal-50">{emojis[product.id]}</div>
                <div className="mt-5 flex items-start justify-between gap-3"><div><h3 className="font-bold text-ink">{product.name}</h3><p className="mt-1 text-sm text-slate-500">{product.stock} available</p></div><p className="text-lg font-black text-ink">${(product.price_cents / 100).toFixed(2)}</p></div>
                <button className="primary-button mt-5 w-full" onClick={() => add(product.id)} disabled={product.stock === 0 || (cart[product.id] || 0) >= product.stock}>{product.stock === 0 ? 'Out of stock' : 'Add to cart'}</button>
              </article>)}
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4"><h2 className="text-xl font-bold text-ink">Your cart</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{items.reduce((sum, item) => sum + item.quantity, 0)} items</span></div>
            {items.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Your cart is waiting for something good.</p> : <div className="divide-y divide-slate-100">{items.map((item) => <div className="flex items-center justify-between gap-3 py-4" key={item.productId}><div><p className="text-sm font-semibold text-ink">{products.find((product) => product.id === item.productId)?.name}</p><p className="mt-1 text-sm text-slate-500">Qty {item.quantity}</p></div><button className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-500 hover:border-teal-500 hover:text-teal-600" aria-label="Remove one item" onClick={() => setCart((current) => ({ ...current, [item.productId]: Math.max(0, current[item.productId] - 1) }))}>−</button></div>)}</div>}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-4"><span className="font-semibold text-slate-600">Total</span><span className="text-2xl font-black text-ink">${(total / 100).toFixed(2)}</span></div>
            <button className="primary-button mt-5 w-full" onClick={checkout} disabled={loading || items.length === 0}>{loading ? 'Placing order...' : auth ? 'Place order' : 'Sign in to checkout'}</button>
            {status && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600" role="status">{status}</p>}
          </aside>
        </section>
      </div>
    </main>
  );
}
