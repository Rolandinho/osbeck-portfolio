// Gallerifilter – kör bara på startsidan
const filterBtns = document.querySelectorAll(".filter-btn");
const galleryItems = document.querySelectorAll(".gallery-item");
if (filterBtns.length) {
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      galleryItems.forEach(item => {
        const show = filter === "alla" || item.dataset.category === filter;
        item.style.display = show ? "block" : "none";
      });
    });
  });
}

// Shuffle gallery – blandas om vid varje sidladdning
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const gallery = document.getElementById("gallery");
if (gallery) {
  const items = Array.from(gallery.children);
  shuffle(items).forEach(item => gallery.appendChild(item));
}
