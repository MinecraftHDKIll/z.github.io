(() => {
  "use strict";
  const allowedCategories = new Set(["Kotlovnice", "Klimatizacija", "Kupaonice", "Uređaj protiv kamenca", "Ostalo"]);
  const allowedImagePrefix = "/assets/img/projects/gallery/";

  function makePhotoCard(photo) {
    const card = document.createElement("div");
    card.className = "gallery-card";
    card.style.aspectRatio = "4 / 3";

    const image = document.createElement("img");
    image.src = photo.image;
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
    zoom.href = photo.image;
    zoom.dataset.gallery = `gallery-github-${photo.category}`;
    zoom.className = "glightbox gallery-zoom github-gallery-zoom";
    zoom.setAttribute("aria-label", `Povećaj fotografiju: ${photo.title}`);
    const icon = document.createElement("i");
    icon.className = "bi bi-zoom-in";
    zoom.append(icon);
    info.append(title, description, zoom);
    card.append(image, info);
    return card;
  }

  async function loadPhotos() {
    try {
      const response = await fetch("/data/gallery.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Galerija: HTTP ${response.status}`);
      const photos = await response.json();
      if (!Array.isArray(photos)) throw new Error("Galerija: neispravan format podataka.");

      for (const photo of photos) {
        if (!photo || !allowedCategories.has(photo.category) || typeof photo.image !== "string" || !photo.image.startsWith(allowedImagePrefix) || !photo.title) continue;
        const category = [...document.querySelectorAll(".gallery-category")].find((element) =>
          element.querySelector(".gallery-category-header h3")?.textContent.trim() === photo.category,
        );
        category?.querySelector(".gallery-track")?.append(makePhotoCard(photo));
      }

      if (document.querySelector(".github-gallery-zoom") && window.GLightbox) {
        window.GLightbox({ selector: ".github-gallery-zoom" });
      }
    } catch (error) {
      console.info("GitHub galerija trenutačno nije dostupna.", error);
    }
  }

  loadPhotos();
})();
