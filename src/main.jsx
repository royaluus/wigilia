
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  Gift, Snowflake, Search, PenLine, ArrowLeft,
  LockKeyhole, ExternalLink, Plus, CheckCircle2, BookOpen
} from 'lucide-react';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = url && anon && !url.includes('TWOJ-PROJEKT')
  ? createClient(url, anon)
  : null;

const DEVICE_KEY = 'wigilia_device_id';
const ASSIGN_KEY = 'wigilia_assigned_name';
const EDIT_KEY = 'wigilia_edit_tokens';
const OWN_KEY = 'wigilia_own_letter_name';

function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }

  return id;
}

function getTokens() {
  try {
    return JSON.parse(localStorage.getItem(EDIT_KEY) || '{}');
  } catch {
    return {};
  }
}

function normalizeLinks(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeLetter(data) {
  if (!data) return null;

  return {
    ...data,
    links: normalizeLinks(data.links)
  };
}

function isMissingLetter(error) {
  const message = (error?.message || '').toLocaleLowerCase('pl');

  return (
    message.includes('nie znaleziono listu') ||
    message.includes('list not found')
  );
}

function App() {
  const [page, setPage] = useState('home');
  const [name, setName] = useState('');

  const [assigned, setAssigned] = useState(
    localStorage.getItem(ASSIGN_KEY) || ''
  );

  const [ownName, setOwnName] = useState(
    localStorage.getItem(OWN_KEY) || ''
  );

  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [formName, setFormName] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState(['']);
  const [editToken, setEditToken] = useState('');
  const [isEdit, setIsEdit] = useState(false);

  const configured = !!supabase;

  useEffect(() => {
    const savedName = localStorage.getItem(ASSIGN_KEY);

    if (savedName) {
      loadAssigned(savedName);
    }
  }, []);

  async function loadAssigned(who) {
    if (!supabase || loading) return;

    setLoading(true);
    setError('');
    setNotice('');

    const { data, error: err } = await supabase.rpc('get_my_letter', {
      p_name: who,
      p_device_id: deviceId()
    });

    setLoading(false);

    if (err || !data) {
      if (isMissingLetter(err) || (!err && !data)) {
        localStorage.removeItem(ASSIGN_KEY);
        setAssigned('');
        setLetter(null);
        setPage('home');
        setError('');
        return;
      }

      setError(err?.message || 'Nie udało się pobrać listu.');
      return;
    }

    const safeData = normalizeLetter(data);

    setLetter(safeData);
    setPage('letter');
  }

  async function findLetter(e) {
    e.preventDefault();

    if (assigned) {
      await loadAssigned(assigned);
      return;
    }

    const clean = name.trim();
    if (!clean) return;

    if (!supabase) {
      setError('Brak połączenia z bazą danych.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    const { data, error: err } = await supabase.rpc(
      'claim_and_get_letter',
      {
        p_name: clean,
        p_device_id: deviceId()
      }
    );

    setLoading(false);

    if (err || !data) {
      setError(
        err?.message ||
        'Nie znaleziono listu albo jest już przypisany do innej osoby.'
      );
      return;
    }

    const safeData = normalizeLetter(data);

    localStorage.setItem(ASSIGN_KEY, safeData.name);
    setAssigned(safeData.name);
    setLetter(safeData);
    setPage('letter');
  }

  function startCreate() {
    setFormName('');
    setContent('');
    setLinks(['']);
    setIsEdit(false);
    setEditToken('');
    setError('');
    setNotice('');
    setPage('editor');
  }

  async function openOwnLetter() {
    if (!supabase || loading) return;

    const savedName = localStorage.getItem(OWN_KEY);
    const tokens = getTokens();

    const token = savedName
      ? tokens[savedName.toLocaleLowerCase('pl')]
      : null;

    if (!savedName || !token) {
      localStorage.removeItem(OWN_KEY);
      setOwnName('');
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    const { data, error: err } = await supabase.rpc(
      'get_my_own_letter',
      {
        p_name: savedName,
        p_edit_token: token
      }
    );

    setLoading(false);

    if (err || !data) {
      if (isMissingLetter(err) || (!err && !data)) {
        localStorage.removeItem(OWN_KEY);
        setOwnName('');
        setLetter(null);
        setPage('home');
        setError('');
        return;
      }

      setError(err?.message || 'Nie udało się otworzyć Twojego listu.');
      return;
    }

    setLetter(normalizeLetter(data));
    setPage('letter');
  }

  async function saveLetter(e) {
    e.preventDefault();

    if (!supabase) {
      setError('Brak połączenia z bazą danych.');
      return;
    }

    if (!formName.trim()) {
      setError('Wpisz swoje imię.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    const cleanLinks = links
      .map(x => x.trim())
      .filter(Boolean);

    const token = isEdit
      ? editToken
      : crypto.randomUUID() + crypto.randomUUID();

    const { data, error: err } = isEdit
      ? await supabase.rpc('update_my_letter', {
          p_name: formName.trim(),
          p_edit_token: token,
          p_content: content,
          p_links: cleanLinks
        })
      : await supabase.rpc('create_my_letter', {
          p_name: formName.trim(),
          p_content: content,
          p_links: cleanLinks,
          p_edit_token: token,
          p_device_id: deviceId()
        });

    setLoading(false);

    if (err || !data) {
      setError(err?.message || 'Nie udało się zapisać listu.');
      return;
    }

    const safeData = normalizeLetter(data);

    if (!isEdit) {
      const tokens = getTokens();
      const key = formName.trim().toLocaleLowerCase('pl');

      tokens[key] = token;

      localStorage.setItem(EDIT_KEY, JSON.stringify(tokens));
      localStorage.setItem(OWN_KEY, safeData.name);

      setOwnName(safeData.name);

      setNotice(
        'Twój list został zapisany! Możesz go otwierać i edytować w dowolnym momencie z tego urządzenia.'
      );
    } else {
      setNotice('Zmiany w Twoim liście zostały zapisane.');
    }

    setLetter(safeData);
    setPage('letter');
  }

  function editOwnLetter() {
    if (!letter) return;

    const token = getTokens()[
      letter.name.toLocaleLowerCase('pl')
    ];

    if (!token) {
      setError(
        'Nie znaleziono kodu edycji na tym urządzeniu. List może edytować tylko autor z urządzenia, na którym go utworzył.'
      );
      return;
    }

    setFormName(letter.name);
    setContent(letter.content || '');

    const savedLinks = normalizeLinks(letter.links);

    setLinks(savedLinks.length ? savedLinks : ['']);
    setEditToken(token);
    setIsEdit(true);
    setPage('editor');
    setError('');
    setNotice('');
  }

  function goHome() {
    setPage('home');
    setNotice('');
    setError('');
    setName('');
  }

  if (!configured) {
    return (
      <main className="shell">
        <header className="brand">
          <div className="brandIcon"><Gift /></div>
          <span>Wigilia <b>2026</b></span>
        </header>

        <section className="hero">
          <div className="eyebrow">
            <Snowflake size={15} /> ŚWIĄTECZNA EDYCJA
          </div>
          <h1>Listy do<br /><em>Mikołaja</em></h1>
          <p>Jedno miejsce na wszystkie świąteczne marzenia.</p>
        </section>

        <section className="panel">
          <h2>Strona wymaga podłączenia bazy danych</h2>
          <p>
            Projekt jest gotowy, ale przed publikacją trzeba skonfigurować
            bezpłatny projekt Supabase i wkleić jego dane do pliku .env.
          </p>
          <p>
            Instrukcja znajduje się w pliku <b>INSTRUKCJA.md</b>
            w pobranym pakiecie.
          </p>
        </section>

        <footer>✨ Niech te święta będą pełne niespodzianek</footer>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="brand">
        <div className="brandIcon"><Gift /></div>
        <span>Wigilia <b>2026</b></span>
        <span className="brandRight"><Snowflake size={18} /></span>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <Snowflake size={15} /> ŚWIĄTECZNA EDYCJA
        </div>
        <h1>Listy do<br /><em>Mikołaja</em></h1>
        <p>
          Podziel się pomysłami na prezent.
          Niech Mikołaj ma ułatwione zadanie!
        </p>
      </section>

      {error && <div className="alert">{error}</div>}

      {notice && (
        <div className="success">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}

      {page === 'home' && (
        <section className="panel">
          <h2>Twoje listy</h2>
          <p className="muted">
            Możesz niezależnie otwierać swój list i list osoby, którą wylosowałeś.
          </p>

          {ownName && (
            <button
              className="primary"
              onClick={openOwnLetter}
              disabled={loading}
            >
              <PenLine size={17} />
              {loading ? 'Otwieranie…' : 'Otwórz i edytuj mój list'}
              <span>→</span>
            </button>
          )}

          {assigned && (
            <button
              className="secondary"
              onClick={() => loadAssigned(assigned)}
              disabled={loading}
            >
              <BookOpen size={17} />
              {loading
                ? 'Otwieranie…'
                : `Sprawdź list osoby: ${assigned}`}
              <span>→</span>
            </button>
          )}

          {!assigned && (
            <>
              <div className="rule"><span>list wylosowanej osoby</span></div>

              <p className="muted">
                Wpisz imię osoby, którą wylosowałeś.
              </p>

              <form onSubmit={findLetter}>
                <label>Imię z listy</label>

                <div className="searchBox">
                  <Search size={19} />
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Np. Alicja"
                    required
                  />
                </div>

                <button className="primary" disabled={loading}>
                  {loading ? 'Chwilka…' : 'Otwórz list'}
                  <span>→</span>
                </button>
              </form>
            </>
          )}

          {!ownName && (
            <>
              <div className="rule"><span>albo</span></div>

              <button className="secondary" onClick={startCreate}>
                <PenLine size={17} /> Stwórz swój list
              </button>
            </>
          )}
        </section>
      )}

      {page === 'letter' && letter && (
        <section className="panel">
          <button className="back" onClick={goHome}>
            <ArrowLeft size={16} /> Strona główna
          </button>

          <div className="letterTop">
            <span className="tag">LIST DO MIKOŁAJA</span>
            <h2>
              Drogi Mikołaju,<br />
              <em>to ja, {letter.name}!</em>
            </h2>
          </div>

          <p className="letterContent">{letter.content}</p>

          {letter.links.length > 0 && (
            <div className="wishLinks">
              <h3>Pomysły na prezenty</h3>

              {letter.links.map((link, i) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pomysł {i + 1} <ExternalLink size={15} />
                </a>
              ))}
            </div>
          )}

          <div className="letterFoot">🎄 Wesołych Świąt!</div>

          {getTokens()[letter.name.toLocaleLowerCase('pl')] && (
            <button className="secondary" onClick={editOwnLetter}>
              <PenLine size={17} /> Edytuj swój list
            </button>
          )}
        </section>
      )}

      {page === 'editor' && (
        <section className="panel">
          <button className="back" onClick={goHome}>
            <ArrowLeft size={16} /> Wróć
          </button>

          <h2>
            {isEdit ? 'Edytuj swój list' : 'Napisz list do Mikołaja'}
          </h2>

          <form onSubmit={saveLetter}>
            <label>Twoje imię</label>

            <input
              className="textInput"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required
              disabled={isEdit}
              maxLength={40}
              placeholder="Jak masz na imię?"
            />

            <label>Co chciał(a)byś dostać?</label>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              maxLength={3000}
              rows={6}
              placeholder="Może konkretna rzecz, kolor, rozmiar albo kilka wskazówek…"
            />

            <label>Linki do inspiracji (opcjonalnie)</label>

            {links.map((link, i) => (
              <div className="linkInput" key={i}>
                <input
                  className="textInput"
                  value={link}
                  onChange={e =>
                    setLinks(old =>
                      old.map((v, j) => i === j ? e.target.value : v)
                    )
                  }
                  placeholder="https://…"
                />

                {links.length > 1 && (
                  <button
                    type="button"
                    className="remove"
                    onClick={() =>
                      setLinks(old => old.filter((_, j) => j !== i))
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="addLink"
              onClick={() => setLinks(old => [...old, ''])}
            >
              <Plus size={15} /> Dodaj kolejny link
            </button>

            <button className="primary" disabled={loading}>
              {loading ? 'Zapisywanie…' : 'Zapisz list'}
              <span>→</span>
            </button>
          </form>

          <p className="muted small">
            <LockKeyhole size={13} />
            Autor może edytować list tylko z urządzenia,
            na którym go utworzył.
          </p>
        </section>
      )}

      <footer>✨ Niech te święta będą pełne niespodzianek</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
