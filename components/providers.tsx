"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getInitialState, persistState } from "@/lib/demo-data";
import {
  type AppState,
  type Customer,
  type CustomerFormInput,
  type Employee,
  type EmployeeFormInput,
  type Job,
  type JobFormInput,
  type Organization,
  type RegisteredUser,
  type SignUpInput,
} from "@/lib/types";

const hashPassword = async (password: string) => {
  if (typeof window === "undefined") {
    return password;
  }

  const buffer = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

interface AppContextValue {
  state: AppState;
  currentUser: RegisteredUser | null;
  activeOrganization: Organization | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<RegisteredUser>;
  signUp: (input: SignUpInput) => Promise<RegisteredUser>;
  signOut: () => void;
  saveCustomer: (input: CustomerFormInput, customerId?: string) => Customer;
  deleteCustomer: (customerId: string) => void;
  saveEmployee: (input: EmployeeFormInput, employeeId?: string) => Employee;
  deleteEmployee: (employeeId: string) => void;
  saveJob: (input: JobFormInput, jobId?: string) => Job;
  deleteJob: (jobId: string) => void;
  updateOrganization: (name: string, phone: string, email: string, address: string) => Organization;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => getInitialState());
  const [isReady] = useState(true);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const currentUser =
    state.currentUserId === null
      ? null
      : state.users.find((user) => user.id === state.currentUserId) ?? null;

  const activeOrganization =
    state.activeOrganizationId === null
      ? null
      : state.organizations.find((organization) => organization.id === state.activeOrganizationId) ?? null;

  const signIn = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const passwordHash = await hashPassword(password);
      const user = state.users.find(
        (entry) =>
          entry.email.toLowerCase() === normalizedEmail && entry.passwordHash === passwordHash,
      );

      if (!user) {
        throw new Error("E-Mail oder Passwort ist ungültig.");
      }

      setState((previous) => ({ ...previous, currentUserId: user.id, activeOrganizationId: user.organizationId }));
      return user;
    },
    [state.users],
  );

  const signUp = useCallback(async (input: SignUpInput) => {
    const passwordHash = await hashPassword(input.password);
    const organizationId = `org-${Math.random().toString(36).slice(2, 11)}`;
    const organization: Organization = {
      id: organizationId,
      name: input.organizationName,
      createdAt: new Date().toISOString(),
    };
    const userId = `user-${Math.random().toString(36).slice(2, 11)}`;
    const user: RegisteredUser = {
      id: userId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      organizationId,
      passwordHash,
    };

    setState((previous) => ({
      ...previous,
      organizations: [...previous.organizations, organization],
      organizationMembers: [
        ...previous.organizationMembers,
        {
          id: `member-${userId}`,
          organizationId,
          userId,
          role: "owner",
          createdAt: new Date().toISOString(),
        },
      ],
      users: [...previous.users, user],
      currentUserId: userId,
      activeOrganizationId: organizationId,
    }));

    return user;
  }, []);

  const signOut = useCallback(() => {
    setState((previous) => ({ ...previous, currentUserId: null }));
  }, []);

  const saveCustomer = useCallback((input: CustomerFormInput, customerId?: string) => {
    const timestamp = new Date().toISOString();
    const organizationId = state.activeOrganizationId ?? state.organizations[0]?.id ?? "org-demo";

    let saved!: Customer;

    setState((previous) => {
      const existing = previous.customers.find((customer) => customer.id === customerId);

      if (existing) {
        const updated: Customer = {
          ...existing,
          ...input,
          organizationId: previous.activeOrganizationId ?? previous.organizations[0]?.id ?? organizationId,
          updatedAt: timestamp,
        };

        saved = updated;
        return {
          ...previous,
          customers: previous.customers.map((customer) =>
            customer.id === customerId ? updated : customer,
          ),
        };
      }

      const customer: Customer = {
        id: `cust-${Math.random().toString(36).slice(2, 11)}`,
        organizationId,
        name: input.name,
        companyName: input.companyName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        postalCode: input.postalCode,
        city: input.city,
        notes: input.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      saved = customer;
      return {
        ...previous,
        customers: [...previous.customers, customer],
      };
    });

    return saved as Customer;
  }, [state.activeOrganizationId, state.organizations]);

  const deleteCustomer = useCallback((customerId: string) => {
    setState((previous) => ({
      ...previous,
      customers: previous.customers.filter((customer) => customer.id !== customerId),
    }));
  }, []);

  const saveEmployee = useCallback((input: EmployeeFormInput, employeeId?: string) => {
    const timestamp = new Date().toISOString();
    const organizationId = state.activeOrganizationId ?? state.organizations[0]?.id ?? "org-demo";

    let saved!: Employee;

    setState((previous) => {
      const existing = previous.employees.find((employee) => employee.id === employeeId);

      if (existing) {
        const updated: Employee = {
          ...existing,
          ...input,
          organizationId: previous.activeOrganizationId ?? previous.organizations[0]?.id ?? organizationId,
          updatedAt: timestamp,
        };

        saved = updated;
        return {
          ...previous,
          employees: previous.employees.map((employee) =>
            employee.id === employeeId ? updated : employee,
          ),
        };
      }

      const employee: Employee = {
        id: `emp-${Math.random().toString(36).slice(2, 11)}`,
        organizationId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        color: input.color,
        active: input.active,
        notes: input.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      saved = employee;
      return {
        ...previous,
        employees: [...previous.employees, employee],
      };
    });

    return saved as Employee;
  }, [state.activeOrganizationId, state.organizations]);

  const deleteEmployee = useCallback((employeeId: string) => {
    setState((previous) => ({
      ...previous,
      employees: previous.employees.filter((employee) => employee.id !== employeeId),
    }));
  }, []);

  const saveJob = useCallback((input: JobFormInput, jobId?: string) => {
    const timestamp = new Date().toISOString();
    const organizationId = state.activeOrganizationId ?? state.organizations[0]?.id ?? "org-demo";

    let saved!: Job;

    setState((previous) => {
      const existing = previous.jobs.find((entry) => entry.id === jobId);

      if (existing) {
        const updated: Job = {
          ...existing,
          ...input,
          organizationId: previous.activeOrganizationId ?? previous.organizations[0]?.id ?? organizationId,
          updatedAt: timestamp,
        };

        saved = updated;
        return {
          ...previous,
          jobs: previous.jobs.map((entry) => (entry.id === jobId ? updated : entry)),
        };
      }

      const job: Job = {
        id: `job-${Math.random().toString(36).slice(2, 11)}`,
        organizationId,
        customerId: input.customerId,
        employeeId: input.employeeId || null,
        title: input.title,
        description: input.description,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        status: input.status,
        address: input.address,
        notes: input.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      saved = job;
      return {
        ...previous,
        jobs: [...previous.jobs, job],
      };
    });

    return saved as Job;
  }, [state.activeOrganizationId, state.organizations]);

  const deleteJob = useCallback((jobId: string) => {
    setState((previous) => ({
      ...previous,
      jobs: previous.jobs.filter((job) => job.id !== jobId),
    }));
  }, []);

  const updateOrganization = useCallback((...args: string[]) => {
    const [name = ""] = args;
    const organizationId = state.activeOrganizationId ?? state.organizations[0]?.id ?? "org-demo";
    const updated: Organization = {
      id: organizationId,
      name,
      createdAt: state.organizations.find((entry) => entry.id === organizationId)?.createdAt ?? new Date().toISOString(),
    };

    setState((previous) => ({
      ...previous,
      organizations: previous.organizations.map((entry) =>
        entry.id === organizationId ? { ...entry, name } : entry,
      ),
    }));

    return updated;
  }, [state.activeOrganizationId, state.organizations]);

  const value = useMemo<AppContextValue>(() => ({
    state,
    currentUser,
    activeOrganization,
    isReady,
    signIn,
    signUp,
    signOut,
    saveCustomer,
    deleteCustomer,
    saveEmployee,
    deleteEmployee,
    saveJob,
    deleteJob,
    updateOrganization,
  }), [activeOrganization, currentUser, deleteCustomer, deleteEmployee, deleteJob, isReady, saveCustomer, saveEmployee, saveJob, signIn, signUp, signOut, state, updateOrganization]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
}
