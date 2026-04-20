// Firebase Firestore Database Operations
import { db, storage } from "./firebase-config.js";
import {
    collection,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    limit,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ========== USERS ==========
export async function createUserInFirestore(uid, userData) {
    try {
        await setDoc(doc(db, "users", uid), userData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getUserFromFirestore(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error getting user:", error);
        return null;
    }
}

export async function updateUserInFirestore(uid, userData) {
    try {
        await updateDoc(doc(db, "users", uid), userData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== ITEMS ==========
export async function getAllItemsFromFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, "items"));
        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        return items;
    } catch (error) {
        console.error("Error getting items:", error);
        return [];
    }
}

export async function addItemToFirestore(itemData) {
    try {
        const docRef = await addDoc(collection(db, "items"), {
            ...itemData,
            createdAt: new Date().toISOString(),
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function updateItemInFirestore(itemId, itemData) {
    try {
        await updateDoc(doc(db, "items", itemId), itemData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteItemFromFirestore(itemId) {
    try {
        await deleteDoc(doc(db, "items", itemId));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== ORDERS ==========
export async function createOrderInFirestore(orderData) {
    try {
        const docRef = await addDoc(collection(db, "orders"), {
            ...orderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        return { success: true, id: docRef.id, ...orderData, id: docRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getUserOrdersFromFirestore(userId) {
    try {
        const q = query(collection(db, "orders"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        return orders.sort((a, b) => {
            const aTs = Date.parse(a.createdAt || "") || 0;
            const bTs = Date.parse(b.createdAt || "") || 0;
            return bTs - aTs;
        });
    } catch (error) {
        console.error("Error getting user orders:", error);
        return [];
    }
}

export async function getAllOrdersFromFirestore() {
    try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        return orders;
    } catch (error) {
        console.error("Error getting orders:", error);
        return [];
    }
}

export async function updateOrderStatusInFirestore(orderId, status) {
    try {
        await updateDoc(doc(db, "orders", orderId), {
            status,
            updatedAt: new Date().toISOString(),
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== STATS ==========
export async function getAdminStatsFromFirestore() {
    try {
        const itemsSnapshot = await getDocs(collection(db, "items"));
        const ordersSnapshot = await getDocs(collection(db, "orders"));

        const orders = [];
        ordersSnapshot.forEach((doc) => {
            orders.push(doc.data());
        });

        const totalItems = itemsSnapshot.size;
        const totalOrders = ordersSnapshot.size;
        const pendingOrders = orders.filter((o) => o.status === "pending").length;
        const totalRevenue = orders
            .filter((o) => o.status === "accepted")
            .reduce((sum, o) => sum + (o.total || 0), 0);

        return {
            totalItems,
            totalOrders,
            pendingOrders,
            totalRevenue,
        };
    } catch (error) {
        console.error("Error getting stats:", error);
        return { totalItems: 0, totalOrders: 0, pendingOrders: 0, totalRevenue: 0 };
    }
}

// ========== IMAGE UPLOAD ==========
export async function uploadItemImage(file) {
    try {
        console.log("uploadItemImage called with file:", file.name, "size:", file.size);

        if (!file) {
            return { success: false, error: "No file selected" };
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return { success: false, error: "File size exceeds 5MB" };
        }

        // Create unique filename
        const timestamp = Date.now();
        const fileName = `items/${timestamp}_${file.name}`;
        console.log("Uploading to Firebase Storage:", fileName);

        // Upload to Firebase Storage with timeout
        const storageRef = ref(storage, fileName);
        console.log("Storage ref created:", storageRef.fullPath);

        // Create timeout promise
        const uploadPromise = uploadBytes(storageRef, file);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Upload timeout - check Firebase Storage rules")), 30000)
        );

        const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
        console.log("File uploaded successfully:", uploadResult);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log("Download URL obtained:", downloadURL);

        return { success: true, url: downloadURL };
    } catch (error) {
        console.error("Error uploading image:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        return { success: false, error: error.message };
    }
}

// ========== CUSTOM CAKE ORDERS ==========
export async function createCustomOrderInFirestore(customOrderData) {
    try {
        const docRef = await addDoc(collection(db, 'custom_orders'), {
            ...customOrderData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating custom order:', error);
        return { success: false, error: error.message };
    }
}

export async function getUserCustomOrdersFromFirestore(userId) {
    try {
        const q = query(collection(db, 'custom_orders'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        const orders = [];
        querySnapshot.forEach((doc) => { orders.push({ id: doc.id, ...doc.data() }); });
        return orders.sort((a, b) => (Date.parse(b.createdAt||'')||0) - (Date.parse(a.createdAt||'')||0));
    } catch (error) {
        console.error('Error getting user custom orders:', error);
        return [];
    }
}

export async function getAllCustomOrdersFromFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, 'custom_orders'));
        const orders = [];
        querySnapshot.forEach((doc) => { orders.push({ id: doc.id, ...doc.data() }); });
        return orders.sort((a, b) => (Date.parse(b.createdAt||'')||0) - (Date.parse(a.createdAt||'')||0));
    } catch (error) {
        console.error('Error getting all custom orders:', error);
        return [];
    }
}

export async function updateCustomOrderStatusInFirestore(orderId, status, adminNote) {
    try {
        await updateDoc(doc(db, 'custom_orders', orderId), { status, adminNote: adminNote||'', updatedAt: new Date().toISOString() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
