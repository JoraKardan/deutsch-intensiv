# Deutsch Intensiv: instrucțiuni pentru Claude

Proiect personal: curs intensiv de germană (A1 → B1 în 16 săptămâni) pentru un vorbitor nativ de **română** (înțelege și rusă și engleză). Scopul principal este **înțelegerea vorbirii** și **conversația**, la muncă și în viața de zi cu zi în Germania. Momentan nu se pregătește pentru un examen.

- Comunică cu utilizatorul **în română**.
- Aplicația: React + TS + Vite, `npm run dev` (port 5180). Progresul e în localStorage.
- Conversațiile de vorbire au loc în aplicația Claude, în proiectul „Deutsch – Vorbire” (instrucțiuni + Knowledge din `claude-project/`); scenariul lecției se copiază din aplicație. O integrare ulterioară prin `claude -p` e posibilă (varianta „c”).

## Generarea lecțiilor noi

Când utilizatorul cere „generează săptămâna N”:

1. Citește `content/curriculum.json` (titlurile și focusul lecțiilor săptămânii N) și 1–2 lecții existente din `content/lessons/` ca model de format și nivel. Recitește și recapitularea săptămânii anterioare.
2. Creează câte un fișier `content/lessons/wNN-D.json` (ex. `w02-3.json`) pentru fiecare lecție. Tipul exact e în `src/lib/types.ts`.
3. Rulează `npm run check`, corectează erorile, apoi `npm run audio -- wNN-1 wNN-2 …` (rulează în fundal; Azure F0 ≈ 20 cereri/min → ~3–4 min/lecție).
4. Rulează `npm run claude-project` (actualizează `claude-project/`) și spune-i utilizatorului să reîncarce în proiectul Claude „Deutsch – Vorbire” fișierele `vocabular.md`, `gramatica.md` (și `personaje.md`, dacă apar personaje noi).
5. Audio e inclus în git (GitHub Pages nu poate genera audio). Commit + push pe `main` (doar dacă utilizatorul cere) → site-ul se actualizează automat: https://jorakardan.github.io/deutsch-intensiv/

### Reguli de conținut

- **Povestea** (urmează viața reală a elevului, vezi `claude-project/despre-mine.md`, local): în săptămâna 1, Radu (din Moldova) e la ultimul lui proiect IT, la o firmă din Köln (colegii Lena, Tom, Sophie, Herr Weber, Herr Krause, Frau Becker). **Din săptămâna 2**, Radu lasă IT-ul și se mută cu soția lui, **Valentina** („Valy”, cetățean român; lucrează și ea la Fördewurst, la ambalare (Verpackung), adesea în altă tură decât Radu. În săptămâna 1 s-a spus că a fost asistentă medicală: e meseria ei din Moldova, dar în Germania lucrează la fabrică), la **Flensburg**. Acolo lucrează în ture la fabrica de mezeluri **Fördewurst GmbH** (fictivă). Personajele din Flensburg: **Jens Petersen** (șeful de tură, localnic, laconic, zice „Moin”), **Kasia** (colegă din Polonia, tot nou-venită, vorbește o germană simplă), **Ole** (coleg tânăr, fan metal, merge la Wacken), **Frau Hansen** (HR la fabrică), **Frau Jensen** (vecina în vârstă). Colegii din Köln apar doar rar (un telefon cu Lena sau Tom). Se pot adăuga personaje noi. Temele: munca în ture, autoritățile (Anmeldung, Aufenthaltskarte pentru membrul de familie al unei cetățene UE), viața în nord, muzica rock/metal și festivalurile.
- **Voci** (`speakers[].voice`): voci neurale **Azure** (`de-DE-…Neural`), fiecare personaj are vocea lui, aceeași în toate lecțiile:
  - Radu = `de-DE-ConradNeural`; Tom = `de-DE-FlorianMultilingualNeural`; Lena = `de-DE-KatjaNeural`; Herr Weber = `de-DE-ChristophNeural`; Herr Krause = `de-DE-KillianNeural`; Sophie = `de-DE-LouisaNeural`; Frau Becker = `de-DE-TanjaNeural`.
  - Flensburg: Valentina = `de-DE-AmalaNeural`; Kasia = `de-DE-MajaNeural`; Frau Hansen = `de-DE-TanjaNeural`; Frau Jensen = `de-DE-GiselaNeural`; Jens = `de-DE-BerndNeural`; Ole = `de-DE-KasperNeural`.
  - Personaje secundare: voci libere (`RalfNeural`, `KlausNeural`, `ElkeNeural`, `KlarissaNeural`), diferite de ale celorlalți din același dialog.
  - Expresiile și exemplele folosesc automat `de-DE-SeraphinaMultilingualNeural`. Vocile macOS (ex. `Anna (Premium)`) încă merg în script, dar nu le mai folosi.
- **Explicațiile sunt în română**, cu diacritice. Traducerile sunt naturale, nu cuvânt cu cuvânt. Ghilimele germane în textul german: „…“; în română: „…”.
- În textele de conținut, `**bold**` evidențiază părțile importante (inclusiv în exemplele de gramatică; scriptul audio elimină `**`).
- **Numerele din replici se scriu în litere** („zweiunddreißig”, nu „32”), ca TTS-ul să le citească corect și elevul să le vadă scrise.
- Germana trebuie să fie **naturală și corectă**, potrivită nivelului: în A1 propoziții scurte; spre B1 se adaugă vorbire colocvială (particule modale, contracții).
- **Recapitularea** (lecția 8 a fiecărei săptămâni, `"kind": "review"`): dialog mai lung (16–20 de replici), ~8 expresii noi, 15–17 exerciții care acoperă toată săptămâna.
- Volum tipic pentru o lecție: dialog de 12–16 replici, 14–16 expresii, 13 exerciții (amestec: 3–4 de înțelegere cu `audio`, 4–5 cu goluri, 2 de ordonare, 2 dictări), `speaking` cu 4–5 sarcini și o replică de start (`starter`).
- Id-uri: replici `d1…`, expresii `p1…`, pronunție `x…`, exerciții `e1…`. Exemplele de gramatică primesc automat `g1…`. Dictarea trebuie să aibă `text` identic cu replica sau expresia referită (`check` verifică asta).
- Folosește `pronunciation` doar când lecția introduce sunete noi sau un set de vocabular care trebuie auzit (numere, zile etc.).
- Exercițiile cu goluri acceptă mai multe variante (`answers: [["heiße","heisse"]]` nu e necesar: ä/ß se normalizează automat la ae/ss).

## PWA / offline

- `public/manifest.webmanifest`, `public/icons/` (generate din `icon.svg`), `public/sw.js` (service worker scris de mână, fără plugin).
- `sw.js`: navigare = rețea-întâi; assets = cache; audio = cache `audio-vN` (+ răspunsuri 206 pentru Range, necesare pe Safari).
- Lista fișierelor audio pentru descărcarea offline e în `src/lib/offline.ts` (`lessonAudioIds`) – trebuie să rămână sincronă cu `tools/gen-audio.mjs`.
- Dacă se regenerează audio existent, crește numele cache-ului `audio-vN` în ambele locuri (sw.js și offline.ts).

## Comenzi

- `npm run dev`: aplicația
- `npm run check`: validarea lecțiilor
- `npm run audio [-- id …] [--force]`: generarea audio (Azure Speech, cheia în `.env` exclus din git; vocile macOS rămân ca alternativă). Varianta rară 🐢 se face în browser (playbackRate).
- `npm run claude-project`: generează `claude-project/` (instrucțiunile și Knowledge pentru proiectul din aplicația Claude). Sursa instrucțiunilor: `tools/claude-project-instructions.md`.
- `npm run build`: verificare TypeScript + build
