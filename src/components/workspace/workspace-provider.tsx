"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { StaffRole } from "@/lib/database.types";

export type WorkspaceBusiness = {
  membershipId: string;
  role: StaffRole;
  id: string;
  name: string;
  slug: string;
  currency: string;
  tax_rate: number;
};

export type WorkspaceUser = {
  id: string;
  email: string;
  fullName: string;
};

type WorkspaceContextValue = {
  businesses: WorkspaceBusiness[];
  currentBusiness: WorkspaceBusiness | null;
  setCurrentBusinessId: (id: string) => void;
  user: WorkspaceUser;
};

const STORAGE_KEY = "merx_business_id";

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  initialBusinesses,
  initialUser,
}: {
  children: React.ReactNode;
  initialBusinesses: WorkspaceBusiness[];
  initialUser: WorkspaceUser;
}) {
  const [businesses] = useState(initialBusinesses);
  const [currentBusinessId, setCurrentBusinessIdState] = useState<
    string | null
  >(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && businesses.some((b) => b.id === stored)) {
      setCurrentBusinessIdState(stored);
    } else if (businesses.length > 0) {
      setCurrentBusinessIdState(businesses[0]!.id);
    }
  }, [businesses]);

  const setCurrentBusinessId = useCallback((id: string) => {
    setCurrentBusinessIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const currentBusiness = useMemo(
    () => businesses.find((b) => b.id === currentBusinessId) ?? null,
    [businesses, currentBusinessId],
  );

  const value = useMemo(
    () => ({
      businesses,
      currentBusiness,
      setCurrentBusinessId,
      user: initialUser,
    }),
    [businesses, currentBusiness, setCurrentBusinessId, initialUser],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
