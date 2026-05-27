import { useState, useEffect, useContext, createContext } from "react";
import {
  auth,
  signIn,
  signUp,
  signOut,
  signInWithGoogle,
  getProfile,
  onAuthChange,
} from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Default to true

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const p = await getProfile(firebaseUser.uid);
          setProfile(p);
        } catch (err) {
          console.error("Profile fetch error:", err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    user,
    profile,
    loading,
    login: (email, password) => signIn(email, password),
    register: async (email, password, name) => {
      const newUser = await signUp(email, password, name);
      const p = await getProfile(newUser.uid);
      setProfile(p);
      return newUser;
    },
    logout: async () => {
      await signOut();
      setUser(null);
      setProfile(null);
    },
    googleLogin: async () => {
      const newUser = await signInWithGoogle();
      try {
        const p = await getProfile(newUser.uid);
        setProfile(p);
      } catch {
        setProfile(null);
      }
      return newUser;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
