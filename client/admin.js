// Import shared functions from common.js
import { state, updateCartUI, formatINR, logout, toast, syncItemsFromFirestore } from "./common.js";
import {
    updateOrderStatusInFirestore,
    addItemToFirestore,
    getAllCustomOrdersFromFirestore,
    updateCustomOrderStatusInFirestore,
} from "../server/firebase-db.js";
import { getDocs, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

function createOrderCard(o) {
    try {
        const statusClass = `status-${o.status || 'pending'}`;
        const items = Array.isArray(o.items) ? o.items : [];
        const itemsList = items.map((i) => (i.name || 'Item') + " x" + (i.qty || 1)).join(", ");
        
        // Find item image
        const firstItemName = items[0]?.name;
        const itemData = state.items.find(i => i.name === firstItemName);
        const itemImg = itemData ? itemData.image : 'images/honey1.jpeg';
        
        return `
        <div class="admin-order-card">
            <div class="admin-order-card-header">
                <div>
                    <h4 class="admin-order-card-title">${items[0]?.name || 'Cake Order'}</h4>
                    <div class="admin-order-card-category">Pastry & Cakes</div>
                </div>
                <span class="admin-order-card-status ${statusClass}">${o.status || 'pending'}</span>
            </div>

            <div class="admin-order-card-section admin-card-user-box">
                <div class="admin-card-user-details">
                    <div class="admin-order-card-user-name">${o.userName || 'Anonymous'}</div>
                    <span class="admin-order-card-user-sub">${o.userEmail || '—'}</span>
                    <span class="admin-order-card-user-sub">${o.phone || '—'}</span>
                </div>
                <div class="admin-card-item-img">
                    <img src="${itemImg}" alt="${items[0]?.name || 'Cake'}">
                </div>
            </div>

            <div class="admin-order-card-details">
                <div class="admin-order-detail-item">
                    <span class="admin-order-detail-label">Items:</span>
                    <span class="admin-order-detail-val">${itemsList || 'No items listed'}</span>
                </div>
                <div class="admin-order-detail-item">
                    <span class="admin-order-detail-label">Address:</span>
                    <span class="admin-order-detail-val">${o.address || '—'}</span>
                </div>
                <div class="admin-order-detail-item">
                    <span class="admin-order-detail-label">Amount:</span>
                    <span class="admin-order-detail-val fw-700 honey-dark">${formatINR(o.total || 0)}</span>
                </div>
                <div class="admin-order-detail-item">
                    <span class="admin-order-detail-label">Date:</span>
                    <span class="admin-order-detail-val">${o.date || '—'}</span>
                </div>
            </div>

            <div class="admin-order-card-footer">
                ${o.status === 'pending' ? `
                    <div class="admin-order-actions">
                        <button class="admin-order-action-btn btn-acc" onclick="updateOrderStatus('${o.id}','accepted')">Accept Order</button>
                        <button class="admin-order-action-btn btn-rej" onclick="updateOrderStatus('${o.id}','rejected')">Reject</button>
                    </div>
                ` : ''}
                <button class="admin-order-view-btn">View Details</button>
            </div>
        </div>
        `;
    } catch (err) {
        console.error("Error rendering order card:", err, o);
        return `<div class="admin-order-card" style="border:1px solid red; padding:10px;">Error rendering order ID: ${o.id}</div>`;
    }
}

function renderDashOrders() {
    const grid = document.getElementById("dashOrdersGrid");
    if (!grid) return;

    if (!state.orders || state.orders.length === 0) {
        grid.innerHTML = '<p class="td-center-muted" style="grid-column: 1/-1; padding: 40px; text-align: center;">No orders yet. They will appear here once placed.</p>';
        return;
    }

    // Sort by createdAt descending (newest first)
    const sorted = [...state.orders].sort((a, b) => {
        const timeA = a.createdAt || (a.date ? Date.parse(a.date) : 0);
        const timeB = b.createdAt || (b.date ? Date.parse(b.date) : 0);
        return timeB - timeA;
    });

    const recent = sorted.slice(0, 5);
    grid.innerHTML = recent.map((o) => createOrderCard(o)).join("");
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
    const grid = document.getElementById("adminOrdersGrid");
    if (!grid) return;

    if (!state.orders || state.orders.length === 0) {
        grid.innerHTML = '<p class="td-center-muted" style="grid-column: 1/-1; padding: 40px; text-align: center;">No orders yet.</p>';
        return;
    }

    // Sort by createdAt descending (newest first)
    const sorted = [...state.orders].sort((a, b) => {
        const timeA = a.createdAt || (a.date ? Date.parse(a.date) : 0);
        const timeB = b.createdAt || (b.date ? Date.parse(b.date) : 0);
        return timeB - timeA;
    });

    grid.innerHTML = sorted.map((o) => createOrderCard(o)).join("");
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

async function convertImageToBase64(file, options = {}) {
    const maxWidth = options.maxWidth || 900;
    const maxHeight = options.maxHeight || 900;
    const maxChars = options.maxChars || 650000;

    let fileToProcess = file;

    // Check for HEIC/HEIF and convert if heic2any is available
    if ((file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) && typeof heic2any === "function") {
        try {
            const converted = await heic2any({
                blob: file,
                toType: "image/jpeg",
                quality: 0.7
            });
            fileToProcess = Array.isArray(converted) ? converted[0] : converted;
        } catch (err) {
            console.error("HEIC conversion failed, attempting standard load:", err);
        }
    }

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
                    fallbackToRaw();
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

            img.onerror = () => {
                // If it's a format like HEIC that browser can't render but we still want to accept it
                fallbackToRaw();
            };

            function fallbackToRaw() {
                if (reader.result.length <= maxChars) {
                    resolve(reader.result);
                } else {
                    reject(new Error("This image format is not natively supported for resizing by your browser and is too large for database storage (> 500KB). Please try a JPG or PNG."));
                }
            }

            img.src = reader.result;
        };

        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(fileToProcess);
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
            const isImage = file.type.startsWith("image/") || 
                          /\.(heic|heif|webp|svg|avif)$/i.test(file.name);
            
            if (isImage) {
                fileInput.files = files;
                showImagePreview(file);
            } else {
                toast("Please drop a valid image file");
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
    requestNotificationPermission();
    listenForNewOrders();
});

function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Notification permission granted.");
                }
            });
        }
    }
}

let lastNotificationTime = Date.now();

function listenForNewOrders() {
    if (!db) return;

    // Listen for regular orders
    onSnapshot(collection(db, "orders"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const order = change.doc.data();
                // Parse createdAt if it's a string (ISO)
                const orderTime = typeof order.createdAt === 'string' ? Date.parse(order.createdAt) : order.createdAt;
                
                // Check if the order is NEW (created after page load)
                if (orderTime > lastNotificationTime) {
                    showOrderNotification("New Regular Order!", `From: ${order.userName || 'Customer'}`);
                    loadAllOrdersFromFirestore(); // Refresh UI
                }
            }
        });
    });

    // Listen for custom requests
    onSnapshot(collection(db, "custom_orders"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const order = change.doc.data();
                const orderTime = typeof order.createdAt === 'string' ? Date.parse(order.createdAt) : order.createdAt;

                if (orderTime > lastNotificationTime) {
                    showOrderNotification("New Custom Cake Request!", `${order.userName || 'Customer'} is requesting a ${order.occasion} cake.`);
                    loadAdminCustomOrders(); // Refresh UI
                }
            }
        });
    });
}

function showOrderNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: "images/honey1.jpeg"
        });
        
        // Also play a subtle sound if possible
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.play().catch(e => console.log("Audio play blocked by browser policy"));
    }
    toast(title + " " + body);
}

function createCustomRequestCard(o) {
    try {
        const statusClass = `status-${o.status || 'pending'}`;
        
        return `
        <div class="admin-order-card">
            <div class="admin-order-card-header">
                <div>
                    <h4 class="admin-order-card-title">${o.occasion} Request</h4>
                    <div class="admin-order-card-category">${o.flavor} · ${o.weight}</div>
                </div>
                <span class="admin-order-card-status ${statusClass}">${o.status || 'pending'}</span>
            </div>

            <div class="admin-order-card-section admin-card-user-box">
                <div class="admin-card-user-details">
                    <div class="admin-order-card-user-name">${o.userName || 'Anonymous'}</div>
                    <span class="admin-order-card-user-sub">${o.userEmail || '—'}</span>
                    <span class="admin-order-card-user-sub">${o.phone || '—'}</span>
                </div>
                <div class="admin-card-item-img" style="background: var(--cream); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--honey-dark);">
                    <i class="fas fa-magic"></i>
                </div>
            </div>

            <div class="admin-order-card-details">
                <div class="admin-order-detail-item">
                    <span class="admin-order-detail-label">Specifications:</span>
                    <span class="admin-order-detail-val">${o.tiers} Tier(s) · ${o.dietary}</span>
                </div>
                <div class="admin-order-detail-item">
                    <span class="admin-order-detail-label">Delivery Date:</span>
                    <span class="admin-order-detail-val">${o.deliveryDate || '—'}</span>
                </div>
                <div class="admin-order-detail-item">
                    <span class="admin-order-detail-label">Budget:</span>
                    <span class="admin-order-detail-val fw-700 honey-dark">${o.budget || 'Not specified'}</span>
                </div>
                <div class="admin-order-detail-item">
                    <span class="admin-order-detail-label">Address:</span>
                    <span class="admin-order-detail-val">${o.address || '—'}</span>
                </div>
                <div class="admin-order-detail-item">
                    <span class="admin-order-detail-label">Design Idea:</span>
                    <span class="admin-order-detail-val">${o.design || '—'}</span>
                </div>
            </div>

            <div class="admin-order-card-footer">
                ${o.status === 'pending' ? `
                    <div class="admin-order-actions">
                        <button class="admin-order-action-btn btn-acc" onclick="updateCustomOrderStatus('${o.id}','accepted')">Accept Request</button>
                        <button class="admin-order-action-btn btn-rej" onclick="updateCustomOrderStatus('${o.id}','rejected')">Reject</button>
                    </div>
                ` : ''}
                <button class="admin-order-view-btn" onclick="viewCustomOrderDetails('${o.id}')">View Full Notes</button>
            </div>
            
            <div id="detail-${o.id}" class="admin-order-detail-dropdown" style="display:none; padding:15px; background:var(--cream); border-radius:12px; margin-top:10px; font-size:13px; line-height:1.5;">
                 <strong>Additional Notes:</strong><br>
                 ${o.notes || 'No additional notes provided.'}
                 ${o.adminNote ? `<br><br><strong style="color:var(--rose);">Rejection Reason:</strong><br>${o.adminNote}` : ''}
            </div>
        </div>
        `;
    } catch (err) {
        console.error("Error rendering custom request card:", err, o);
        return `<div class="admin-order-card" style="border:1px solid red; padding:10px;">Error rendering request ID: ${o.id}</div>`;
    }
}

// ========== CUSTOM CAKE ORDERS (ADMIN) ==========
async function loadAdminCustomOrders() {
    state.customOrders = state.customOrders || [];
    try {
        const orders = await getAllCustomOrdersFromFirestore();
        state.customOrders = orders;
        renderAdminCustomOrders();
        updateAdminStats();
    } catch (error) {
        console.error("Error loading custom orders:", error);
        toast("Failed to load custom orders");
    }
}

function renderAdminCustomOrders() {
    const grid = document.getElementById("adminCustomOrdersGrid");
    if (!grid) return;

    const orders = state.customOrders || [];
    if (orders.length === 0) {
        grid.innerHTML = '<p class="td-center-muted" style="grid-column: 1/-1; padding: 40px; text-align: center;">No custom cake requests yet.</p>';
        return;
    }

    // Sort by createdAt descending (newest first)
    const sorted = [...orders].sort((a, b) => {
        const timeA = a.createdAt || (a.date ? Date.parse(a.date) : 0);
        const timeB = b.createdAt || (b.date ? Date.parse(b.date) : 0);
        return timeB - timeA;
    });

    grid.innerHTML = sorted.map((o) => createCustomRequestCard(o)).join("");
}

function viewCustomOrderDetails(id) {
    const detailEl = document.getElementById('detail-' + id);
    if (detailEl) {
        detailEl.style.display = detailEl.style.display === 'none' ? 'block' : 'none';
    }
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
window.loadAdminPage = loadAdminPage;
