// Firebase Authentication Operations
import { auth } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { createUserInFirestore, getUserFromFirestore } from "./firebase-db.js";

const ADMIN_EMAIL = "madhuluck8412@gmail.com";
const ADMIN_PASSWORD = "madhu0099";

export async function registerUserWithFirebase(name, email, password, city, phone) {
    try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Send email verification link
        await sendEmailVerification(user);

        // Save additional user data to Firestore (mark as unverified)
        await createUserInFirestore(user.uid, {
            id: user.uid,
            name,
            email,
            city,
            phone,
            role: "user",
            emailVerified: false,
            createdAt: new Date().toISOString(),
        });

        // Sign out immediately — user must verify email before logging in
        await signOut(auth);

        return { success: true, user: { uid: user.uid, name, email, city, role: "user" }, verificationSent: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function loginUserWithFirebase(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if email is verified
        if (!user.emailVerified) {
            // Sign out unverified user
            await signOut(auth);
            return { success: false, error: "Email not verified. Please check your inbox and click the verification link.", emailUnverified: true, email: email };
        }

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
                emailVerified: true,
                createdAt: new Date().toISOString(),
            };
            // Save to Firestore for future logins
            await createUserInFirestore(user.uid, userData);
        }

        // Update emailVerified in Firestore if needed
        if (!userData.emailVerified) {
            userData.emailVerified = true;
            await createUserInFirestore(user.uid, { ...userData, emailVerified: true });
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

// Resend email verification link
export async function resendVerificationEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user.emailVerified) {
            await signOut(auth);
            return { success: false, error: "Email is already verified. Please sign in." };
        }

        await sendEmailVerification(user);
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Forgot Password — sends Firebase password reset email
export async function resetPasswordWithFirebase(email) {
    try {
        // Check if user exists in Firestore first
        const userExists = await findUserByEmail(email);
        if (!userExists) {
            return { success: false, error: "No account found with this email address." };
        }

        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Find user by email in Firestore
export async function findUserByEmail(email) {
    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error("Error finding user by email:", error);
        return null;
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

export async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;

        // Get user data from Firestore
        let userData = await getUserFromFirestore(user.uid);

        // If user document doesn't exist, create it
        if (!userData) {
            userData = {
                id: user.uid,
                uid: user.uid,
                name: user.displayName || user.email.split("@")[0],
                email: user.email,
                city: "Not specified",
                phone: user.phoneNumber || "",
                role: "user",
                emailVerified: true,
                createdAt: new Date().toISOString(),
            };
            // Save to Firestore
            await createUserInFirestore(user.uid, userData);
        }

        return { success: true, user: userData };
    } catch (error) {
        console.error("Google login error:", error);
        return { success: false, error: error.message };
    }
}
