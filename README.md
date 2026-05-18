# Santix

Santix este o aplicație web pentru explorarea anatomiei umane în 3D, realizată ca instrument educațional și orientativ. Utilizatorul poate selecta structuri anatomice dintr-un model 3D și poate primi explicații în limba română, inclusiv un triaj orientativ pentru durere bazat pe un sistem AI propriu.

Aplicația nu oferă diagnostic medical. Răspunsurile legate de simptome includ recomandări generale și trimiteri către specialist acolo unde este cazul.

## Funcționalități

- Vizualizare 3D interactivă a scheletului, sistemului muscular și organelor interne
- Selectarea unei structuri și afișarea detaliilor anatomice (denumire română + denumire științifică, funcție, origine, inserție, inervație)
- Triaj local orientativ pentru durere, cu întrebări structurate și detecție automată a semnelor de urgență (red flags)
- Conversație AI care folosește contextul structurii selectate și informațiile din baza de date Santix
- Sistem RAG (Retrieval-Augmented Generation) cu căutare hibridă semantic + keyword
- Autentificare cu email sau Google, istoric al conversațiilor persistent per utilizator
- Quiz de anatomie cu întrebări mixte (alegere multiplă + identificare)
- Interfață complet în limba română, temă vizuală light/dark

## Tehnologii

| Tehnologie | Rol în proiect |
|---|---|
| React 19 + TypeScript | Interfața aplicației și componentele principale |
| TanStack Start / Router | Structura aplicației, rutare și server functions |
| Vite | Build tool și dev server |
| Three.js + @react-three/fiber + @react-three/drei | Vizualizare 3D și interacțiunea cu modelele anatomice |
| Tailwind CSS + Radix UI | Stilizare și componente UI accesibile |
| Supabase + PostgreSQL | Autentificare, baza de date, RLS, migrații |
| pgvector | Embeddings pentru semantic search în baza de cunoștințe |
| Ollama | Rulare locală a modelelor AI în testare și dezvoltare |
| Playwright + TypeScript | Teste E2E pentru scenariile principale ale aplicației |

## Arhitectura AI

Sistemul AI din Santix funcționează printr-un pipeline determinist în mai mulți pași:

1. **Normalizare** — textul utilizatorului este curățat și pregătit pentru analiză
2. **Extragere semnale** — detectarea durerii, tipului de traumă, severității, duratei, semnelor asociate
3. **Clasificare** — mesajul este încadrat într-o categorie (anatomie, durere, red flag, în afara scopului)
4. **Rutare** — se decide ce întrebare sau răspuns urmează, bazat pe starea conversației
5. **Retrieval** — se caută contextul relevant din baza de cunoștințe (hibrid: semantic + keyword)
6. **Răspuns** — se generează un răspuns structurat, contextual față de structura anatomică selectată

Abordarea deterministică reduce riscul de halucinații și permite un control precis al tonului medical.

## Baza de date

Schema include tabele pentru structuri anatomice (cu aliasuri pentru căutare și legături la modelul 3D), baza de cunoștințe segmentată pe țesuturi, conversații și mesaje utilizator cu stare persistentă, și rate limiting per utilizator. Modificările de schemă sunt versionare prin 27 de migrații SQL păstrate în `supabase/migrations/`.

Pentru funcționalitatea AI locală este necesar [Ollama](https://ollama.ai) cu modelul `llama3.2:3b`.

## Structura proiectului

```
src/
├── routes/          # Paginile aplicației (explorator, quiz, glosar)
├── components/      # Componente UI (skeleton 3D, auth, layout)
├── lib/
│   ├── ai/          # Pipeline AI (classifier, retrieval, provider, state)
│   └── security/    # Validare input, rate limiting, headers HTTP
├── data/            # Baze de cunoștințe statice (oase, organe, triaj)
└── integrations/    # Supabase client și middleware auth
supabase/migrations/ # Schema baza de date (27 migrații)
tests/               # Teste Playwright E2E
```

## Note

Proiectul este în dezvoltare activă. 
