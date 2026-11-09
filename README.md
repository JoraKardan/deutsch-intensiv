# 🇩🇪 Deutsch Intensiv

Curs intensiv de germană, de la zero la nivel de conversație (A1 → B1), în **16 săptămâni**. Accentul e pe **înțelegerea vorbirii** și pe **vorbit**. Este o aplicație web locală, cu lecții, audio, exerciții, repetiție la intervale (fișe) și scenarii de conversație cu Claude.

## Pornire

```bash
npm install        # o singură dată
npm run audio      # generează audio pentru lecțiile noi (sare peste ce există deja)
npm run dev        # pornește aplicația → http://localhost:5180
```

Audio se generează cu vocile germane din macOS. Pentru calitate maximă, descarcă vocile *Premium/Enhanced* (Anna, Petra, Markus) din System Settings → Accessibility → Read & Speak → ⓘ lângă System voice.

## Structura cursului

| Faza | Săptămâni | Rezultat |
|---|---|---|
| **A1 – Fundația** | 1–5 | Te prezinți, cumperi, te orientezi, te descurci la autorități și la medic, povestești simplu la trecut |
| **A2 – Viața de zi cu zi** | 6–10 | Locuința, munca, banii, viața socială, opinii, călătorii |
| **B1 – Conversație** | 11–16 | Interviu de angajare, ședințe, discuții argumentate, povestiri, germana vorbită „reală” |

Fiecare săptămână are **7 lecții + 1 recapitulare**. Fiecare lecție are aceleași secțiuni:

1. **Start**: obiectivele lecției
2. **Pronunție**: doar în unele lecții
3. **Dialog**: asculți întâi fără text, apoi cu text, apoi cu traducere; fiecare replică se poate asculta și rar (🐢)
4. **Expresii**: cele 8–16 expresii de reținut
5. **Gramatică**: explicată scurt, în română, cu tabele și exemple audio
6. **Exerciții**: întrebări de înțelegere, dictare, ordonarea cuvintelor, completarea golurilor
7. **Shadowing**: repeți după audio, te înregistrezi și verifici pronunția cu recunoașterea vocală
8. **Vorbire**: copiezi scenariul și îl joci cu Claude (aplicația de pe telefon, în mod vocal)
9. **Final**: expresiile intră automat în repetiția zilnică, în ambele direcții

## Rutina zilnică (3–4 ore)

| Bloc | Timp |
|---|---|
| Repetiția fișelor | 20–30 min |
| 1–2 lecții noi | 75–90 min |
| Shadowing | 20–30 min |
| Ascultare externă (Nicos Weg, Easy German…) | 45–60 min |
| Vorbire cu Claude | 20–30 min |

Luni–sâmbătă: lecții noi. Duminică: doar repetiție, ascultare și conversație.

## Pe telefon

Aplicația e publicată pe GitHub Pages: **https://jorakardan.github.io/deutsch-intensiv/**

**Instalare ca aplicație:** pe Android, în Chrome: meniul ⋮ → *Instalează aplicația* (sau butonul din pagina **Progres**). Pe iPhone, în Safari: Share → *Add to Home Screen*.

**Offline:** aplicația se salvează automat pe dispozitiv. Pentru audio fără internet: **Progres → Descarcă audio pentru offline** (repetă după ce apar lecții noi). Progresul de pe telefon e separat de cel de pe laptop (fiecare browser își ține propriul progres); se poate muta cu exportul/importul din pagina **Progres**.

Publicarea e automată: la fiecare `git push` pe `main`, GitHub Actions construiește și actualizează site-ul (~1 min).

## Lecții noi

Lecțiile se generează pe săptămâni, pe măsură ce avansezi. În Claude Code, în acest folder, cere:

> generează lecțiile pentru săptămâna 2

Apoi rulează `npm run check` (verifică lecțiile), `npm run audio` (generează audio), iar după commit și `git push` lecțiile apar și pe telefon.

## Progresul

Se salvează automat în browser (localStorage). Din pagina **Progres** poți descărca o copie de siguranță sau o poți încărca înapoi. Fă o copie săptămânal.

## Structura proiectului

```
content/
  curriculum.json        # programa completă: 16 săptămâni × 8 lecții
  lessons/wXX-N.json     # lecțiile (una per fișier)
public/audio/            # audio generat cu npm run audio (inclus în git, pentru GitHub Pages)
src/                     # aplicația (React + TypeScript + Vite)
tools/
  gen-audio.mjs          # generare audio cu `say` + `afconvert` (macOS)
  check-content.mjs      # validarea lecțiilor
```
