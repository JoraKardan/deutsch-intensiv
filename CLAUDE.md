# Deutsch Intensiv: instrucțiuni pentru Claude

Proiect personal: curs intensiv de germană (A1 → B1 în 16 săptămâni) pentru un vorbitor nativ de **română** (înțelege și rusă și engleză). Scopul principal este **înțelegerea vorbirii** și **conversația**, la muncă și în viața de zi cu zi în Germania. Momentan nu se pregătește pentru un examen.

- Comunică cu utilizatorul **în română**.
- Aplicația: React + TS + Vite, `npm run dev` (port 5180). Progresul e în localStorage.
- Conversațiile de vorbire au loc în aplicația Claude (scenariul se copiază). O integrare ulterioară prin `claude -p` e posibilă (varianta „c”).

## Generarea lecțiilor noi

Când utilizatorul cere „generează săptămâna N”:

1. Citește `content/curriculum.json` (titlurile și focusul lecțiilor săptămânii N) și 1–2 lecții existente din `content/lessons/` ca model de format și nivel. Recitește și recapitularea săptămânii anterioare.
2. Creează câte un fișier `content/lessons/wNN-D.json` (ex. `w02-3.json`) pentru fiecare lecție. Tipul exact e în `src/lib/types.ts`.
3. Rulează `npm run check`, corectează erorile, apoi `npm run audio -- wNN-1 wNN-2 …` (rulează în fundal, ~30 s/lecție).
4. Audio e inclus în git (GitHub Pages nu poate genera audio). Commit + push pe `main` (doar dacă utilizatorul cere) → site-ul se actualizează automat: https://jorakardan.github.io/deutsch-intensiv/

### Reguli de conținut

- **Personajele continuă povestea**: Andrei (din Moldova, programator, nou la o firmă din Köln; soția lui e asistentă medicală și își caută de lucru), Lena (colegă, din Viena, locuiește în Bonn), Tom (coleg, din Hamburg), Sophie (marketing, din Leipzig, 28 de ani), Herr Weber (șeful), Herr Krause (contabil), Frau Becker (HR). Se pot adăuga personaje noi.
- **Voci** (`speakers[].voice`): `Markus (Enhanced)` = Andrei; `Petra (Premium)` și `Anna (Premium)` = femei; `Reed (German (Germany))` sau `Flo (German (Germany))` = alți bărbați. Expresiile și exemplele folosesc automat `Anna (Premium)`.
- **Explicațiile sunt în română**, cu diacritice. Traducerile sunt naturale, nu cuvânt cu cuvânt. Ghilimele germane în textul german: „…“; în română: „…”.
- În textele de conținut, `**bold**` evidențiază părțile importante (inclusiv în exemplele de gramatică; scriptul audio elimină `**`).
- **Numerele din replici se scriu în litere** („zweiunddreißig”, nu „32”), ca TTS-ul să le citească corect și elevul să le vadă scrise.
- Germana trebuie să fie **naturală și corectă**, potrivită nivelului: în A1 propoziții scurte; spre B1 se adaugă vorbire colocvială (particule modale, contracții).
- **Recapitularea** (lecția 8 a fiecărei săptămâni, `"kind": "review"`): dialog mai lung (16–20 de replici), ~8 expresii noi, 15–17 exerciții care acoperă toată săptămâna.
- Volum tipic pentru o lecție: dialog de 12–16 replici, 14–16 expresii, 13 exerciții (amestec: 3–4 de înțelegere cu `audio`, 4–5 cu goluri, 2 de ordonare, 2 dictări), `speaking` cu 4–5 sarcini și o replică de start (`starter`).
- Id-uri: replici `d1…`, expresii `p1…`, pronunție `x…`, exerciții `e1…`. Exemplele de gramatică primesc automat `g1…`. Dictarea trebuie să aibă `text` identic cu replica sau expresia referită (`check` verifică asta).
- Folosește `pronunciation` doar când lecția introduce sunete noi sau un set de vocabular care trebuie auzit (numere, zile etc.).
- Exercițiile cu goluri acceptă mai multe variante (`answers: [["heiße","heisse"]]` nu e necesar: ä/ß se normalizează automat la ae/ss).

## Comenzi

- `npm run dev`: aplicația
- `npm run check`: validarea lecțiilor
- `npm run audio [-- id …] [--force]`: generarea audio (macOS). Varianta rară 🐢 se face în browser (playbackRate), vocile Premium ignoră `say -r`.
- `npm run build`: verificare TypeScript + build
