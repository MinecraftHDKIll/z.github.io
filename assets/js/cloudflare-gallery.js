(() => {
  "use strict";
  const galleryNames = new Set(["Kotlovnice", "Klimatizacija", "Kupaonice", "Uređaj protiv kamenca", "Ostalo"]);

  function makePhotoCard(photo) {
    const card = document.createElement("div");
    card.className = "gallery-card";
    card.style.aspectRatio = "4 / 3";
    const image = document.createElement("img");
    image.src = photo.url;
    image.className = "img-fluid";
    image.alt = photo.title;
    image.loading = "lazy";
    image.addEventListener("load", () => {
      if (image.naturalWidth && image.naturalHeight) card.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
    }, { once: true });
    const info = document.createElement("div");
    info.className = "gallery-card-info";
    const title = document.createElement("h4");
    title.textContent = photo.title;
    const description = document.createElement("p");
    description.textContent = photo.description || "";
    const zoom = document.createElement("a");
    zoom.href = photo.url;
    zoom.dataset.gallery = `gallery-cloudflare-${photo.category}`;
    zoom.className = "glightbox gallery-zoom gallery-cloudflare-zoom";
    zoom.setAttribute("aria-label", `Povećaj fotografiju: ${photo.title}`);
    const icon = document.createElement("i");
    icon.className = "bi bi-zoom-in";
    zoom.append(icon);
    info.append(title, description, zoom);
    card.append(image, info);
    return card;
  }

  async function loadCloudflarePhotos() {
    try {
      const response = await fetch("/gallery-data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Galerija: HTTP ${response.status}`);
      const photos = await response.json();
      if (!Array.isArray(photos)) throw new Error("Galerija: neispravan odgovor.");
      for (const photo of photos) {
        if (!galleryNames.has(photo.category) || typeof photo.url !== "string" || !photo.url.startsWith("/uploads/")) continue;
        const category = [...document.querySelectorAll(".gallery-category")].find((element) =>
          element.querySelector(".gallery-category-header h3")?.textContent.trim() === photo.category,
        );
        category?.querySelector(".gallery-track")?.append(makePhotoCard(photo));
      }
      if (document.querySelector(".gallery-cloudflare-zoom") && window.GLightbox) {
        window.GLightbox({ selector: ".gallery-cloudflare-zoom" });
      }
    } catch (error) {
      console.info("Cloudflare galerija trenutačno nije dostupna.", error);
    }
  }

  loadCloudflarePhotos();
})();
