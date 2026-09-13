// How to order the grid on load:
//   "shuffle" — random order (Fisher-Yates), re-shuffled on every page load
//   "newest"  — by dateTaken, newest first (Instagram-style feed order)
//   "oldest"  — by dateTaken, oldest first
//   "none"    — the literal order photos are listed in photos.js
// Photos missing a dateTaken sort to the end under "newest"/"oldest".
const SORT_MODE = "newest";

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sortByDate(array, direction) {
  const arr = array.slice();
  arr.sort((a, b) => {
    const da = a.dateTaken ? Date.parse(a.dateTaken) : null;
    const db = b.dateTaken ? Date.parse(b.dateTaken) : null;
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return direction === "newest" ? db - da : da - db;
  });
  return arr;
}

function formatExif(photo) {
  const parts = [];
  if (photo.aperture) parts.push(photo.aperture);
  if (photo.shutter) parts.push(photo.shutter);
  if (photo.iso) parts.push(`ISO ${photo.iso}`);
  return parts.join(" · ");
}

let orderedPhotos;
switch (SORT_MODE) {
  case "shuffle":
    orderedPhotos = shuffle(PHOTOS);
    break;
  case "newest":
  case "oldest":
    orderedPhotos = sortByDate(PHOTOS, SORT_MODE);
    break;
  default:
    orderedPhotos = PHOTOS.slice();
}

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
  // Fill almost the whole viewport, just keeping a thin margin so the
  // image never touches the screen edge, plus a little room below for
  // the EXIF caption line.
  const margin = 14;
  const captionSpace = 46;
  const maxW = Math.round(window.innerWidth - margin * 2);
  const maxH = Math.round(window.innerHeight - margin * 2 - captionSpace);
  lightboxImg.style.setProperty("--lb-max-w", `${maxW}px`);
  lightboxImg.style.setProperty("--lb-max-h", `${maxH}px`);
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
