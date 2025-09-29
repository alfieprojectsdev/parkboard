// =============================================================================
// DevAuthWrapper.js - bypass auth for local dev/testing
// =============================================================================
"use client";

import { createContext, useContext } from "react";

const AuthContext = createContext({
  user: { id: "11111111-1111-1111-1111-111111111111" },
  profile: {
    id: "11111111-1111-1111-1111-111111111111",
    role: "resident",
    name: "Alice Resident"
  },
  loading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function DevAuthWrapper({ children }) {
  return <AuthContext.Provider value={useAuth()}>{children}</AuthContext.Provider>;
}
