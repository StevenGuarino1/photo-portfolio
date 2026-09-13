// Flip off to keep photos in the literal order they're listed in photos.js.
const SHUFFLE_ON_LOAD = true;

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatExif(photo) {
  const parts = [];
  if (photo.aperture) parts.push(photo.aperture);
  if (photo.shutter) parts.push(photo.shutter);
  if (photo.iso) parts.push(`ISO ${photo.iso}`);
  return parts.join(" · ");
}

const orderedPhotos = SHUFFLE_ON_LOAD ? shuffle(PHOTOS) : PHOTOS.slice();

const grid = document.getElementById("grid");

orderedPhotos.forEach((photo, index) => {
  const img = document.createElement("img");
  img.src = photo.file;
  img.alt = photo.alt || "";
  if (photo.title) img.title = photo.title;
  if (photo.width && photo.height) {
    img.width = photo.width;
    img.height = photo.height;
  }
  img.loading = index < 4 ? "eager" : "lazy";
  img.decoding = "async";
  if (photo.file2x) {
    img.srcset = `${photo.file} 1x, ${photo.file2x} 2x`;
  }
  img.dataset.index = index;
  img.addEventListener("click", () => openLightbox(index));
  grid.appendChild(img);
});

// ---------- Lightbox ----------

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxExif = document.getElementById("lightbox-exif");

let currentIndex = 0;

function sizeLightboxImage() {
  const shorter = Math.min(window.innerWidth, window.innerHeight);
  const target = Math.round(shorter * 0.85);
  lightboxImg.style.setProperty("--lb-max-w", `${target}px`);
  lightboxImg.style.setProperty("--lb-max-h", `${target}px`);
}

function showPhoto(index) {
  const photo = orderedPhotos[index];
  currentIndex = index;

  lightboxImg.src = photo.file;
  lightboxImg.alt = photo.alt || "";
  if (photo.file2x) {
    lightboxImg.srcset = `${photo.file} 1x, ${photo.file2x} 2x`;
  } else {
    lightboxImg.removeAttribute("srcset");
  }

  lightboxExif.textContent = formatExif(photo);
}

function openLightbox(index) {
  showPhoto(index);
  sizeLightboxImage();
  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  // force layout so the opacity transition actually runs from 0 -> 1
  requestAnimationFrame(() => {
    lightbox.classList.add("is-open");
  });
}

function closeLightbox() {
  lightbox.classList.remove("is-open");
  document.body.classList.remove("lightbox-open");
  const onEnd = (e) => {
    if (e.target !== lightbox) return;
    lightbox.hidden = true;
    lightbox.removeEventListener("transitionend", onEnd);
  };
  lightbox.addEventListener("transitionend", onEnd);
}

function showNext(delta) {
  const next = (currentIndex + delta + orderedPhotos.length) % orderedPhotos.length;
  showPhoto(next);
  sizeLightboxImage();
}

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target === lightbox.querySelector(".lightbox-stage")) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowRight") showNext(1);
  else if (e.key === "ArrowLeft") showNext(-1);
});

window.addEventListener("resize", () => {
  if (!lightbox.hidden) sizeLightboxImage();
});

// ---------- Footer year ----------

document.getElementById("year").textContent = new Date().getFullYear();
