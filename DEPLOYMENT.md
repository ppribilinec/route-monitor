# Nasazení Route Monitor v3.1

## Rozsah změny

Správa tras používá tabulku (jedna trasa na řádek) bez automatického vykreslování QR. Tlačítko „Zobrazit náhled QR“ otevře náhled s odkazem a stažením PDF jedné trasy. „Export QR kódů“ u depa stáhne A4 PDF se všemi trasami daného depa, každou na vlastní stránce. Zahrnuje i archivované a deaktivované trasy s uvedením jejich stavu; export je neaktivuje. Prázdné depo má export vypnutý. Chybějící token zastaví celý export s vysvětlením, aby nevznikl neúplný soubor.

„Kopírovat“ otevře formulář s názvem, depem, plánovaným přistavením a výjezdem, směnou, datem deaktivace a archivací zdrojové trasy. Všechny tyto hodnoty lze změnit. Uložení vytvoří nové UUID trasy i QR tokenu; nekopíruje stav nakládky ani historii. Kopie archivované nebo deaktivované trasy přebírá i tento stav, dokud jej uživatel ve formuláři nezmění.

## Firebase kompatibilita

- Projekt zůstává `route-monitor-4c0aa`; nemění se konfigurace ani kolekce.
- `routes/{id}` má navíc volitelný řetězec `shift` (směna / časové označení). U starých tras může chybět; zobrazí se prázdný údaj. Žádná migrace není potřeba.
- Stávající položky `depot`, `name`, `plannedArrival`, `plannedDeparture`, `archived`, `disabledFrom` a `qr` zůstávají zachované. Také další parametry konfigurace se při editaci a kopírování zachovají.
- Záznam `qr/{token}` má stejnou strukturu jako ve v3: `route`, `depot`, `name`, plánované časy, `enabled`, `disabledFrom`, `kind: 'both'`. Trasa a její QR záznam se uloží v jedné dávce.
- Běžná editace a archivace zachovávají QR token. Kopie má nový token a nezasahuje do tokenu zdroje. Historie `loadings` a stavy `states` se při správě tras nekopírují ani nepřepisují.
- Změna depa, nová deaktivace nebo archivace probíhající trasy vyžaduje nejprve ukončit nakládku. Kontrola zůstává klientská, jako ve v3.
- `firestore.rules`, `index.js` (Cloud Function `manageUser`) a `firebase.json` se nemění. Existující pravidla dovolují správci přidat volitelné pole `shift`. **Není nutné nasazovat pravidla ani functions.**
- Zachovává se omezení v3: deaktivace podle data je kontrola klienta, nikoli bezpečnostní zákaz ve Firestore pravidlech. Tato změna pravidla nezpřísňuje ani nerozšiřuje práva dispečerů nebo řidičů.

## Publikace aplikace

Aktuální nastavení ověřené přes GitHub API dne 27. 11. 2026: GitHub Pages publikuje větev `main`, složku `/` (kořen), v režimu publikace z větve. Veřejná adresa je `https://ppribilinec.github.io/route-monitor/`. Po sloučení PR do `main` se tato sada souborů publikuje obvyklým procesem Pages; není potřeba měnit nastavení zdroje.

1. Zkontrolujte PR a slučte větev `feat/route-list-qr-export-copy` do větve používané pro GitHub Pages. Ponechte stejný projekt Firebase i stejnou veřejnou adresu aplikace, aby fungovaly už vytištěné QR kódy.
2. V GitHub repozitáři otevřete **Settings → Pages** a ověřte zdroj publikace. Při režimu „Deploy from a branch“ vyberte větev s touto změnou (typicky `main`) a složku `/(root)`. Pokud používáte existující Actions workflow, publikujte jím stejnou sadu souborů.
3. Publikovat se musí současně `index.html`, `app.js`, `route-tools.mjs`, `routes.css` a celá složka `vendor/` (oba JS soubory včetně licencí). Samotné nahrazení původních dvou souborů nestačí. Není potřeba frontend sestavovat ani instalovat npm balíčky na hosting.
4. Počkejte na úspěšné dokončení nasazení Pages v záložce **Actions**. Otevřete aplikaci na její dosavadní URL a proveďte úplné obnovení stránky (`Ctrl+F5`). Verze vstupního skriptu, modulu a CSS má parametr `v=3.1`.
5. Přihlaste se jako admin. Ověřte řádkový seznam, náhled, export depa a kopii testovací trasy. Kopii otevřete přes její vlastní QR; původní QR musí nadále otevírat původní trasu. Ověřte směnu, časy přes půlnoc, datum deaktivace i archivaci. Vytištěné PDF tiskněte na A4 na výšku, ideálně ve skutečné velikosti.
6. Zkontrolujte existující přehled dispečera, příchod/odchod řidiče a historii. Nespouštějte „Převést data z v1“ při aktualizaci z v3.

Do uživatelova Firebase se při přípravě této změny nic nenasazovalo a produkční data nebyla upravována. Sloučení PR může spustit váš stávající proces publikace Pages.

## Původní Cloud Function: jen pokud ji budete znovu nasazovat

Pro tuto aktualizaci tuto část nepotřebujete. Repozitář v3 má funkci a její `package.json` v kořeni, zatímco `firebase.json` odkazuje na `functions/`. Původní pokyn `cd functions` proto v čistém klonu nefunguje. Jestli potřebujete samostatně znovu nasadit nezměněnou funkci, připravte lokální složku podle konfigurace (PowerShell, z kořene repozitáře):

```powershell
New-Item -ItemType Directory -Force functions
Copy-Item -LiteralPath index.js -Destination functions/index.js
Copy-Item -LiteralPath package.json -Destination functions/package.json
npm --prefix functions install --omit=dev
firebase login
firebase deploy --only functions:manageUser --project route-monitor-4c0aa
```

Vyžaduje Node.js 22, Firebase CLI, oprávnění k projektu a podmínky pro Cloud Functions uvedené v původním návodu (tarif Blaze). Neměňte kvůli této UI aktualizaci Firebase projekt ani databázi. Funkci ani pravidla nenasazujte automaticky společně s frontendem.

## Ověření a jeho hranice

```powershell
npm install
npx playwright install chromium
npm test
npm run test:browser
npm run test:pdf
```

Lze použít instalovaný Edge místo stažení Chromium: `$env:PLAYWRIGHT_CHANNEL='msedge'` před `npm run test:browser`. Výsledky a obrázky jsou v ignorované složce `test-results/`.

Ověřeno: syntaxe, validace, zachování parametrů, nové identity kopií, původní QR při editaci, zákaz přesunu probíhající nakládky, předvyplnění deaktivovaných/archivovaných tras, mobilní formulář, příjezd/odjezd řidiče, žádné QR v seznamu, tři A4 stránky a dekódování správných tokenů z vykresleného PDF všech tří stran. PDF a obrazovky byly také vizuálně zkontrolovány.

Prohlížečové testy používají skutečné UI a PDF/QR knihovny, ale **nahrazují Firebase lokálním testovacím adaptérem**. Nebyly provedeny testy proti produkční databázi, emulátoru pravidel ani skutečně přihlášeným účtům uživatele. Změna zachovává stávající pravidla; jejich integrační ověření není součástí těchto testů.

PDF text je vykreslený ve vysokém rozlišení kvůli podpoře českých znaků bez externích fontů; není textově prohledávatelný. Samotný QR je vektorový. QR i PDF vznikají místně v prohlížeči bez odesílání tras externí službě.

## Návrat k předchozí verzi

Vraťte frontend na commit `fc369cf` přes nový revert commit nebo předchozí release ve vašem procesu Pages a znovu jej publikujte. Neměňte databázi a nemažte nové trasy. Předchozí aplikace ignoruje volitelné pole `shift`; nové QR záznamy zůstávají kompatibilní s v3.
