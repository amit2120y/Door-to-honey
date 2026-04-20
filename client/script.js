// ========== STATE ==========
let state = {
    currentUser: null,
    currentRole: "user",
    selectedRole: "user",
    cart: [],
    editingItemId: null,
    users: [
        {
            id: "u1",
            name: "Priya Sharma",
            email: "user@honey.com",
            password: "123456",
            city: "Jaipur",
            role: "user",
        },
    ],
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
            if(email === "madhuluck8412@gmail.com" && password === "madhu0099") {
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
    orders: [
        {
            id: "ORD001",
            userId: "u1",
            userName: "Priya Sharma",
            items: [{ name: "Honey Almond Dream", qty: 1, price: 950 }],
            total: 950,
            date: "12 Apr 2025",
            status: "accepted",
        },
        {
            id: "ORD002",
            userId: "u1",
            userName: "Priya Sharma",
            items: [{ name: "Rose Berry Delight", qty: 1, price: 1800 }],
            total: 1800,
            date: "10 Apr 2025",
            status: "pending",
        },
    ],
};

// ========== UTILS ==========
function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
}
function genId() {
    return "id" + Date.now() + Math.random().toString(36).slice(2, 6);
}
function formatINR(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
}

// ========== PAGES ==========
function showPage(id) {
    document
        .querySelectorAll(".page")
        .forEach((p) => p.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    document.getElementById("mainNav").style.display =
        id === "landing" ? "flex" : "none";
    window.scrollTo(0, 0);
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
    document.getElementById("authModal").classList.add("open");
    if (mode === "register") showRegister();
    else showLogin();
}
function closeModal() {
    document.getElementById("authModal").classList.remove("open");
}
function showRegister() {
    document.getElementById("loginView").style.display = "none";
    document.getElementById("registerView").style.display = "block";
}
function showLogin() {
    document.getElementById("loginView").style.display = "block";
    document.getElementById("registerView").style.display = "none";
}

function handleLogin() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    if (!email || !password) {
        toast("Please fill all fields");
        return;
    }

    if (selectedRole === "admin") {
        if (email === "madhuluck8414@gmail.com" && password === "madhu0099") {
            state.currentUser = { name: "Admin", email, role: "admin" };
            closeModal();
            toast("Welcome back, Admin!");
            loadAdminPage();
            showPage("admin-page");
        } else {
            toast("Invalid admin credentials");
        }
        return;
    }

    const user = state.users.find(
        (u) => u.email === email && u.password === password && u.role === "user",
    );
    if (user) {
        state.currentUser = user;
        closeModal();
        toast("Welcome back, " + user.name.split(" ")[0] + "!");
        loadUserPage();
        showPage("user-page");
    } else {
        toast("Invalid email or password");
    }
}

function handleRegister() {
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const city = document.getElementById("regCity").value.trim();
    if (!name || !email || !password || !city) {
        toast("Please fill all fields");
        return;
    }
    if (password.length < 6) {
        toast("Password must be at least 6 characters");
        return;
    }
    if (state.users.find((u) => u.email === email)) {
        toast("Email already registered");
        return;
    }
    const user = { id: genId(), name, email, password, city, role: "user" };
    state.users.push(user);
    state.currentUser = user;
    closeModal();
    toast("Account created! Welcome " + name.split(" ")[0] + "!");
    loadUserPage();
    showPage("user-page");
}

function logout() {
    state.currentUser = null;
    state.cart = [];
    updateCartUI();
    showPage("landing");
    toast("Logged out successfully!");
}

// ========== LANDING MENU ==========
function renderLandingMenu(filter = "all") {
    const grid = document.getElementById("menuGrid");
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
        '<p class="order-muted">No items in this category yet.</p>';
}
function filterCakes(cat, btn) {
    document
        .querySelectorAll("#menu-section .filter-btn")
        .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderLandingMenu(cat);
}
renderLandingMenu();

// ========== ADMIN PAGE ==========
function loadAdminPage() {
    updateAdminStats();
    renderAdminItems();
    renderAdminOrders();
}

function updateAdminStats() {
    document.getElementById("statItems").textContent = state.items.filter(
        (i) => i.active,
    ).length;
    document.getElementById("statOrders").textContent = state.orders.length;
    document.getElementById("statPending").textContent = state.orders.filter(
        (o) => o.status === "pending",
    ).length;
    const rev = state.orders
        .filter((o) => o.status === "accepted")
        .reduce((s, o) => s + o.total, 0);
    document.getElementById("statRevenue").textContent = formatINR(rev);
    renderDashOrders();
}

function renderDashOrders() {
    const tbody = document.getElementById("dashOrdersTable");
    const recent = [...state.orders].reverse().slice(0, 5);
    tbody.innerHTML =
        recent
            .map(
                (o) => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.userName}</td>
      <td>${o.items.map((i) => i.name).join(", ")}</td>
      <td><strong>${formatINR(o.total)}</strong></td>
      <td><span class="status-badge badge-${o.status}">${o.status}</span></td>
      <td>${o.status === "pending" ? `<button class="action-btn btn-accept" onclick="updateOrderStatus('${o.id}','accepted')">Accept</button><button class="action-btn btn-reject" onclick="updateOrderStatus('${o.id}','rejected')">Reject</button>` : "—"}</td>
    </tr>
  `,
            )
            .join("") ||
        '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">No orders yet</td></tr>';
}

function renderAdminItems() {
    const tbody = document.getElementById("adminItemsTable");
    tbody.innerHTML =
        state.items
            .map(
                (item) => `
    <tr>
      <td><img src="${item.image}" alt="${item.name}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;"></td>
      <td><strong>${item.name}</strong></td>
      <td style="text-transform:capitalize;">${item.category}</td>
      <td><strong>${formatINR(item.price)}</strong> <span style="color:var(--text-muted);font-size:12px;">/${item.unit}</span></td>
      <td><span class="status-badge ${item.active ? "badge-instock" : "badge-rejected"}">${item.active ? "Active" : "Inactive"}</span></td>
      <td>
        <button class="action-btn btn-edit" onclick="editItem('${item.id}')">Edit</button>
        <button class="action-btn btn-delete" onclick="deleteItem('${item.id}')">${item.active ? "Deactivate" : "Activate"}</button>
      </td>
    </tr>
  `,
            )
            .join("") ||
        '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">No items yet</td></tr>';
}

function renderAdminOrders() {
    const tbody = document.getElementById("adminOrdersTable");
    tbody.innerHTML =
        [...state.orders]
            .reverse()
            .map(
                (o) => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.userName}</td>
      <td>${o.items.map((i) => i.name + " x" + i.qty).join(", ")}</td>
      <td><strong>${formatINR(o.total)}</strong></td>
      <td>${o.date}</td>
      <td><span class="status-badge badge-${o.status}">${o.status}</span></td>
      <td>${o.status === "pending" ? `<button class="action-btn btn-accept" onclick="updateOrderStatus('${o.id}','accepted')">Accept</button><button class="action-btn btn-reject" onclick="updateOrderStatus('${o.id}','rejected')">Reject</button>` : "—"}</td>
    </tr>
  `,
            )
            .join("") ||
        '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;">No orders yet</td></tr>';
}

function updateOrderStatus(id, status) {
    const order = state.orders.find((o) => o.id === id);
    if (order) {
        order.status = status;
        toast("Order " + id + " " + status + "!");
        loadAdminPage();
    }
}

function showAdminTab(tab) {
    document
        .querySelectorAll(".admin-tab")
        .forEach((t) => t.classList.remove("active"));
    document.getElementById("tab-" + tab).classList.add("active");
    document
        .querySelectorAll(".sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
    const titles = {
        dashboard: "Dashboard",
        items: "Manage Items",
        add: "Add New Item",
        orders: "Orders",
    };
    document.getElementById("adminTabTitle").textContent = titles[tab];
}

function saveItem() {
    const name = document.getElementById("itemName").value.trim();
    const emoji = document.getElementById("itemEmoji").value.trim() || "fas fa-birthday-cake";
    const category = document.getElementById("itemCategory").value;
    const price = parseInt(document.getElementById("itemPrice").value);
    const desc = document.getElementById("itemDesc").value.trim();
    const bg = document.getElementById("itemBg").value;
    const unit = document.getElementById("itemUnit").value;
    if (!name || !price || !desc) {
        toast("Please fill all required fields");
        return;
    }

    if (state.editingItemId) {
        const item = state.items.find((i) => i.id === state.editingItemId);
        Object.assign(item, { name, emoji, category, price, desc, bg, unit });
        toast("Item updated successfully! ✓");
        cancelEdit();
    } else {
        state.items.push({
            id: genId(),
            name,
            emoji,
            category,
            price,
            desc,
            bg,
            unit,
            active: true,
        });
        toast("Item added successfully! ✓");
        document.getElementById("itemName").value = "";
        document.getElementById("itemEmoji").value = "";
        document.getElementById("itemPrice").value = "";
        document.getElementById("itemDesc").value = "";
    }
    renderAdminItems();
    renderLandingMenu();
    updateAdminStats();
}

function editItem(id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    state.editingItemId = id;
    document.getElementById("itemName").value = item.name;
    document.getElementById("itemEmoji").value = item.emoji;
    document.getElementById("itemCategory").value = item.category;
    document.getElementById("itemPrice").value = item.price;
    document.getElementById("itemDesc").value = item.desc;
    document.getElementById("itemBg").value = item.bg;
    document.getElementById("itemUnit").value = item.unit;
    document.getElementById("addItemTitle").textContent = "Edit Item";
    document.getElementById("saveItemBtn").textContent = "Save Changes ✓";
    document.getElementById("cancelEditBtn").style.display = "inline-block";
    showAdminTab("add");
    event.stopPropagation();
    document
        .querySelectorAll(".sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".sidebar-btn")[2].classList.add("active");
}

function cancelEdit() {
    state.editingItemId = null;
    document.getElementById("itemName").value = "";
    document.getElementById("itemEmoji").value = "";
    document.getElementById("itemPrice").value = "";
    document.getElementById("itemDesc").value = "";
    document.getElementById("addItemTitle").textContent = "Add New Item";
    document.getElementById("saveItemBtn").textContent = "Add Item ✓";
    document.getElementById("cancelEditBtn").style.display = "none";
}

function deleteItem(id) {
    const item = state.items.find((i) => i.id === id);
    if (item) {
        item.active = !item.active;
        toast(item.active ? "Item activated!" : "Item deactivated!");
        renderAdminItems();
        renderLandingMenu();
        updateAdminStats();
    }
}

// ========== USER PAGE ==========
function loadUserPage() {
    document.getElementById("userGreet").textContent =
        "Hello, " + state.currentUser.name.split(" ")[0] + "! 👋";
    renderUserMenu();
    updateCartUI();
    renderUserOrders();
}

function renderUserMenu(filter = "all") {
    const grid = document.getElementById("userMenuGrid");
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
        '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px;">No items available.</p>';
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
    event.currentTarget.classList.add("active");
    if (tab === "shop") {
        document.getElementById("userShopTab").style.display = "block";
        document.getElementById("userOrdersTab").style.display = "none";
        document.getElementById("userProfileTab").style.display = "none";
    } else if (tab === "myorders") {
        document.getElementById("userShopTab").style.display = "none";
        document.getElementById("userOrdersTab").style.display = "block";
        document.getElementById("userProfileTab").style.display = "none";
        renderUserOrders();
    } else if (tab === "profile") {
        document.getElementById("userShopTab").style.display = "none";
        document.getElementById("userOrdersTab").style.display = "none";
        document.getElementById("userProfileTab").style.display = "block";
        loadProfileSection();
    }
}

// ========== PROFILE ==========
function loadProfileSection() {
    document.getElementById("profileName").textContent = state.currentUser.name;
    document.getElementById("profileEmail").textContent = state.currentUser.email;
    document.getElementById("displayName").textContent = state.currentUser.name;
    document.getElementById("displayEmail").textContent = state.currentUser.email;
    document.getElementById("displayCity").textContent = state.currentUser.city || "—";
}

function openEditProfileModal() {
    document.getElementById("editProfileName").value = state.currentUser.name;
    document.getElementById("editProfileEmail").value = state.currentUser.email;
    document.getElementById("editProfileCity").value = state.currentUser.city || "";
    document.getElementById("editProfileModal").classList.add("open");
}

function closeEditProfileModal() {
    document.getElementById("editProfileModal").classList.remove("open");
}

function saveProfileChanges() {
    const name = document.getElementById("editProfileName").value.trim();
    const email = document.getElementById("editProfileEmail").value.trim();
    const city = document.getElementById("editProfileCity").value.trim();

    if (!name || !email || !city) {
        toast("Please fill all fields");
        return;
    }

    if (email !== state.currentUser.email && state.users.find((u) => u.email === email)) {
        toast("Email already in use");
        return;
    }

    state.currentUser.name = name;
    state.currentUser.email = email;
    state.currentUser.city = city;

    const userIndex = state.users.findIndex((u) => u.id === state.currentUser.id);
    if (userIndex !== -1) {
        state.users[userIndex] = state.currentUser;
    }

    closeEditProfileModal();
    loadProfileSection();
    toast("Profile updated successfully!");
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
    const count = state.cart.reduce((s, c) => s + c.qty, 0);
    document.getElementById("cartCount").textContent = count;
    const total = state.cart.reduce((s, c) => s + c.price * c.qty, 0);
    document.getElementById("cartTotal").textContent = formatINR(total);
    const el = document.getElementById("cartItems");
    if (state.cart.length === 0) {
        el.innerHTML =
            '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">Your cart is empty</p>';
        return;
    }
    el.innerHTML = state.cart
        .map(
            (c) => `
    <div class="cart-item">
      <div class="cart-item-emoji"><i class="${c.emoji}"></i></div>
      <div style="flex:1;">
        <div class="cart-item-name">${c.name}</div>
        <div class="cart-item-price">${formatINR(c.price)} each</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${c.id}',-1)">−</button>
          <span class="qty-val">${c.qty}</span>
          <button class="qty-btn" onclick="changeQty('${c.id}',1)">+</button>
        </div>
      </div>
      <div style="font-weight:700;color:var(--honey-dark);">${formatINR(c.price * c.qty)}</div>
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
    document.getElementById("cartSidebar").classList.add("open");
    document.getElementById("cartOverlay").classList.add("open");
}
function closeCart() {
    document.getElementById("cartSidebar").classList.remove("open");
    document.getElementById("cartOverlay").classList.remove("open");
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
        id: "ORD" + String(state.orders.length + 1).padStart(3, "0"),
        userId: state.currentUser.id,
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
    state.orders.push(order);
    state.cart = [];
    updateCartUI();
    closeCart();
    toast("Order placed! Awaiting confirmation.");
    renderUserOrders();
}

function renderUserOrders() {
    const el = document.getElementById("userOrdersList");
    const myOrders = state.orders
        .filter((o) => state.currentUser && o.userId === state.currentUser.id)
        .reverse();
    if (myOrders.length === 0) {
        el.innerHTML =
            '<p style="color:var(--text-muted);padding:40px 0;">No orders yet. Start shopping!</p>';
        return;
    }
    el.innerHTML = myOrders
        .map(
            (o) => `
    <div class="order-card">
      <div>
        <h4>${o.id}</h4>
        <p>${o.items.map((i) => i.name + " × " + i.qty).join(" · ")}</p>
        <p style="margin-top:6px;font-size:12px;">${o.date}</p>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Playfair Display',serif;font-size:22px;color:var(--honey-dark);font-weight:700;">${formatINR(o.total)}</div>
        <span class="status-badge badge-${o.status}" style="margin-top:8px;display:inline-block;">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
        ${o.status === "pending" ? '<p style="font-size:11px;color:var(--text-muted);margin-top:6px;">Awaiting confirmation</p>' : ""}
        ${o.status === "accepted" ? '<p style="font-size:11px;color:var(--sage);margin-top:6px;"><i class="fas fa-check"></i> Confirmed & on the way!</p>' : ""}
        ${o.status === "rejected" ? '<p style="font-size:11px;color:var(--rose);margin-top:6px;"><i class="fas fa-times"></i> Order was declined</p>' : ""}
      </div>
    </div>
  `,
        )
        .join("");
}

// ========== HELPERS ==========
function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: "smooth" });
}

// Scroll reveal
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

// Hint credentials
console.log("Admin: madhuluck8414@gmail.com / madhu0099");
console.log("User: user@honey.com / 123456");
