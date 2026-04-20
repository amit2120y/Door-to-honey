// Firebase Authentication Operations
import { auth } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createUserInFirestore, getUserFromFirestore } from "./firebase-db.js";

const ADMIN_EMAIL = "madhuluck8412@gmail.com";
const ADMIN_PASSWORD = "madhu0099";

export async function registerUserWithFirebase(name, email, password, city) {
    try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save additional user data to Firestore
        await createUserInFirestore(user.uid, {
            id: user.uid,
            name,
            email,
            city,
            role: "user",
            createdAt: new Date().toISOString(),
        });

        return { success: true, user: { uid: user.uid, name, email, city, role: "user" } };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function loginUserWithFirebase(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get user data from Firestore
        let userData = await getUserFromFirestore(user.uid);

        // If user document doesn't exist, create it
        if (!userData) {
            userData = {
                id: user.uid,
                uid: user.uid,
                name: email.split("@")[0],
                email: email,
                city: "Not specified",
                role: "user",
                createdAt: new Date().toISOString(),
            };
            // Save to Firestore for future logins
            await createUserInFirestore(user.uid, userData);
        }

        return { success: true, user: userData };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function loginAdminWithFirebase(email, password) {
    try {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        if (normalizedEmail !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
            return { success: false, error: "Invalid admin credentials" };
        }

        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        const user = userCredential.user;

        // Get user data from Firestore
        let userData = await getUserFromFirestore(user.uid);

        // If user document doesn't exist, create it
        if (!userData) {
            userData = {
                id: user.uid,
                uid: user.uid,
                name: "Madhu Admin",
                email: normalizedEmail,
                city: "Admin",
                role: "admin",
                createdAt: new Date().toISOString(),
            };
            // Save to Firestore for future logins
            await createUserInFirestore(user.uid, userData);
        }

        // Ensure this account is treated as admin
        if (userData.role !== "admin") {
            userData = {
                ...userData,
                id: user.uid,
                uid: user.uid,
                role: "admin",
                email: normalizedEmail,
            };
            await createUserInFirestore(user.uid, userData);
        }

        return { success: true, user: userData };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function logoutUserFromFirebase() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export function watchAuthState(callback) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userData = await getUserFromFirestore(firebaseUser.uid);
            // Only callback if we got user data, don't callback with null
            if (userData) {
                callback(userData);
            }
        } else {
            // Only logout if previously logged in
            callback(null);
        }
    });
}
