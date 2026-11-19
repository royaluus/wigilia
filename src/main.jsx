
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  Gift, Snowflake, Search, PenLine, ArrowLeft,
  LockKeyhole, ExternalLink, Plus, CheckCircle2,
  BookOpen, Sparkles, Star
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
    message.includes('nie znaleziono twojego listu') ||
    message.includes('list not found')
  );
}

function Snowfall() {
  return (
    <div className="snowLayer" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          className="snowflake"
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 8) * -1.7}s`,
            animationDuration: `${9 + (i % 7) * 2}s`,
            opacity: 0.3 + (i % 5) * 0.12,
            fontSize: `${8 + (i % 5) * 3}px`
          }}
        >
          ❄
        </span>
      ))}
    </div>
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

    try {
      const { data, error: err } = await supabase.rpc('get_my_letter', {
        p_name: who,
        p_device_id: deviceId()
      });

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

      setLetter(normalizeLetter(data));
      setPage('letter');
    } catch (err) {
      setError(err?.message || 'Wystąpił błąd podczas pobierania listu.');
    } finally {
      setLoading(false);
    }
  }

  async function findLetter(e) {
    e.preventDefault();

    if (loading) return;

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

    try {
      const { data, error: err } = await supabase.rpc(
        'claim_and_get_letter',
        {
          p_name: clean,
          p_device_id: deviceId()
        }
      );

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
    } catch (err) {
      setError(err?.message || 'Wystąpił błąd podczas wyszukiwania listu.');
    } finally {
      setLoading(false);
    }
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

    try {
      const { data, error: err } = await supabase.rpc(
        'get_my_own_letter',
        {
          p_name: savedName,
          p_edit_token: token
        }
      );

      if (err || !data) {
        if (isMissingLetter(err) || (!err && !data)) {
          localStorage.removeItem(OWN_KEY);

          const updatedTokens = getTokens();
          delete updatedTokens[savedName.toLocaleLowerCase('pl')];
          localStorage.setItem(EDIT_KEY, JSON.stringify(updatedTokens));

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
    } catch (err) {
      setError(err?.message || 'Wystąpił błąd podczas otwierania listu.');
    } finally {
      setLoading(false);
    }
  }

  async function saveLetter(e) {
    e.preventDefault();

    if (loading) return;

    if (!supabase) {
      setError('Brak połączenia z bazą danych.');
      return;
    }

    if (!formName.trim()) {
      setError('Wpisz swoje imię.');
      return;
    }

    if (!content.trim()) {
      setError('Napisz coś w swoim liście.');
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

    try {
      const result = isEdit
        ? await supabase.rpc('update_my_letter', {
            p_name: formName.trim(),
            p_edit_token: token,
            p_content: content,
            p_links: JSON.stringify(cleanLinks)
          })
        : await supabase.rpc('create_my_letter', {
            p_name: formName.trim(),
            p_content: content,
            p_links: JSON.stringify(cleanLinks),
            p_edit_token: token,
            p_device_id: deviceId()
          });

      const { data, error: err } = result;

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
          'Twój list został zapisany! Możesz go otwierać i edytować z tego urządzenia.'
        );
      } else {
        setNotice('Zmiany w Twoim liście zostały zapisane.');
      }

      setLetter(safeData);
      setPage('letter');
    } catch (err) {
      setError(err?.message || 'Wystąpił błąd podczas zapisywania listu.');
    } finally {
      setLoading(false);
    }
  }

  function editOwnLetter() {
    if (!letter || loading) return;

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
        <Snowfall />

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
      <Snowfall />

      <header className="brand">
        <div className="brandIcon"><Gift /></div>
        <span>Wigilia <b>2026</b></span>
        <span className="brandRight"><Sparkles size={19} /></span>
      </header>

      <section className="hero">
        <div className="heroDecor">✦</div>
        <div className="eyebrow">
          <Snowflake size={15} /> ŚWIĄTECZNA EDYCJA
        </div>
        <h1>Listy do<br /><em>Mikołaja</em></h1>
        <p>
          Święta zaczynają się od marzeń.
          Zapisz swoje pomysły na prezent i spraw, by Mikołaj miał łatwiejsze zadanie.
        </p>
        <div className="heroBottom">
          <span>✧</span>
          <span>MAGIA ŚWIĄT 2026</span>
          <span>✧</span>
        </div>
      </section>

      {error && <div className="alert">{error}</div>}

      {notice && (
        <div className="success">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}

      {page === 'home' && (
        <section className="homeSection">
          <div className="sectionHeading">
            <div>
              <span className="sectionEyebrow">TWOJA ŚWIĄTECZNA PRZESTRZEŃ</span>
              <h2>Witaj w świątecznej poczcie</h2>
              <p>Wybierz list, który chcesz otworzyć.</p>
            </div>
            <div className="headingStar"><Star size={25} /></div>
          </div>

          <div className="homeCards">
            {ownName ? (
              <article className="homeCard ownCard">
                <div className="cardIcon"><PenLine size={23} /></div>
                <span className="cardLabel">TWÓJ LIST</span>
                <h3>Twoje marzenia</h3>
                <p>Wróć do swojego listu, sprawdź go i w razie potrzeby edytuj.</p>
                <button
                  className="cardButton"
                  onClick={openOwnLetter}
                  disabled={loading}
                >
                  {loading ? 'Otwieranie…' : 'Otwórz mój list'}
                  <span>→</span>
                </button>
              </article>
            ) : (
              <article className="homeCard ownCard">
                <div className="cardIcon"><Gift size={23} /></div>
                <span className="cardLabel">ZACZNIJ OD SIEBIE</span>
                <h3>Napisz swój list</h3>
                <p>Podziel się pomysłami na prezenty i ułatw komuś przygotowanie niespodzianki.</p>
                <button className="cardButton" onClick={startCreate}>
                  Stwórz swój list
                  <span>→</span>
                </button>
              </article>
            )}

            {assigned ? (
              <article className="homeCard recipientCard">
                <div className="cardIcon"><BookOpen size={23} /></div>
                <span className="cardLabel">WYLOSOWANA OSOBA</span>
                <h3>List od {assigned}</h3>
                <p>Sprawdź pomysły prezentowe osoby, którą wylosowałeś.</p>
                <button
                  className="cardButton"
                  onClick={() => loadAssigned(assigned)}
                  disabled={loading}
                >
                  {loading ? 'Otwieranie…' : 'Otwórz list'}
                  <span>→</span>
                </button>
              </article>
            ) : (
              <article className="homeCard recipientCard">
                <div className="cardIcon"><Search size={23} /></div>
                <span className="cardLabel">TAJEMNICZY ADRESAT</span>
                <h3>Wylosowana osoba</h3>
                <p>Wpisz imię osoby, którą wylosowałeś, aby zobaczyć jej list.</p>

                <form onSubmit={findLetter} className="recipientForm">
                  <label>Imię z listy</label>
                  <div className="searchBox">
                    <Search size={18} />
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Np. Alicja"
                      required
                    />
                  </div>
                  <button className="cardButton" disabled={loading}>
                    {loading ? 'Chwilka…' : 'Otwórz list'}
                    <span>→</span>
                  </button>
                </form>
              </article>
            )}
          </div>

          <div className="homeNote">
            <LockKeyhole size={16} />
            <span>Każdy list ma swojego autora. Możesz edytować tylko swój własny list.</span>
          </div>

          <div className="festiveQuote">
            <span>✦</span>
            <p>Najpiękniejsze prezenty zaczynają się od dobrego pomysłu.</p>
            <span>✦</span>
          </div>
        </section>
      )}

      {page === 'letter' && letter && (
        <section className="panel letterPanel">
          <button className="back" onClick={goHome}>
            <ArrowLeft size={16} /> Strona główna
          </button>

          <div className="letterTop">
            <span className="tag">✦ LIST DO MIKOŁAJA ✦</span>
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
        <section className="panel editorPanel">
          <button className="back" onClick={goHome}>
            <ArrowLeft size={16} /> Wróć
          </button>

          <div className="editorHeading">
            <span className="sectionEyebrow">ŚWIĄTECZNA POCZTA</span>
            <h2>{isEdit ? 'Edytuj swój list' : 'Napisz list do Mikołaja'}</h2>
            <p className="muted">Niech Mikołaj dowie się, o czym marzysz.</p>
          </div>

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

      <footer className="siteFooter">
        <span>✦</span>
        <p>Niech te święta będą pełne niespodzianek</p>
        <span>✦</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
