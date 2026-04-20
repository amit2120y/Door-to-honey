// Import shared functions from common.js
import { state, updateCartUI, formatINR, logout, toast, syncItemsFromFirestore } from "./common.js";
import {
    updateOrderStatusInFirestore,
    addItemToFirestore,
    getAllCustomOrdersFromFirestore,
    updateCustomOrderStatusInFirestore,
} from "../server/firebase-db.js";
import { getDocs, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "../server/firebase-config.js";

// ========== ADMIN PAGE ==========

async function loadAdminPage() {
    if (!state.currentUser || state.currentUser.role !== "admin") {
        window.location.href = "index.html";
        return;
    }

    await syncItemsFromFirestore();

    // Load all orders from Firestore FIRST
    await loadAllOrdersFromFirestore();
    await loadAdminCustomOrders();
    updateAdminStats();
    renderAdminItems();
    renderAdminOrders();
}

async function loadAllOrdersFromFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        state.orders = [];
        querySnapshot.forEach((doc) => {
            state.orders.push({ id: doc.id, ...doc.data() });
        });
        console.log("Loaded orders from Firestore:", state.orders);
    } catch (error) {
        console.error("Error loading orders from Firestore:", error);
    }
}

function updateAdminStats() {
    const statItems = document.getElementById("statItems");
    const statOrders = document.getElementById("statOrders");
    const statPending = document.getElementById("statPending");
    const statRevenue = document.getElementById("statRevenue");

    if (statItems) {
        statItems.textContent = state.items.filter((i) => i.active).length;
    }
    if (statOrders) {
        statOrders.textContent = state.orders.length;
    }
    if (statPending) {
        statPending.textContent = state.orders.filter((o) => o.status === "pending").length;
    }
    if (statRevenue) {
        const rev = state.orders
            .filter((o) => o.status === "accepted")
            .reduce((s, o) => s + o.total, 0);
        statRevenue.textContent = formatINR(rev);
    }
    renderDashOrders();
}

function renderDashOrders() {
    const tbody = document.getElementById("dashOrdersTable");
    if (!tbody) return;

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
        '<tr><td colspan="6" class="td-center-muted">No orders yet</td></tr>';
}

function renderAdminItems() {
    const tbody = document.getElementById("adminItemsTable");
    if (!tbody) return;

    tbody.innerHTML =
        state.items
            .map(
                (item) => `
    <tr>
    <td><img src="${item.image}" alt="${item.name}" class="img-40"></td>
      <td><strong>${item.name}</strong></td>
    <td class="capitalize">${item.category}</td>
    <td><strong>${formatINR(item.price)}</strong> <span class="unit-muted">/${item.unit}</span></td>
      <td><span class="status-badge ${item.active ? "badge-instock" : "badge-rejected"}">${item.active ? "Active" : "Inactive"}</span></td>
      <td>
        <button class="action-btn btn-edit" onclick="editItem('${item.id}')">Edit</button>
        <button class="action-btn btn-delete" onclick="deleteItem('${item.id}')">${item.active ? "Deactivate" : "Activate"}</button>
      </td>
    </tr>
  `,
            )
            .join("") ||
        '<tr><td colspan="6" class="td-center-muted">No items yet</td></tr>';
}

function renderAdminOrders() {
    const tbody = document.getElementById("adminOrdersTable");
    if (!tbody) return;

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
        '<tr><td colspan="7" class="td-center-muted">No orders yet</td></tr>';
}

function updateOrderStatus(id, status) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) {
        toast("Order not found");
        return;
    }

    const previousStatus = order.status;
    order.status = status;
    renderAdminOrders();
    renderDashOrders();

    updateOrderStatusInFirestore(id, status)
        .then((result) => {
            if (result.success) {
                toast(`Order ${id} marked as ${status}`);
                updateAdminStats();
                loadAdminPage();
            } else {
                order.status = previousStatus;
                renderAdminOrders();
                renderDashOrders();
                toast("Failed to update order: " + result.error);
            }
        })
        .catch((error) => {
            order.status = previousStatus;
            renderAdminOrders();
            renderDashOrders();
            toast("Failed to update order: " + error.message);
            console.error("Error updating order status:", error);
        });
}

function showAdminTab(tab) {
    document
        .querySelectorAll(".admin-tab")
        .forEach((t) => t.classList.remove("active"));

    const tabEl = document.getElementById("tab-" + tab);
    if (tabEl) tabEl.classList.add("active");

    document
        .querySelectorAll(".sidebar-btn")
        .forEach((b) => b.classList.remove("active"));

    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }

    const adminTitle = document.getElementById("adminTabTitle");
    const titles = {
        dashboard: "Dashboard",
        items: "Manage Items",
        add: "Add New Item",
        orders: "Orders",
        custom: "Custom Requests",
    };

    if (adminTitle) {
        adminTitle.textContent = titles[tab] || "Dashboard";
    }

    if (tab === "custom") {
        loadAdminCustomOrders();
    }
}

function setSaveButtonLoading(loading) {
    const btnEl = document.getElementById("saveItemBtn");
    if (!btnEl) return;

    if (loading) {
        btnEl.disabled = true;
        btnEl.dataset.originalText = btnEl.textContent;
        btnEl.textContent = "Saving...";
    } else {
        btnEl.disabled = false;
        btnEl.textContent = btnEl.dataset.originalText || "Add Item ✓";
    }
}

function clearAddItemForm() {
    const nameEl = document.getElementById("itemName");
    const imageEl = document.getElementById("itemImage");
    const priceEl = document.getElementById("itemPrice");
    const descEl = document.getElementById("itemDesc");
    const preview = document.getElementById("imagePreview");

    if (nameEl) nameEl.value = "";
    if (imageEl) imageEl.value = "";
    if (priceEl) priceEl.value = "";
    if (descEl) descEl.value = "";
    if (preview) preview.style.display = "none";
}

function convertImageToBase64(file, options = {}) {
    const maxWidth = options.maxWidth || 900;
    const maxHeight = options.maxHeight || 900;
    const maxChars = options.maxChars || 650000;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
                const width = Math.max(1, Math.floor(img.width * ratio));
                const height = Math.max(1, Math.floor(img.height * ratio));

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not process image"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.8;
                let dataUrl = canvas.toDataURL("image/jpeg", quality);

                while (dataUrl.length > maxChars && quality > 0.45) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL("image/jpeg", quality);
                }

                if (dataUrl.length > maxChars) {
                    reject(new Error("Image too large even after compression. Please choose a smaller image."));
                    return;
                }

                resolve(dataUrl);
            };

            img.onerror = () => reject(new Error("Invalid image file"));
            img.src = reader.result;
        };

        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
    });
}

async function saveItem() {
    const nameEl = document.getElementById("itemName");
    const imageEl = document.getElementById("itemImage");
    const categoryEl = document.getElementById("itemCategory");
    const priceEl = document.getElementById("itemPrice");
    const descEl = document.getElementById("itemDesc");
    const bgEl = document.getElementById("itemBg");
    const unitEl = document.getElementById("itemUnit");

    if (!nameEl || !categoryEl || !priceEl || !descEl) return;

    const name = nameEl.value.trim();
    const category = String(categoryEl.value || "").toLowerCase();
    const price = parseInt(priceEl.value);
    const desc = descEl.value.trim();
    const bg = bgEl ? bgEl.value : "bg1";
    const unit = unitEl ? unitEl.value : "kg";

    if (!name || !price || !desc) {
        toast("Please fill all required fields");
        return;
    }

    setSaveButtonLoading(true);

    try {
        if (state.editingItemId) {
            // Edit existing item
            const item = state.items.find((i) => i.id === state.editingItemId);
            if (item) {
                Object.assign(item, { name, category, price, desc, bg, unit });
                toast("Item updated successfully! ✓");
                cancelEdit();
                renderAdminItems();
                updateAdminStats();
            }
            return;
        }

        let imageUrl = "images/honey1.jpeg";
        let imageSource = "default";
        if (imageEl && imageEl.files.length > 0) {
            const file = imageEl.files[0];
            toast("Processing image...");

            try {
                imageUrl = await convertImageToBase64(file);
                imageSource = "base64";
            } catch (base64Error) {
                console.error("Base64 conversion failed:", base64Error);
                toast(base64Error.message || "Image processing failed. Using default image.");
            }
        }

        const newItem = {
            id: "id" + Date.now() + Math.random().toString(36).slice(2, 6),
            name,
            category,
            price,
            desc,
            image: imageUrl,
            imageSource,
            bg,
            unit,
            active: true,
            createdAt: new Date().toISOString(),
        };

        // Persist new item in Firestore
        const dbResult = await addItemToFirestore(newItem);
        if (dbResult.success && dbResult.id) {
            newItem.id = dbResult.id;
        } else {
            throw new Error(dbResult.error || "Database sync failed");
        }

        state.items.unshift(newItem);
        clearAddItemForm();
        renderAdminItems();
        updateAdminStats();
        toast("Item added successfully! ✓");
    } catch (error) {
        console.error("Error saving item:", error);
        toast("Failed to save item: " + error.message);
    } finally {
        setSaveButtonLoading(false);
    }
}

function editItem(id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;

    state.editingItemId = id;

    const nameEl = document.getElementById("itemName");
    const emojiEl = document.getElementById("itemEmoji");
    const categoryEl = document.getElementById("itemCategory");
    const priceEl = document.getElementById("itemPrice");
    const descEl = document.getElementById("itemDesc");
    const bgEl = document.getElementById("itemBg");
    const unitEl = document.getElementById("itemUnit");
    const titleEl = document.getElementById("addItemTitle");
    const btnEl = document.getElementById("saveItemBtn");
    const cancelEl = document.getElementById("cancelEditBtn");

    if (nameEl) nameEl.value = item.name;
    if (emojiEl) emojiEl.value = item.emoji;
    if (categoryEl) categoryEl.value = item.category;
    if (priceEl) priceEl.value = item.price;
    if (descEl) descEl.value = item.desc;
    if (bgEl) bgEl.value = item.bg;
    if (unitEl) unitEl.value = item.unit;

    if (titleEl) titleEl.textContent = "Edit Item";
    if (btnEl) btnEl.textContent = "Save Changes ✓";
    if (cancelEl) cancelEl.style.display = "inline-block";

    showAdminTab("add");
    if (event) event.stopPropagation();

    document
        .querySelectorAll(".sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
    const btns = document.querySelectorAll(".sidebar-btn");
    if (btns.length > 2) btns[2].classList.add("active");
}

function cancelEdit() {
    state.editingItemId = null;

    const nameEl = document.getElementById("itemName");
    const imageEl = document.getElementById("itemImage");
    const priceEl = document.getElementById("itemPrice");
    const descEl = document.getElementById("itemDesc");
    const titleEl = document.getElementById("addItemTitle");
    const btnEl = document.getElementById("saveItemBtn");
    const cancelEl = document.getElementById("cancelEditBtn");

    if (nameEl) nameEl.value = "";
    if (imageEl) imageEl.value = "";
    if (priceEl) priceEl.value = "";
    if (descEl) descEl.value = "";

    if (titleEl) titleEl.textContent = "Add New Item";
    if (btnEl) btnEl.textContent = "Add Item ✓";
    if (cancelEl) cancelEl.style.display = "none";
}

function deleteItem(id) {
    const item = state.items.find((i) => i.id === id);
    if (item) {
        item.active = !item.active;
        toast(item.active ? "Item activated!" : "Item deactivated!");
        renderAdminItems();
        updateAdminStats();
    }
}

// ========== DRAG & DROP IMAGE UPLOAD ==========
function setupDragDropZone() {
    const dragDropZone = document.getElementById("dragDropZone");
    const fileInput = document.getElementById("itemImage");
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");

    if (!dragDropZone || !fileInput) return;

    // Click to open file dialog
    dragDropZone.addEventListener("click", () => fileInput.click());

    // Drag over
    dragDropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDropZone.style.borderColor = "var(--honey)";
        dragDropZone.style.background = "white";
    });

    // Drag leave
    dragDropZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDropZone.style.borderColor = "var(--border)";
        dragDropZone.style.background = "var(--cream)";
    });

    // Drop
    dragDropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDropZone.style.borderColor = "var(--border)";
        dragDropZone.style.background = "var(--cream)";

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith("image/")) {
                fileInput.files = files;
                showImagePreview(file);
            } else {
                toast("Please drop an image file");
            }
        }
    });

    // File input change
    fileInput.addEventListener("change", (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast("File size exceeds 5MB");
                fileInput.value = "";
                return;
            }

            showImagePreview(file);
        }
    });
}

function showImagePreview(file) {
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");

    if (!imagePreview || !previewImg) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        imagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
}

// Initialize admin page
document.addEventListener("DOMContentLoaded", function () {
    loadAdminPage();
    setupDragDropZone();
});

// ========== CUSTOM CAKE ORDERS (ADMIN) ==========
async function loadAdminCustomOrders() {
    state.customOrders = state.customOrders || [];
    try {
        const orders = await getAllCustomOrdersFromFirestore();
        state.customOrders = orders;
        renderAdminCustomOrders();
    } catch (error) {
        console.error("Error loading custom orders:", error);
        toast("Failed to load custom orders");
    }
}

function renderAdminCustomOrders() {
    const tbody = document.getElementById("adminCustomOrdersTable");
    if (!tbody) return;

    const orders = state.customOrders || [];
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="admin-table-td-center">No custom cake requests yet.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map((o) => `
    <tr>
      <td><strong style="font-size:11px;color:var(--text-muted);">${o.id.slice(0,10)}...</strong></td>
      <td>
        <strong>${o.userName}</strong><br>
        <span style="font-size:12px;color:var(--text-muted);">${o.phone}</span>
      </td>
      <td>${o.occasion}</td>
      <td>${o.flavor}</td>
      <td>${o.weight} · ${o.tiers}T · ${o.dietary}</td>
      <td>${o.deliveryDate}</td>
      <td>${o.budget || '—'}</td>
      <td><span class="status-badge badge-${o.status}">${o.status}</span></td>
      <td>
        ${o.status === 'pending' ? `
          <button class="action-btn btn-accept" onclick="updateCustomOrderStatus('${o.id}','accepted')">Accept</button>
          <button class="action-btn btn-reject" onclick="updateCustomOrderStatus('${o.id}','rejected')">Reject</button>
        ` : '—'}
        <button class="action-btn btn-edit" onclick="viewCustomOrderDetails('${o.id}')" title="View Details"><i class="fas fa-eye"></i></button>
      </td>
    </tr>
    <tr id="detail-${o.id}" style="display:none;">
      <td colspan="9" class="custom-order-detail-row">
        <div class="custom-order-detail">
          <div><strong><i class="fas fa-paint-brush"></i> Design:</strong> ${o.design || '—'}</div>
          ${o.notes ? `<div style="margin-top:8px;"><strong><i class="fas fa-sticky-note"></i> Notes:</strong> ${o.notes}</div>` : ''}
          ${o.userEmail ? `<div style="margin-top:8px;"><strong><i class="fas fa-envelope"></i> Email:</strong> ${o.userEmail}</div>` : ''}
          <div style="margin-top:8px;"><strong><i class="fas fa-calendar-alt"></i> Submitted:</strong> ${o.date || o.createdAt?.slice(0,10) || '—'}</div>
        </div>
      </td>
    </tr>
  `).join("");
}

function viewCustomOrderDetails(id) {
    const row = document.getElementById('detail-' + id);
    if (row) row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}

async function updateCustomOrderStatus(id, status) {
    let adminNote = "";
    if (status === "rejected") {
        adminNote = prompt("Optional: Reason for rejection (visible to customer):") || "";
    }

    const order = (state.customOrders || []).find((o) => o.id === id);
    if (order) order.status = status;
    renderAdminCustomOrders();

    const result = await updateCustomOrderStatusInFirestore(id, status, adminNote);
    if (result.success) {
        toast(`Custom request ${status === 'accepted' ? 'accepted' : 'rejected'}`);
    } else {
        if (order) order.status = 'pending';
        renderAdminCustomOrders();
        toast("Failed to update: " + result.error);
    }
}

// ========== EXPOSE TO GLOBAL SCOPE ==========
// Make functions accessible from HTML onclick handlers
window.showAdminTab = showAdminTab;
window.saveItem = saveItem;
window.cancelEdit = cancelEdit;
window.deleteItem = deleteItem;
window.editItem = editItem;
window.updateOrderStatus = updateOrderStatus;
window.updateCustomOrderStatus = updateCustomOrderStatus;
window.viewCustomOrderDetails = viewCustomOrderDetails;
window.loadAdminCustomOrders = loadAdminCustomOrders;
window.updateAdminStats = updateAdminStats;
window.renderAdminItems = renderAdminItems;
window.renderAdminOrders = renderAdminOrders;
window.renderDashOrders = renderDashOrders;
window.setupDragDropZone = setupDragDropZone;
window.showImagePreview = showImagePreview;
