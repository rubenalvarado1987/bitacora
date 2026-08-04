import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { collection, collectionGroup, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Membership, Organization } from "../types";
import { listenOrganization } from "../data/organizationSetup";

interface AuthContextValue {
  user: User | null;
  membership: Membership | null;
  organization: Organization | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMembership: (knownOrganizationId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMembership = async (knownOrganizationId?: string) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setMembership(null);
      return;
    }

    try {
      // Ruta directa cuando el orgId es conocido (ej: justo después del wizard)
      if (knownOrganizationId) {
        const snap = await getDoc(
          doc(db, "organizations", knownOrganizationId, "members", currentUser.uid)
        );
        if (snap.exists()) {
          const data = snap.data();
          setMembership({
            uid: currentUser.uid,
            organizationId: knownOrganizationId,
            role: data.role,
            name: data.name,
          });
          return;
        }
      }

      // Mapa uid -> organizationId guardado al crear la organización (evita collectionGroup en logins normales)
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const mappedOrgId = userDoc.data().organizationId as string | undefined;
        if (mappedOrgId) {
          const snap = await getDoc(doc(db, "organizations", mappedOrgId, "members", currentUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setMembership({
              uid: currentUser.uid,
              organizationId: mappedOrgId,
              role: data.role,
              name: data.name,
            });
            return;
          }
        }
      }

      // Autorecuperación para cuentas creadas antes del mapa uid -> org: busca la organización
      // que este usuario creó (consulta simple sobre createdBy, no requiere índice especial).
      const ownedOrgsQuery = query(collection(db, "organizations"), where("createdBy", "==", currentUser.uid));
      const ownedOrgsSnapshot = await getDocs(ownedOrgsQuery);
      if (!ownedOrgsSnapshot.empty) {
        const organizationId = ownedOrgsSnapshot.docs[0].id;
        const snap = await getDoc(doc(db, "organizations", organizationId, "members", currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setMembership({
            uid: currentUser.uid,
            organizationId,
            role: data.role,
            name: data.name,
          });
          await setDoc(doc(db, "users", currentUser.uid), { organizationId });
          return;
        }
      }

      // Búsqueda por collectionGroup como último recurso (usuarios creados antes del mapa uid -> org)
      const membersQuery = query(
        collectionGroup(db, "members"),
        where("uid", "==", currentUser.uid)
      );
      const snapshot = await getDocs(membersQuery);

      if (!snapshot.empty) {
        const memberDoc = snapshot.docs[0];
        const organizationId = memberDoc.ref.parent.parent?.id ?? "";
        const data = memberDoc.data();
        setMembership({
          uid: currentUser.uid,
          organizationId,
          role: data.role,
          name: data.name,
        });
        await setDoc(doc(db, "users", currentUser.uid), { organizationId });
      } else {
        setMembership(null);
      }
    } catch (error) {
      console.warn("No se pudo cargar la membresía del usuario:", error);
      setMembership(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Vuelve a mostrar el estado de carga en cada cambio de sesión, no solo al arrancar la app,
      // para evitar el pestañeo hacia /setup mientras se resuelve la membresía tras iniciar sesión.
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        await refreshMembership();
      } else {
        setMembership(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!membership?.organizationId) {
      setOrganization(null);
      return;
    }
    return listenOrganization(membership.organizationId, setOrganization);
  }, [membership?.organizationId]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, membership, organization, loading, signIn, signUp, signOut, refreshMembership }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
