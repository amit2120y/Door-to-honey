// Import shared functions from common.js
import { state, updateCartUI, addToCart, changeQty, placeOrder, closeModal, openCart, closeCart, logout, formatINR, toast, syncItemsFromFirestore } from "./common.js";
import { getUserOrdersFromFirestore, createCustomOrderInFirestore, getUserCustomOrdersFromFirestore } from "../server/firebase-db.js";

// ========== USER PAGE ==========

async function loadUserPage() {
    const userGreet = document.getElementById("userGreet");
    if (userGreet && state.currentUser) {
        userGreet.textContent = "Hello, " + state.currentUser.name.split(" ")[0] + "! 👋";
    }
    await syncItemsFromFirestore();
    renderUserMenu();
    updateCartUI();
    await loadUserOrdersFromFirestore();
}

async function loadUserOrdersFromFirestore() {
    if (!state.currentUser) return;

    try {
        const possibleIds = [state.currentUser.id, state.currentUser.uid].filter(Boolean);
        const uniqueIds = [...new Set(possibleIds)];
        let allOrders = [];

        for (const userId of uniqueIds) {
            const orders = await getUserOrdersFromFirestore(userId);
            allOrders.push(...orders);
        }

        const uniqueOrders = [...new Map(allOrders.map((o) => [o.id, o])).values()];
        state.orders = uniqueOrders;
        renderUserOrders();
    } catch (error) {
        console.error("Error loading user orders:", error);
        toast("Failed to load your orders");
    }
}

function renderUserMenu(filter = "all") {
    const grid = document.getElementById("userMenuGrid");
    if (!grid) return;

    const items = state.items.filter(
        (i) => i.active && (filter === "all" || i.category === filter),
    );
    grid.innerHTML =
        items
            .map(
                (item) => `
    <div class="cake-card">
    <div class="cake-img" style="background-image: url('${item.image}');">
        <span class="cake-badge">${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</span>
      </div>
      <div class="cake-body">
        <div class="cake-name">${item.name}</div>
        <div class="cake-desc">${item.desc}</div>
        <div class="cake-footer">
          <div class="cake-price">${formatINR(item.price)} <small>/${item.unit}</small></div>
          <button class="add-btn" onclick="addToCart('${item.id}')">+ Add</button>
        </div>
      </div>
    </div>
  `,
            )
            .join("") ||
        '<p class="order-muted">No items available.</p>';
}

function filterUserCakes(cat, btn) {
    document
        .querySelectorAll("#userShopTab .filter-btn")
        .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderUserMenu(cat);
}

function showUserTab(tab) {
    document
        .querySelectorAll(".user-tab-btn")
        .forEach((b) => b.classList.remove("active"));
    const activeBtn = document.getElementById("tabBtn" + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (activeBtn) activeBtn.classList.add("active");

    const shopTab = document.getElementById("userShopTab");
    const ordersTab = document.getElementById("userOrdersTab");
    const profileTab = document.getElementById("userProfileTab");
    const customTab = document.getElementById("userCustomTab");

    if (shopTab) shopTab.style.display = "none";
    if (ordersTab) ordersTab.style.display = "none";
    if (profileTab) profileTab.style.display = "none";
    if (customTab) customTab.style.display = "none";

    if (tab === "shop") {
        if (shopTab) shopTab.style.display = "block";
    } else if (tab === "myorders") {
        if (ordersTab) ordersTab.style.display = "block";
        loadUserOrdersFromFirestore();
        loadUserCustomOrdersFromFirestore();
    } else if (tab === "custom") {
        if (customTab) customTab.style.display = "block";
    } else if (tab === "profile") {
        if (profileTab) profileTab.style.display = "block";
        loadProfileSection();
    }
}

function renderUserOrders() {
    const el = document.getElementById("userOrdersList");
    if (!el) return;

    const currentUserIds = state.currentUser
        ? [state.currentUser.id, state.currentUser.uid].filter(Boolean)
        : [];

    const myOrders = state.orders
        .filter((o) => currentUserIds.includes(o.userId))
        .sort((a, b) => {
            const aTs = Date.parse(a.createdAt || "") || 0;
            const bTs = Date.parse(b.createdAt || "") || 0;
            return bTs - aTs;
        });

    if (myOrders.length === 0) {
        el.innerHTML =
            '<p class="order-muted-v">No regular orders yet. Start shopping!</p>';
        return;
    }

    el.innerHTML = myOrders
        .map(
            (o) => `
    <div class="order-card">
      <div>
        <h4>${o.id}</h4>
        <p>${o.items.map((i) => i.name + " × " + i.qty).join(" · ")}</p>
        <p class="order-date">${o.date}</p>
      </div>
    <div class="text-right">
        <div class="order-total">${formatINR(o.total)}</div>
        <span class="status-badge badge-${o.status} order-status">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
        ${o.status === "pending" ? '<p class="order-status-muted">Awaiting confirmation</p>' : ""}
        ${o.status === "accepted" ? '<p class="order-status-sage"><i class="fas fa-check"></i> Confirmed &amp; on the way!</p>' : ""}
        ${o.status === "rejected" ? '<p class="order-status-rose"><i class="fas fa-times"></i> Order was declined</p>' : ""}
      </div>
    </div>
  `,
        )
        .join("");
}

// ========== CUSTOM CAKE ORDERS ==========
async function loadUserCustomOrdersFromFirestore() {
    if (!state.currentUser) return;

    try {
        const possibleIds = [state.currentUser.id, state.currentUser.uid].filter(Boolean);
        let allCustomOrders = [];
        for (const userId of [...new Set(possibleIds)]) {
            const orders = await getUserCustomOrdersFromFirestore(userId);
            allCustomOrders.push(...orders);
        }
        state.customOrders = [...new Map(allCustomOrders.map((o) => [o.id, o])).values()];
        renderUserCustomOrders();
    } catch (error) {
        console.error("Error loading custom orders:", error);
    }
}

function renderUserCustomOrders() {
    const el = document.getElementById("userCustomOrdersList");
    if (!el) return;

    const orders = state.customOrders || [];
    if (orders.length === 0) {
        el.innerHTML = '<p class="order-muted-v">No custom cake requests yet. <a onclick="showUserTab(\'custom\')" style="color:var(--honey-dark);cursor:pointer;font-weight:600;">Submit a custom request →</a></p>';
        return;
    }

    el.innerHTML = orders.map((o) => `
    <div class="order-card custom-order-card">
      <div class="custom-order-icon"><i class="fas fa-pencil-ruler"></i></div>
      <div style="flex:1;">
        <div class="custom-order-tag">Custom Cake Request</div>
        <h4 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--brown);margin:4px 0;">${o.occasion} · ${o.flavor}</h4>
        <p style="font-size:13px;color:var(--text-muted);">${o.weight} · ${o.tiers} tier${o.tiers !== '1' ? 's' : ''} · ${o.dietary}</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">Delivery: ${o.deliveryDate} &nbsp;|&nbsp; Budget: ${o.budget || 'Not specified'}</p>
      </div>
      <div class="text-right">
        <span class="status-badge badge-${o.status} order-status">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
        ${o.status === 'pending' ? '<p class="order-status-muted">Awaiting review</p>' : ''}
        ${o.status === 'accepted' ? '<p class="order-status-sage"><i class="fas fa-check"></i> Approved!</p>' : ''}
        ${o.status === 'rejected' ? '<p class="order-status-rose"><i class="fas fa-times"></i> Request declined</p>' : ''}
        ${o.adminNote ? `<p style="font-size:12px;color:var(--text-muted);margin-top:4px;">Note: ${o.adminNote}</p>` : ''}
      </div>
    </div>
  `).join("");
}

async function submitCustomCakeOrder() {
    if (!state.currentUser) {
        toast("Please log in to submit a custom order");
        return;
    }

    const occasion = document.getElementById("cakeOccasion")?.value;
    const flavor = document.getElementById("cakeFlavor")?.value;
    const weight = document.getElementById("cakeWeight")?.value;
    const tiers = document.getElementById("cakeTiers")?.value;
    const dietary = document.getElementById("cakeDietary")?.value;
    const budget = document.getElementById("cakeBudget")?.value;
    const deliveryDate = document.getElementById("cakeDeliveryDate")?.value;
    const phone = document.getElementById("cakePhone")?.value?.trim();
    const design = document.getElementById("cakeDesign")?.value?.trim();
    const notes = document.getElementById("cakeNotes")?.value?.trim();

    if (!occasion || !flavor || !weight || !deliveryDate || !phone || !design) {
        toast("Please fill all required fields (*)");
        return;
    }

    const btn = document.querySelector(".custom-submit-btn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }

    const customOrder = {
        userId: state.currentUser.uid || state.currentUser.id,
        userName: state.currentUser.name,
        userEmail: state.currentUser.email,
        phone,
        occasion,
        flavor,
        weight,
        tiers,
        dietary,
        budget: budget || "Not specified",
        deliveryDate,
        design,
        notes: notes || "",
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    };

    const result = await createCustomOrderInFirestore(customOrder);

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Custom Request'; }

    if (result.success) {
        toast("Custom request submitted! We'll contact you within 24 hours.");
        // Reset form
        document.getElementById("customCakeForm")?.reset();
        // Switch to My Orders tab to show the request
        showUserTab("myorders");
        const tabBtn = document.getElementById("tabBtnMyorders");
        if (tabBtn) { document.querySelectorAll(".user-tab-btn").forEach(b => b.classList.remove("active")); tabBtn.classList.add("active"); }
    } else {
        toast("Failed to submit: " + (result.error || "Unknown error"));
    }
}

// ========== PROFILE ==========
function loadProfileSection() {
    if (!state.currentUser) return;

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const displayName = document.getElementById("displayName");
    const displayEmail = document.getElementById("displayEmail");
    const displayCity = document.getElementById("displayCity");

    if (profileName) profileName.textContent = state.currentUser.name;
    if (profileEmail) profileEmail.textContent = state.currentUser.email;
    if (displayName) displayName.textContent = state.currentUser.name;
    if (displayEmail) displayEmail.textContent = state.currentUser.email;
    if (displayCity) displayCity.textContent = state.currentUser.city || "—";
}

function openEditProfileModal() {
    const nameInput = document.getElementById("editProfileName");
    const emailInput = document.getElementById("editProfileEmail");
    const cityInput = document.getElementById("editProfileCity");
    const modal = document.getElementById("editProfileModal");

    if (!state.currentUser) return;

    if (nameInput) nameInput.value = state.currentUser.name;
    if (emailInput) emailInput.value = state.currentUser.email;
    if (cityInput) cityInput.value = state.currentUser.city || "";
    if (modal) modal.classList.add("open");
}

function closeEditProfileModal() {
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.classList.remove("open");
}

function saveProfileChanges() {
    if (!state.currentUser) return;

    const nameInput = document.getElementById("editProfileName");
    const emailInput = document.getElementById("editProfileEmail");
    const cityInput = document.getElementById("editProfileCity");

    if (!nameInput || !emailInput || !cityInput) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const city = cityInput.value.trim();

    if (!name || !email || !city) {
        toast("Please fill all fields");
        return;
    }

    // Update current user object
    state.currentUser.name = name;
    state.currentUser.email = email;
    state.currentUser.city = city;

    // Save to localStorage for persistence
    localStorage.setItem("currentUser", JSON.stringify(state.currentUser));

    closeEditProfileModal();
    loadProfileSection();
    toast("Profile updated successfully!");
}

// Initialize user page
document.addEventListener("DOMContentLoaded", function () {
    if (!state.currentUser) {
        window.location.href = "index.html";
        return;
    }
    // Set min date for delivery date input (min 3 days from now)
    const dateInput = document.getElementById("cakeDeliveryDate");
    if (dateInput) {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 3);
        dateInput.min = minDate.toISOString().split("T")[0];
    }
    state.customOrders = [];
    loadUserPage().then(() => {
        // Check if we need to auto-open a tab (e.g. from landing page custom cake CTA)
        const pendingTab = sessionStorage.getItem("openTab");
        if (pendingTab) {
            sessionStorage.removeItem("openTab");
            showUserTab(pendingTab);
            const tabBtn = document.getElementById("tabBtn" + pendingTab.charAt(0).toUpperCase() + pendingTab.slice(1));
            if (tabBtn) { document.querySelectorAll(".user-tab-btn").forEach(b => b.classList.remove("active")); tabBtn.classList.add("active"); }
        }
    });
});

// ========== EXPOSE TO GLOBAL SCOPE ==========
// Make functions accessible from HTML onclick handlers
window.showUserTab = showUserTab;
window.filterUserCakes = filterUserCakes;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveProfileChanges = saveProfileChanges;
window.loadUserPage = loadUserPage;
window.submitCustomCakeOrder = submitCustomCakeOrder;
window.renderUserCustomOrders = renderUserCustomOrders;
