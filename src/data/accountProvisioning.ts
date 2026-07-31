import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { app as primaryApp, db } from "../firebase";
import { Membership } from "../types";

export interface ProvisionAccountParams {
  email: string;
  password: string;
  displayName: string;
  organizationId: string;
  role: Membership["role"];
}

// Crea un usuario de Firebase Auth (profesional o apoderado) sin cerrar la sesión del admin
// que lo está creando: usa una app secundaria temporal, exclusiva para el alta.
export async function provisionLinkedAccount(params: ProvisionAccountParams): Promise<string> {
  const secondaryApp = initializeApp(primaryApp.options, `provisioning-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, params.email, params.password);
    const uid = credential.user.uid;

    await setDoc(doc(db, "organizations", params.organizationId, "members", uid), {
      uid,
      organizationId: params.organizationId,
      role: params.role,
      name: params.displayName,
    });

    await setDoc(doc(db, "users", uid), { organizationId: params.organizationId });

    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}
