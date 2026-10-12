(() => {
  "use strict";
  const API = "/api/admin/photos";
  const categories = ["Kotlovnice", "Klimatizacija", "Kupaonice", "Uređaj protiv kamenca", "Ostalo"];
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  const queue = [];
  const queueElement = document.querySelector("#queue");
  const listElement = document.querySelector("#photo-list");
  const publishButton = document.querySelector("#publish");
  const clearButton = document.querySelector("#clear-queue");
  const statusElement = document.querySelector("#status");

  function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
  }

  async function request(url, options = {}) {
    const result = await fetch(url, { credentials: "same-origin", ...options });
    if (result.status === 401 || result.status === 403) {
      throw new Error("Pristup je istekao ili nije dopušten. Ponovno otvorite /admin/ i prijavite se.");
    }
    const data = await result.json().catch(() => ({}));
    if (!result.ok) throw new Error(data.error || "Zahtjev nije uspio.");
    return data;
  }

  function renderQueue() {
    queueElement.replaceChildren();
    for (const item of queue) {
      const row = document.createElement("div");
      row.className = "queue-item";
      const image = document.createElement("img");
      image.src = item.preview;
      image.alt = "Pregled odabrane fotografije";
      const fields = document.createElement("div");
      fields.className = "queue-fields";
      const titleLabel = document.createElement("label");
      titleLabel.append("Naslov");
      const title = document.createElement("input");
      title.maxLength = 120;
      title.required = true;
      title.placeholder = item.file.name.replace(/\.[^.]+$/, "");
      title.value = title.placeholder;
      item.title = title.value;
      title.addEventListener("input", () => { item.title = title.value; });
      titleLabel.append(title);
      const descriptionLabel = document.createElement("label");
      descriptionLabel.append("Opis");
      const description = document.createElement("input");
      description.maxLength = 500;
      description.placeholder = "Kratki opis (nije obavezan)";
      description.addEventListener("input", () => { item.description = description.value; });
      descriptionLabel.append(description);
      const categoryLabel = document.createElement("label");
      categoryLabel.append("Kategorija");
      const category = document.createElement("select");
      for (const name of categories) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        category.append(option);
      }
      category.addEventListener("change", () => { item.category = category.value; });
      categoryLabel.append(category);
      fields.append(titleLabel, descriptionLabel, categoryLabel);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "secondary";
      remove.textContent = "Ukloni";
      remove.addEventListener("click", () => {
        URL.revokeObjectURL(item.preview);
        queue.splice(queue.indexOf(item), 1);
        renderQueue();
      });
      row.append(image, fields, remove);
      queueElement.append(row);
    }
    publishButton.disabled = queue.length === 0;
    clearButton.hidden = queue.length === 0;
  }

  function addFiles(files) {
    for (const file of files) {
      if (!allowedTypes.has(file.type) || file.size > 12 * 1024 * 1024) {
        setStatus(`${file.name}: format nije podržan ili datoteka prelazi 12 MB.`, true);
        continue;
      }
      queue.push({ file, preview: URL.createObjectURL(file), title: "", description: "", category: categories[0] });
    }
    renderQueue();
  }

  function renderPhotos(photos) {
    listElement.replaceChildren();
    if (photos.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Još nema fotografija dodanih putem ovog panela.";
      listElement.append(empty);
      return;
    }
    for (const photo of photos) {
      const row = document.createElement("div");
      row.className = "photo-item";
      const image = document.createElement("img");
      image.src = photo.url;
      image.alt = "";
      image.loading = "lazy";
      const copy = document.createElement("div");
      copy.className = "photo-copy";
      const title = document.createElement("strong");
      title.textContent = photo.title;
      const details = document.createElement("span");
      details.textContent = `${photo.category}${photo.description ? ` · ${photo.description}` : ""}`;
      copy.append(title, details);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "secondary";
      remove.textContent = "Obriši";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Obrisati fotografiju „${photo.title}” iz galerije?`)) return;
        remove.disabled = true;
        try {
          await request(API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: photo.key }) });
          await loadPhotos();
          setStatus("Fotografija je obrisana.");
        } catch (error) {
          setStatus(error.message, true);
          remove.disabled = false;
        }
      });
      row.append(image, copy, remove);
      listElement.append(row);
    }
  }

  async function loadPhotos() {
    try {
      renderPhotos(await request(API));
    } catch (error) {
      listElement.textContent = error.message;
    }
  }

  document.querySelector("#file-input").addEventListener("change", (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  });
  const dropZone = document.querySelector("#drop-zone");
  for (const eventName of ["dragenter", "dragover"]) {
    dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add("is-dragging"); });
  }
  for (const eventName of ["dragleave", "drop"]) {
    dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove("is-dragging"); });
  }
  dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
  clearButton.addEventListener("click", () => {
    for (const item of queue) URL.revokeObjectURL(item.preview);
    queue.length = 0;
    renderQueue();
  });
  publishButton.addEventListener("click", async () => {
    if (queue.some((item) => !item.title.trim())) {
      setStatus("Unesite naslov za svaku fotografiju.", true);
      return;
    }
    publishButton.disabled = true;
    clearButton.disabled = true;
    try {
      let uploaded = 0;
      const total = queue.length;
      while (queue.length > 0) {
        const item = queue[0];
        setStatus(`Objavljujem ${uploaded + 1} od ${total}…`);
        const body = new FormData();
        body.append("image", item.file);
        body.append("title", item.title.trim());
        body.append("description", item.description.trim());
        body.append("category", item.category);
        await request(API, { method: "POST", body });
        URL.revokeObjectURL(item.preview);
        queue.shift();
        uploaded += 1;
        renderQueue();
      }
      await loadPhotos();
      setStatus("Fotografije su objavljene i prikazat će se u galeriji.");
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      publishButton.disabled = queue.length === 0;
      clearButton.disabled = false;
    }
  });

  loadPhotos();
})();
