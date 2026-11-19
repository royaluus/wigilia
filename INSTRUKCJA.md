# Listy do Mikołaja — uruchomienie

Projekt jest gotowy do uruchomienia i publikacji. Do wspólnego działania przez internet potrzebuje darmowej bazy Supabase oraz hostingu (np. Vercel).

## 1. Utwórz bazę Supabase
1. Wejdź na https://supabase.com i utwórz darmowy projekt.
2. Otwórz **SQL Editor → New query**.
3. Skopiuj całą zawartość pliku `supabase.sql`, wklej i kliknij **Run**.
4. Wejdź w **Project Settings → API** i skopiuj:
   - Project URL
   - anon / publishable key

## 2. Uruchom lokalnie (opcjonalnie)
1. Zainstaluj Node.js LTS: https://nodejs.org
2. W folderze projektu uruchom terminal i wpisz `npm install`.
3. Skopiuj `.env.example` jako `.env` i wklej adres oraz klucz Supabase.
4. Uruchom `npm run dev` i otwórz adres pokazany w terminalu.

## 3. Opublikuj bez kupowania domeny
1. Wgraj folder projektu do prywatnego repozytorium GitHub.
2. Wejdź na https://vercel.com, zaloguj się przez GitHub i wybierz **Add New → Project**.
3. Zaimportuj repozytorium.
4. W **Environment Variables** dodaj:
   - `VITE_SUPABASE_URL` — Project URL z Supabase
   - `VITE_SUPABASE_ANON_KEY` — anon/publishable key z Supabase
5. Kliknij **Deploy**. Vercel nada stronie darmowy adres `nazwa-projektu.vercel.app`.

## Ważne ograniczenia modelu „wpisz samo imię”
- Jedno imię może być przypisane tylko do jednego urządzenia/przeglądarki. Pierwsza osoba, która je wpisze, zajmuje list.
- Przypisanie jest przechowywane w localStorage i w bazie. Wyczyszczenie danych przeglądarki lub zmiana urządzenia może utrudnić odzyskanie dostępu.
- To nie potwierdza, że osoba wpisująca imię jest faktycznie osobą, która wylosowała danego uczestnika. Przy samym imieniu nie da się tego wiarygodnie zweryfikować.
- Autor może edytować list tylko z przeglądarki, na której go utworzył; kod edycji jest zapisany lokalnie. Warto nie czyścić danych tej przeglądarki.
- Nazwy uczestników powinny być unikalne. Jeśli macie dwie osoby o tym samym imieniu, dodajcie np. inicjał lub ksywkę.

## Bezpieczeństwo
Klucz `anon`/publishable jest przeznaczony do użycia w przeglądarce. Nie wklejaj do aplikacji klucza `service_role`. Baza blokuje bezpośredni odczyt tabel; listy są udostępniane przez funkcje sprawdzające przypisanie urządzenia.
