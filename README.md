# Route Monitor v3.0

Aktualizace z v2: zachovejte existujici Firebase projekt a data. Zalohujte databazi a repozitar, aktualizujte mimo nakladku. Nespoustejte migraci v1 znovu.

1. Pro spravu hesel a mazani cizich uctu je nutna Cloud Function. Firebase projekt musi mit tarif Blaze (placeni dle spotreby). Nastavte upozorneni na rozpocet. Nainstalujte Node.js 22 a Firebase CLI (`npm install -g firebase-tools`). V rozbalenem adresari spustte:

```
firebase login
cd functions
npm install
cd ..
firebase deploy --only functions:manageUser,firestore:rules --project route-monitor-4c0aa
```

2. Na GitHub nahrajte index.html a app.js do korene repozitare (nahrazeni). Zdroj funkce a firebase.json muzete verzovat take, nejsou nutne pro Pages. Nenahravejte node_modules ani prihlasovaci klice. Pokud funkci zatim nenasadite, mazani uctu a zmena ciziho hesla nebudou fungovat; ostatni funkce lze pouzit po publikaci firestore.rules v konzoli.
3. Prihlaste se jako admin, Nastaveni: nastavte globalni interval (15-3600 sekund, vychozi 60). Dispecer muze menit jen vlastni heslo. Zmena intervalu se projevi po dalsim cyklu.
4. Depa a trasy: Deaktivovat od data skryje trasu od zvoleneho dne vcetne; zruseni deaktivace ji znovu zobrazi. QR zustava stejny. Historicke dny pred deaktivaci zustavaji dostupne. Deaktivace je v teto verzi kontrolovana klientem, nikoli serverovymi pravidly; nejde o bezpecnostni blokaci QR. Historie prazdnych tras vychazi z aktualni konfigurace, nikoli z historickeho rozpisu. 
5. Otestujte admin i dispecera, zmenu hesla a smazani testovaciho uctu, datum, QR a barvy. Admin nemuze smazat vlastni ucet. Smazani odebere profil a nasledne Auth ucet; pri chybe druhe operace zkontrolujte Authentication v konzoli.

JavaScript syntaxe overena, zive nasazeni, emulator pravidel a integracni testy neprovedeny. Staticke QR lze kopirovat. Pred ostrym provozem overte zabezpeceni s IT.
