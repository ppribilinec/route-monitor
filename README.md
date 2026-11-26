# Route Monitor v2 – aktualizace

1. Zálohujte Firestore a původní soubory. Aktualizaci provádějte mimo nakládku. Nejdříve ověřte, že žádná nakládka není otevřená.
2. Ve Firebase publikujte nový obsah firestore.rules (Firestore Database > Rules). Anonymous a Email/Password ponechte povolené.
3. Na GitHub nahrajte index.html a app.js do kořene repozitáře, přepište původní soubory. Vyčkejte na GitHub Pages.
4. Přihlaste se původním admin účtem, otevřete Depa a trasy a klikněte Převést data z v1. Původní trasy a záznamy se přiřadí pod Původní depo. Operace je opakovatelná pro dosud nepřevedené záznamy. Při chybě ji opakujte. Staré QR kódy budou deaktivovány.
5. Přejmenujte depo, nastavte plánované časy tras, vytiskněte nové QR kódy. Staré záznamy nemají plánované časy. Archivace zachovává historii.
6. V Uživatelé vytvořte dispečery nebo přiřaďte depa existujícím účtům. Login bez @ se interně převádí na adresu @route-monitor.invalid. Hesla jsou pouze ve Firebase Authentication, nikoli Firestore. Pokud selže zápis profilu po vytvoření účtu, doplňte users/{UID} ručně v konzoli nebo odstraňte osiřelý účet v Authentication.
7. Otestujte příjezd, opakovaný příjezd, odjezd, historii, změnu hesla a přístup dispečera k povolenému i nepovolenému depu. Před ostrým provozem otestujte pravidla v emulátoru.

Datum historie je datum příjezdu v Europe/Prague. Výjezd s plánem dřívějším než plán příjezdu se vyhodnotí následující den. Kladná odchylka je zpoždění, záporná předstih. Plán se ukládá při příjezdu. Historie načítá záznamy vybraného depa a filtruje datum v prohlížeči; pro velké objemy je vhodné přidat serverový filtr a index. Statický QR není důkaz fyzické přítomnosti. Vytváření účtů používá sekundární Firebase Auth instanci; veřejnou registraci nelze tímto řešením zakázat, ale účty bez profilu nemají přístup k interním datům. Pro ostrý provoz doporučujeme Cloud Functions a App Check.
