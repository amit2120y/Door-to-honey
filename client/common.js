// Import Firebase functions
import {
    registerUserWithFirebase,
    loginUserWithFirebase,
    loginAdminWithFirebase,
    logoutUserFromFirebase,
    watchAuthState,
    resendVerificationEmail,
    resetPasswordWithFirebase
} from "../server/firebase-auth.js";
import {
    createOrderInFirestore,
    getAllItemsFromFirestore
} from "../server/firebase-db.js";

// ========== SHARED STATE ==========
let state = {
    currentUser: null,
    currentRole: "user",
    selectedRole: "user",
    cart: [],
    editingItemId: null,
    items: [
        {
            id: "i1",
            name: "Honey Almond Dream",
            emoji: "fas fa-birthday-cake",
            image: "images/honey1.jpeg",
            category: "birthday",
            price: 950,
            desc: "Layers of almond sponge with honey cream and roasted almond crunch.",
            bg: "bg1",
            unit: "kg",
            active: true,
        },
        {
            id: "i2",
            name: "Rose Berry Delight",
            emoji: "fas fa-cake-candles",
            image: "images/honey2.jpeg",
            category: "wedding",
            price: 1800,
            desc: "Elegant rose-infused layers with fresh mixed berries and cream.",
            bg: "bg2",
            unit: "kg",
            active: true,
        },
        {
            id: "i3",
            name: "Mango Tango Eggless",
            emoji: "fas fa-icecream",
            image: "images/honey3.jpeg",
            category: "eggless",
            price: 750,
            desc: "Tropical mango layered cake, completely egg-free and absolutely divine.",
            bg: "bg5",
            unit: "kg",
            active: true,
        },
        {
            id: "i4",
            name: "Chocolate Lava Indulgence",
            emoji: "fas fa-heart",
            image: "images/honey1.jpeg",
            category: "special",
            price: 1200,
            desc: "Rich Belgian chocolate with a molten centre — pure indulgence.",
            bg: "bg4",
            unit: "kg",
            active: true,
        },
        {
            id: "i5",
            name: "Pistachio Cloud Cake",
            emoji: "fas fa-leaf",
            image: "images/honey2.jpeg",
            category: "eggless",
            price: 880,
            desc: "Light pistachio sponge with whipped cream and crushed pistachios.",
            bg: "bg3",
            unit: "kg",
            active: true,
        },
        {
            id: "i6",
            name: "Lavender Earl Grey",
            emoji: "fas fa-fan",
            image: "images/honey3.jpeg",
            category: "special",
            price: 1100,
            desc: "Delicate lavender-infused earl grey cake with white chocolate ganache.",
            bg: "bg6",
            unit: "kg",
            active: true,
        },
        {
            id: "i7",
            name: "Classic Vanilla Bliss",
            emoji: "fas fa-star",
            image: "images/honey1.jpeg",
            category: "birthday",
            price: 650,
            desc: "Timeless vanilla bean sponge with silky buttercream frosting.",
            bg: "bg1",
            unit: "kg",
            active: true,
        },
        {
            id: "i8",
            name: "Grand Wedding Tier",
            emoji: "fas fa-ring",
            image: "images/honey2.jpeg",
            category: "wedding",
            price: 4500,
            desc: "Three-tier fondant masterpiece, custom designed for your special day.",
            bg: "bg2",
            unit: "piece",
            active: true,
        },
    ],
    orders: [],
};

// Watch for auth state changes
watchAuthState((user) => {
    if (user) {
        console.log("Admin: madhuluck8412@gmail.com / madhu0099");
        localStorage.setItem("currentUser", JSON.stringify(user));
    } else {
        state.currentUser = null;
        localStorage.removeItem("currentUser");
    }
    console.log("Auth state changed:", user);
});

// Restore user from localStorage on page load
const savedUser = localStorage.getItem("currentUser");
if (savedUser) {
    try {
        state.currentUser = JSON.parse(savedUser);
        console.log("User restored from localStorage:", state.currentUser);
    } catch (e) {
        localStorage.removeItem("currentUser");
    }
}

// ========== UTILS ==========
function toast(msg) {
    const t = document.getElementById("toast");
    if (t) {
        t.textContent = msg;
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), 3000);
    }
}

function genId() {
    return "id" + Date.now() + Math.random().toString(36).slice(2, 6);
}

function formatINR(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
}

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
}

async function syncItemsFromFirestore() {
    try {
        const remoteItems = await getAllItemsFromFirestore();
        if (!Array.isArray(remoteItems) || remoteItems.length === 0) {
            return state.items;
        }

        const getItemSortTimestamp = (item) => {
            const created = Date.parse(item?.createdAt || "") || 0;
            const updated = Date.parse(item?.updatedAt || "") || 0;
            if (created || updated) return Math.max(created, updated);

            const idMatch = String(item?.id || "").match(/^id(\d{10,})/);
            return idMatch ? Number(idMatch[1]) : 0;
        };

        const normalizedRemoteItems = remoteItems.map((item) => ({
            ...item,
            category: (item.category || "special").toLowerCase(),
            unit: item.unit || "kg",
            active: item.active !== false,
            image: item.image || "images/honey1.jpeg",
        }));

        const mergedItems = [...state.items];
        normalizedRemoteItems.forEach((remoteItem) => {
            const existingIndex = mergedItems.findIndex(
                (localItem) =>
                    localItem.id === remoteItem.id ||
                    (localItem.name === remoteItem.name &&
                        Number(localItem.price) === Number(remoteItem.price) &&
                        localItem.desc === remoteItem.desc),
            );

            if (existingIndex === -1) {
                mergedItems.push(remoteItem);
            } else {
                mergedItems[existingIndex] = {
                    ...mergedItems[existingIndex],
                    ...remoteItem,
                };
            }
        });

        state.items = mergedItems.sort(
            (a, b) => getItemSortTimestamp(b) - getItemSortTimestamp(a),
        );
        return state.items;
    } catch (error) {
        console.error("Error syncing items from Firestore:", error);
        return state.items;
    }
}

// ========== AUTH ==========
let selectedRole = "user";

function setRole(r, el) {
    selectedRole = r;
    document
        .querySelectorAll(".role-tab")
        .forEach((t) => t.classList.remove("active"));
    el.classList.add("active");
}

function openModal(mode) {
    const modal = document.getElementById("authModal");
    if (modal) {
        modal.classList.add("open");
        if (mode === "register") showRegister();
        else showLogin();
    }
}

function closeModal() {
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.remove("open");
}

function hideAllAuthViews() {
    const views = ["loginView", "registerView", "verificationSentView", "forgotPasswordView"];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    // Reset forgot password sub-steps
    const step1 = document.getElementById("forgotStep1");
    const step2 = document.getElementById("forgotStep2");
    if (step1) step1.style.display = "block";
    if (step2) step2.style.display = "none";
    // Hide unverified notice
    const notice = document.getElementById("unverifiedNotice");
    if (notice) notice.style.display = "none";
}

function showRegister() {
    hideAllAuthViews();
    const registerView = document.getElementById("registerView");
    if (registerView) registerView.style.display = "block";
}

function showLogin() {
    hideAllAuthViews();
    const loginView = document.getElementById("loginView");
    if (loginView) loginView.style.display = "block";
}

function showVerificationSent() {
    hideAllAuthViews();
    const view = document.getElementById("verificationSentView");
    if (view) view.style.display = "block";
}

function showForgotPassword() {
    hideAllAuthViews();
    const view = document.getElementById("forgotPasswordView");
    if (view) view.style.display = "block";
}

// Store credentials temporarily for resend verification
let _pendingVerifEmail = "";
let _pendingVerifPassword = "";

function handleLogin() {
    const emailEl = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");
    const loginBtn = document.getElementById("loginBtn");

    if (!emailEl || !passwordEl) return;

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
        toast("Please fill all fields");
        return;
    }

    // Hide unverified notice if visible
    const notice = document.getElementById("unverifiedNotice");
    if (notice) notice.style.display = "none";

    if (loginBtn) { loginBtn.disabled = true; loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...'; }

    if (selectedRole === "admin") {
        // Admin login with Firebase
        loginAdminWithFirebase(email, password).then((result) => {
            if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Sign In'; }
            if (result.success) {
                state.currentUser = result.user;
                closeModal();
                toast("Welcome back, Admin!");
                emailEl.value = "";
                passwordEl.value = "";
                setTimeout(() => {
                    window.location.href = "admin.html";
                }, 500);
            } else {
                toast(result.error || "Invalid admin credentials");
            }
        });
        return;
    }

    // User login with Firebase
    loginUserWithFirebase(email, password).then((result) => {
        if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Sign In'; }
        if (result.success && result.user) {
            state.currentUser = result.user;
            closeModal();
            const userName = result.user.name ? result.user.name.split(" ")[0] : "User";
            toast("Welcome back, " + userName + "!");
            emailEl.value = "";
            passwordEl.value = "";
            setTimeout(() => {
                window.location.href = "user.html";
            }, 500);
        } else if (result.emailUnverified) {
            // Show unverified notice with resend button
            _pendingVerifEmail = email;
            _pendingVerifPassword = password;
            if (notice) notice.style.display = "flex";
            toast("Email not verified. Check your inbox.");
        } else {
            toast(result.error || "Invalid email or password");
        }
    });
}

function handleRegister() {
    const nameEl = document.getElementById("regName");
    const emailEl = document.getElementById("regEmail");
    const passwordEl = document.getElementById("regPassword");
    const cityEl = document.getElementById("regCity");
    const registerBtn = document.getElementById("registerBtn");

    if (!nameEl || !emailEl || !passwordEl || !cityEl) return;

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    const city = cityEl.value.trim();

    if (!name || !email || !password || !city) {
        toast("Please fill all fields");
        return;
    }
    if (password.length < 6) {
        toast("Password must be at least 6 characters");
        return;
    }

    if (registerBtn) { registerBtn.disabled = true; registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...'; }

    // Register with Firebase — sends verification email, does NOT log in
    registerUserWithFirebase(name, email, password, city).then((result) => {
        if (registerBtn) { registerBtn.disabled = false; registerBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Create Account'; }
        if (result.success && result.verificationSent) {
            // Show verification sent view
            nameEl.value = "";
            emailEl.value = "";
            passwordEl.value = "";
            cityEl.value = "";
            toast("Verification email sent! Please check your inbox.");
            showVerificationSent();
        } else {
            toast(result.error || "Registration failed");
        }
    });
}

// Resend verification email
function handleResendVerification() {
    if (!_pendingVerifEmail || !_pendingVerifPassword) {
        toast("Please try logging in again");
        return;
    }

    const btn = document.getElementById("resendVerifBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'; }

    resendVerificationEmail(_pendingVerifEmail, _pendingVerifPassword).then((result) => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Resend Verification Email'; }
        if (result.success) {
            toast("Verification email sent! Check your inbox.");
        } else {
            toast(result.error || "Failed to resend verification email");
        }
    });
}

// Forgot password flow
function handleForgotPassword() {
    const emailEl = document.getElementById("forgotEmail");
    const forgotBtn = document.getElementById("forgotBtn");

    if (!emailEl) return;
    const email = emailEl.value.trim();

    if (!email) {
        toast("Please enter your email address");
        return;
    }

    if (forgotBtn) { forgotBtn.disabled = true; forgotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'; }

    resetPasswordWithFirebase(email).then((result) => {
        if (forgotBtn) { forgotBtn.disabled = false; forgotBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link'; }
        if (result.success) {
            // Show success step
            const step1 = document.getElementById("forgotStep1");
            const step2 = document.getElementById("forgotStep2");
            if (step1) step1.style.display = "none";
            if (step2) step2.style.display = "block";
            toast("Password reset link sent!");
        } else {
            toast(result.error || "Failed to send reset link");
        }
    });
}

function logout() {
    logoutUserFromFirebase().then((result) => {
        if (result.success) {
            state.currentUser = null;
            state.cart = [];
            toast("Logged out successfully!");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 500);
        } else {
            toast("Logout failed");
        }
    });
}

// ========== CART ==========
function addToCart(itemId) {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return;
    const existing = state.cart.find((c) => c.id === itemId);
    if (existing) existing.qty++;
    else
        state.cart.push({
            id: itemId,
            name: item.name,
            price: item.price,
            emoji: item.emoji,
            qty: 1,
        });
    updateCartUI();
    toast(item.name + " added to cart!");
}

function updateCartUI() {
    const cartCount = document.getElementById("cartCount");
    const cartTotal = document.getElementById("cartTotal");
    const cartItems = document.getElementById("cartItems");

    if (!cartCount || !cartTotal || !cartItems) return;

    const count = state.cart.reduce((s, c) => s + c.qty, 0);
    cartCount.textContent = count;
    const total = state.cart.reduce((s, c) => s + c.price * c.qty, 0);
    cartTotal.textContent = formatINR(total);

    if (state.cart.length === 0) {
        cartItems.innerHTML =
            '<p class="cart-empty">Your cart is empty</p>';
        return;
    }

    cartItems.innerHTML = state.cart
        .map(
            (c) => `
    <div class="cart-item">
      <div class="cart-item-emoji"><i class="${c.emoji}"></i></div>
    <div class="flex-1">
        <div class="cart-item-name">${c.name}</div>
        <div class="cart-item-price">${formatINR(c.price)} each</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${c.id}',-1)">−</button>
          <span class="qty-val">${c.qty}</span>
          <button class="qty-btn" onclick="changeQty('${c.id}',1)">+</button>
        </div>
      </div>
    <div class="fw-700 honey-dark">${formatINR(c.price * c.qty)}</div>
    </div>
  `,
        )
        .join("");
}

function changeQty(id, delta) {
    const item = state.cart.find((c) => c.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter((c) => c.id !== id);
    updateCartUI();
}

function openCart() {
    const sidebar = document.getElementById("cartSidebar");
    const overlay = document.getElementById("cartOverlay");
    if (sidebar && overlay) {
        sidebar.classList.add("open");
        overlay.classList.add("open");
    }
}

function closeCart() {
    const sidebar = document.getElementById("cartSidebar");
    const overlay = document.getElementById("cartOverlay");
    if (sidebar && overlay) {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
    }
}

function placeOrder() {
    if (state.cart.length === 0) {
        toast("Your cart is empty!");
        return;
    }
    if (!state.currentUser) {
        toast("Please login first");
        return;
    }

    const total = state.cart.reduce((s, c) => s + c.price * c.qty, 0);
    const order = {
        userId: state.currentUser.uid || state.currentUser.id,
        userName: state.currentUser.name,
        items: state.cart.map((c) => ({
            name: c.name,
            qty: c.qty,
            price: c.price,
        })),
        total,
        date: new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }),
        status: "pending",
    };

    // Save order to Firestore
    createOrderInFirestore(order).then((result) => {
        if (result.success) {
            state.cart = [];
            updateCartUI();
            closeCart();
            toast("Order placed successfully! Order ID: " + result.id);
        } else {
            toast("Failed to place order: " + result.error);
        }
    });
}

// Hint credentials
console.log("Admin: madhuluck8414@gmail.com / madhu0099");
console.log("User: user@honey.com / 123456");

// ========== EXPOSE TO GLOBAL SCOPE ==========
// Make functions accessible from HTML onclick handlers and other modules
window.state = state;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeCart = closeCart;
window.openCart = openCart;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.placeOrder = placeOrder;
window.formatINR = formatINR;
window.scrollToSection = scrollToSection;
window.setRole = setRole;
window.showRegister = showRegister;
window.showLogin = showLogin;
window.showForgotPassword = showForgotPassword;
window.showVerificationSent = showVerificationSent;
window.handleResendVerification = handleResendVerification;
window.handleForgotPassword = handleForgotPassword;
window.updateCartUI = updateCartUI;
window.toast = toast;
window.genId = genId;
window.syncItemsFromFirestore = syncItemsFromFirestore;

// ========== RESPONSIVE NAV INIT ==========
function initResponsiveNav() {
    const navToggle = document.getElementById("navToggle");
    const navLinks = document.querySelector(".nav-links");
    if (!navToggle || !navLinks) return;

    const closeNav = () => {
        navLinks.classList.remove("open");
        document.body.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
        const icon = navToggle.querySelector("i");
        if (icon) icon.className = "fas fa-bars";
    };

    navToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = navLinks.classList.toggle("open");
        document.body.classList.toggle("nav-open", open);
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        const icon = navToggle.querySelector("i");
        if (icon) icon.className = open ? "fas fa-times" : "fas fa-bars";
    });

    // Close when clicking a link
    navLinks.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", closeNav),
    );

    // Close on outside click
    document.addEventListener("click", (e) => {
        if (!navLinks.classList.contains("open")) return;
        if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
            closeNav();
        }
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && navLinks.classList.contains("open")) {
            closeNav();
        }
    });

    // Close on window resize above mobile breakpoint
    window.addEventListener("resize", () => {
        if (window.innerWidth > 900 && navLinks.classList.contains("open")) {
            closeNav();
        }
    });
}

document.addEventListener("DOMContentLoaded", initResponsiveNav);

// ========== ADMIN NAV (MOBILE TOGGLE) ==========
function initAdminNav() {
    const adminToggle = document.getElementById("adminNavToggle");
    const adminButtons = document.querySelector(".admin-nav-buttons");
    const adminSidebar = document.querySelector(".admin-sidebar");
    if (!adminToggle || !adminButtons || !adminSidebar) return;

    console.log("initAdminNav: elements found", { adminToggle, adminButtons, adminSidebar });
    // Ensure icon reflects current open state on load
    const isOpenOnLoad = adminSidebar.classList.contains("open");
    adminToggle.setAttribute("aria-expanded", isOpenOnLoad ? "true" : "false");
    const initialIcon = adminToggle.querySelector("i");
    if (initialIcon) initialIcon.className = isOpenOnLoad ? "fas fa-times" : "fas fa-bars";

    adminToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = adminSidebar.classList.toggle("open");
        adminToggle.setAttribute("aria-expanded", open ? "true" : "false");
        const icon = adminToggle.querySelector("i");
        if (icon) icon.className = open ? "fas fa-times" : "fas fa-bars";
        console.log("adminToggle clicked, open:", open);
    });

    // Close when clicking a nav button
    adminButtons.querySelectorAll("button, a").forEach((el) =>
        el.addEventListener("click", () => {
            adminSidebar.classList.remove("open");
            adminToggle.setAttribute("aria-expanded", "false");
            const icon = adminToggle.querySelector("i");
            if (icon) icon.className = "fas fa-bars";
        }),
    );

    // Close on outside click
    document.addEventListener("click", (e) => {
        if (!adminSidebar.classList.contains("open")) return;
        if (!adminSidebar.contains(e.target) && !adminToggle.contains(e.target)) {
            adminSidebar.classList.remove("open");
            adminToggle.setAttribute("aria-expanded", "false");
            const icon = adminToggle.querySelector("i");
            if (icon) icon.className = "fas fa-bars";
        }
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && adminSidebar.classList.contains("open")) {
            adminSidebar.classList.remove("open");
            adminToggle.setAttribute("aria-expanded", "false");
            const icon = adminToggle.querySelector("i");
            if (icon) icon.className = "fas fa-bars";
        }
    });
}

document.addEventListener("DOMContentLoaded", initAdminNav);

// ========== EXPORT FOR ES6 MODULES ==========
// Export functions for other modules like landing.js to import
export {
    state,
    openModal,
    closeModal,
    closeCart,
    openCart,
    handleLogin,
    handleRegister,
    logout,
    addToCart,
    changeQty,
    placeOrder,
    formatINR,
    scrollToSection,
    setRole,
    showRegister,
    showLogin,
    showForgotPassword,
    showVerificationSent,
    handleResendVerification,
    handleForgotPassword,
    updateCartUI,
    toast,
    genId,
    syncItemsFromFirestore
};
