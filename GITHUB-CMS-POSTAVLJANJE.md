# Besplatno uređivanje galerije preko GitHuba

Ova verzija koristi Pages CMS. Ne koristi R2, Worker ni dodatni hosting: slike i opisi spremaju se u postojeći GitHub repozitorij. Pages CMS je besplatan i podržava povlačenje i ispuštanje fotografija.

## Prvi put

1. Objavi datoteke iz ovog paketa u korijenu repozitorija `MinecraftHDKIll/z.github.io` na GitHubu. Putanje moraju ostati sačuvane: `.pages.yml`, `data/gallery.json`, `assets/js/github-gallery.js` i izmijenjeni `index.html`.
2. Otvori [Pages CMS](https://app.pagescms.org/) i prijavi se svojim GitHub računom.
3. Daj Pages CMS-u pristup repozitoriju `MinecraftHDKIll/z.github.io` kada GitHub to zatraži. Nemoj nikome slati lozinku ili osobni pristupni token.
4. U Pages CMS-u otvori taj repozitorij i odjeljak **Galerija**.
5. Dodaj zapis, povuci fotografiju u polje **Fotografija**, upiši naslov i opis te izaberi kategoriju. Spremi promjenu.
6. Pages CMS će spremiti datoteku i podatke na GitHub. GitHub Pages će zatim objaviti izmjenu; pričekaj da se objava završi.

Za buduće objave prijavi se na Pages CMS GitHub računom i uređuj odjeljak **Galerija**. Nema Cloudflare R2 koraka.

## Napomena o slikama

Nove fotografije pohranjuju se u `assets/img/projects/gallery` unutar GitHub repozitorija. Zato će repozitorij s vremenom rasti, a objava se može kratko odgoditi dok se GitHub Pages ponovno objavljuje. Uklanjanje stavke iz popisa galerije makne je s web-stranice; ako želiš obrisati i samu datoteku slike iz repozitorija, izbriši je i iz media upravitelja Pages CMS-a.
