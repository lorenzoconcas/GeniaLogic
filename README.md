# GeniaLogic

Applicazione per creare, esplorare e conservare alberi genealogici complessi, con dati salvati localmente nel browser.

## Avvio

```bash
npm install
npm run dev
```

Per creare la versione ottimizzata:

```bash
npm run build
npm run preview
```

Lo sviluppo usa `http://localhost:5173/`. L’anteprima della build usa
`http://localhost:4173/GeniaLogic/` (le porte possono variare se occupate).

## GitHub Pages

Indirizzo del sito: **https://lorenzoconcas.github.io/GeniaLogic/**.

1. Carica il progetto nel repository `lorenzoconcas/GeniaLogic`, branch `main`,
   includendo `.github/workflows/pages.yml` e `package-lock.json`.
2. In **Settings → Pages → Build and deployment → Source**, scegli **GitHub Actions**.
3. Il workflow **Publish GeniaLogic to GitHub Pages** parte a ogni push su `main`.
   Puoi anche avviarlo da **Actions → Publish GeniaLogic to GitHub Pages → Run workflow**.
4. Al completamento del job `deploy`, apri l’indirizzo sopra.

Il workflow usa Node.js 24, installa le dipendenze dal lockfile e pubblica solo
`dist/`. Non occorre aggiungere `dist/` al repository o creare un branch `gh-pages`.
Il workflow legge il percorso effettivo da GitHub Pages e lo passa a Vite tramite
`PAGES_BASE_PATH`. Le maiuscole contano: `/GeniaLogic/` e `/genialogic/` non sono
intercambiabili per gli asset. Le build locali usano `/GeniaLogic/` come valore
predefinito; lo sviluppo locale mantiene `/`. Non è necessario un backend.

Riferimento: [pubblicazione Vite su GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages).

## Dati

GeniaLogic mantiene automaticamente una copia dell'albero nel database locale del browser. Dalla sezione **Archivio** è possibile salvare e riaprire file `.genia` esterni.

Nei browser che supportano l'accesso diretto ai file, l'archivio scelto resta collegato: alla riapertura della scheda GeniaLogic chiede conferma e rilegge il file dal disco prima di abilitare le modifiche. Prima di riscriverlo verifica inoltre che non sia stato aggiornato altrove; in caso di conflitto consente di annullare, sovrascrivere oppure unire le copie per persona, legame e singolo campo.

Il formato `.genia` contiene dati JSON compressi con Gzip e un'intestazione proprietaria. Non è cifrato: il file va conservato come un normale documento personale.

La pubblicazione rende accessibile l’app, ma non carica gli alberi su GitHub.
Il sito pubblicato e `localhost` hanno archivi del browser separati: per spostare
il tuo albero, esporta il file `.genia` da localhost e importalo nel sito pubblicato.

### Aprire un archivio su iPhone e iPad

Apri GeniaLogic nel browser e usa **Archivio → Scegli un file** (oppure **Apri
archivio** dal menu). Nel selettore File scegli il documento `.genia`.
Il selettore mostra tutti i formati per consentire a iOS/iPadOS di selezionare
anche questa estensione personalizzata; GeniaLogic controlla il contenuto prima
di importarlo. Non occorre rinominare il file.

Se un provider cloud non rende leggibile il documento, scaricalo o copialo in
**Su iPhone / Su iPad** nell’app File, poi seleziona la copia locale.
