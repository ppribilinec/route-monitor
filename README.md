# Route Monitor – testovací verze
1. Firebase Authentication: kromě Email/Password povolte Anonymous (řidič nemá účet, SDK získá anonymní identitu).
2. Authentication > Users > Add user: vytvořte administrátora. Zkopírujte jeho UID. Firestore > Data: vytvořte kolekci users, dokument s tímto UID, pole role typu string s hodnotou admin. Pro dispečera stejný postup s hodnotou dispatcher.
3. Firestore > Rules: vložte celý obsah firestore.rules a Publish. Nikdy nepovolujte veřejné čtení celé databáze.
4. Nahrajte index.html a app.js do kořene repozitáře. Settings > Pages > Deploy from a branch > main / root. Authentication > Settings > Authorized domains: přidejte ppribilinec.github.io.
5. Otevřete https://ppribilinec.github.io/route-monitor/ a přihlaste se. Administrace > Inicializovat 21 tras. Vytiskněte QR kódy. Otestujte příjezd, opakovaný příjezd, odjezd, opakovaný odjezd a přístup dispečera.
6. Před ostrým provozem ověřte pravidla v Firebase Emulator Suite, schválení IT, ochranu SPZ, zálohy, limity a hostingové podmínky. Statické QR lze kopírovat; nezaručují fyzickou přítomnost. Anonymní účty mohou spotřebovávat kvóty. Pro vyšší ochranu použijte serverové Cloud Functions, App Check a omezení požadavků.

Omezení: jeden seznam tras, historie posledních 1000 záznamů, CSV místo XLSX, nastavení intervalu v prohlížeči. Správa rolí přes Firebase Console. Bez editace záznamů, auditního logu a správy více dep. Záznam odjezdu znamená potvrzení ukončení nakládky, nikoli fyzický odjezd. Provozní den je kalendářní den v Praze. QR knihovna a Firebase SDK se načítají z CDN. Žádné živé testy proti vašemu projektu nebyly provedeny.
