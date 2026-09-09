# GeniaLogic

Applicazione locale per creare, esplorare e conservare alberi genealogici complessi.

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

## Dati

GeniaLogic mantiene automaticamente una copia dell'albero nel database locale del browser. Dalla sezione **Archivio** è possibile salvare e riaprire file `.genia` esterni.

Il formato `.genia` contiene dati JSON compressi con Gzip e un'intestazione proprietaria. Non è cifrato: il file va conservato come un normale documento personale.
