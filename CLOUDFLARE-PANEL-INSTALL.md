# Cloudflare panel za galeriju

## Ugradnja u GitHub repozitorij

Raspakiraj izmjene preko postojeće kopije repozitorija i sačuvaj iste putanje. Izmijenjeni `index.html` učitava nove objave iz Cloudflare Workera; mapa `admin` sadrži panel, a mapa `worker` sadrži kod i Cloudflare postavke.

Zatim objavi izmijenjene i nove datoteke u repozitorij `MinecraftHDKIll/z.github.io` na GitHubu. GitHub Pages će objaviti panel na `https://www.z-technik.hr/admin/`.

## Cloudflare

Slijedi upute u [worker/README.md](worker/README.md). Obavezno prvo napravi privatni R2 bucket, podesi Cloudflare Access s dopuštenom e-mail adresom, unesi Worker varijable i secret te dodaj tri Worker rute. Tek nakon toga panel može sigurno slati i brisati fotografije.

## Postojeća galerija

Fotografije koje su već ugrađene u `index.html` ostaju prikazane. Nove fotografije spremljene u R2 pojavljuju se uz njih u odabranoj kategoriji. Panel trenutno podržava JPEG, PNG, WebP i AVIF do 12 MB po slici.
