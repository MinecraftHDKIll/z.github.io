# Cloudflare gallery worker

# Cloudflare galerija

Ovaj Worker čuva nove fotografije u privatnom R2 bucketu. Javni endpoint vraća samo podatke potrebne za prikaz galerije i pojedinačne slike. Upload, pregled popisa i brisanje zahtijevaju valjan Cloudflare Access token, točno dopuštenu e-mail adresu i zahtjev s iste stranice.

## Postavljanje u Cloudflareu

1. U Cloudflareu otvori **R2 Object Storage** i napravi bucket `z-technik-gallery`.
2. Otvori **Workers & Pages**, napravi Worker naziva `z-technik-gallery`, odaberi uređivanje koda i zamijeni predložak sadržajem iz `worker/src/index.js`. Objavi Worker.
3. U postavkama Workera dodaj R2 binding: varijabla `GALLERY`, bucket `z-technik-gallery`.
4. Dodaj varijable `SITE_ORIGIN=https://www.z-technik.hr`, `ACCESS_TEAM_DOMAIN` (npr. `naziv-tima.cloudflareaccess.com`) i `ACCESS_AUD` (vrijednost iz Access aplikacije, korak 6).
5. Dodaj Worker secret `ADMIN_EMAIL` s e-mail adresom kojom ćeš se prijavljivati. Secret nemoj spremati u GitHub.
6. U **Zero Trust → Access → Applications** napravi Self-hosted aplikaciju za `www.z-technik.hr`. Zaštićene putanje postavi na `/admin`, `/admin/*` i `/api/admin/*`. Napravi Allow pravilo koje dopušta samo tvoju e-mail adresu i uključi One-time PIN prijavu ako nemaš drugog pružatelja prijave. Kopiraj aplikacijski **Audience (AUD) Tag** u `ACCESS_AUD` u Worker postavkama. Jedna Access aplikacija treba pokrivati sve tri putanje kako bi isti AUD vrijedio za panel i API.
7. U **Workers & Pages → z-technik-gallery → Settings → Domains & Routes** dodaj ove rute na zonu `z-technik.hr`:
   - `www.z-technik.hr/gallery-data.json`
   - `www.z-technik.hr/uploads/*`
   - `www.z-technik.hr/api/admin/*`
8. Objavi promjene web-stranice iz korijena repozitorija na GitHubu. Nakon objave otvori `https://www.z-technik.hr/admin/`, prijavi se dopuštenom e-mail adresom i dodaj probnu fotografiju.

Bucket ostaje privatan: slike se dohvaćaju kroz Worker, a javna ruta za učitavanje objekata ne postoji. Nemoj omogućiti javni `r2.dev` pristup bucketu. Cloudflare Access autentificira panel, a Worker dodatno provjerava potpis, izdavatelja, AUD, rok valjanosti, e-mail i `Origin` zahtjeva.

## Objava Workera preko Wrangler CLI-ja

Ako imaš Node.js i Wrangler, iz direktorija `worker` pokreni `npx wrangler deploy`. Prije objave napravi R2 bucket, postavi secret naredbom `npx wrangler secret put ADMIN_EMAIL` i zamijeni `ACCESS_TEAM_DOMAIN` i `ACCESS_AUD` u `wrangler.toml`. Nakon deploya dodaj tri rute iz koraka 7 u Cloudflare nadzornoj ploči.

## Podržani podaci

Panel prihvaća JPG, PNG, WebP i AVIF slike do 12 MB. Dostupne kategorije su Kotlovnice, Klimatizacija, Kupaonice, Uređaj protiv kamenca i Ostalo. Brisanje iz panela trajno uklanja dodanu sliku iz R2 bucketa. Fotografije koje su već ručno upisane u `index.html` ostaju nepromijenjene.
