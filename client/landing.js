// Import shared functions from common.js
import { state, formatINR, openModal, syncItemsFromFirestore } from "./common.js";

// ========== LANDING PAGE ==========

function renderLandingMenu(filter = "all") {
    const grid = document.getElementById("menuGrid");
    if (!grid) return;

    const items = state.items.filter(
        (i) => i.active && (filter === "all" || i.category === filter),
    );
    grid.innerHTML =
        items
            .map(
                (item) => `
    <div class="cake-card" data-cat="${item.category}">
      <div class="cake-img" style="background-image: url('${item.image}');">
        <span class="cake-badge">${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</span>
      </div>
      <div class="cake-body">
        <div class="cake-name">${item.name}</div>
        <div class="cake-desc">${item.desc}</div>
        <div class="cake-footer">
          <div class="cake-price">${formatINR(item.price)} <small>/${item.unit}</small></div>
          <button class="add-btn" onclick="openModal('login')">+ Order</button>
        </div>
      </div>
    </div>
  `,
            )
            .join("") ||
        '<p style="color:var(--text-muted);grid-column:1/-1;padding:40px;text-align:center;">No items in this category yet.</p>';
}

function filterCakes(cat, btn) {
    document
        .querySelectorAll("#menu-section .filter-btn")
        .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderLandingMenu(cat);
}

// Initialize landing page
document.addEventListener("DOMContentLoaded", async function () {
    await syncItemsFromFirestore();
    renderLandingMenu();

    // Scroll reveal animation
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) e.target.classList.add("visible");
            });
        },
        { threshold: 0.1 },
    );

    document
        .querySelectorAll(".scroll-reveal")
        .forEach((el) => observer.observe(el));
});

// ========== EXPOSE TO GLOBAL SCOPE ==========
// Make functions accessible from HTML onclick handlers
window.renderLandingMenu = renderLandingMenu;
window.filterCakes = filterCakes;

// ========== CUSTOM CAKE LANDING HANDLER ==========
window.handleCustomCakeClick = function() {
    // Check if user is logged in (same key used by common.js)
    const user = localStorage.getItem('currentUser');
    if (user) {
        // User logged in — set tab to open and redirect
        sessionStorage.setItem('openTab', 'custom');
        window.location.href = 'user.html';
    } else {
        // Prompt login/register
        if (typeof window.openModal === 'function') {
            window.openModal('login');
        } else {
            window.location.href = 'user.html';
        }
    }
};
