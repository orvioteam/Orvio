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
import { supabase, hasSupabase } from "@/lib/supabase/client";
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

const mapOrganizationRow = (row: Record<string, unknown>): Organization => ({
  id: String(row.id ?? ""),
  name: String(row.name ?? ""),
  phone: String(row.phone ?? ""),
  email: String(row.email ?? ""),
  address: String(row.address ?? ""),
  createdAt: String(row.created_at ?? new Date().toISOString()),
});

const mapCustomerRow = (row: Record<string, unknown>): Customer => ({
  id: String(row.id ?? ""),
  organizationId: String(row.organization_id ?? ""),
  name: String(row.name ?? ""),
  companyName: String(row.company_name ?? ""),
  email: String(row.email ?? ""),
  phone: String(row.phone ?? ""),
  address: String(row.address ?? ""),
  postalCode: String(row.postal_code ?? ""),
  city: String(row.city ?? ""),
  notes: String(row.notes ?? ""),
  createdAt: String(row.created_at ?? new Date().toISOString()),
  updatedAt: String(row.updated_at ?? new Date().toISOString()),
});

const mapEmployeeRow = (row: Record<string, unknown>): Employee => ({
  id: String(row.id ?? ""),
  organizationId: String(row.organization_id ?? ""),
  firstName: String(row.first_name ?? ""),
  lastName: String(row.last_name ?? ""),
  email: String(row.email ?? ""),
  phone: String(row.phone ?? ""),
  color: String(row.color ?? "#10b981"),
  active: Boolean(row.active),
  notes: String(row.notes ?? ""),
  createdAt: String(row.created_at ?? new Date().toISOString()),
  updatedAt: String(row.updated_at ?? new Date().toISOString()),
});

const mapJobRow = (row: Record<string, unknown>): Job => ({
  id: String(row.id ?? ""),
  organizationId: String(row.organization_id ?? ""),
  customerId: String(row.customer_id ?? ""),
  employeeId: row.employee_id ? String(row.employee_id) : null,
  title: String(row.title ?? ""),
  description: String(row.description ?? ""),
  date: String(row.date ?? new Date().toISOString().slice(0, 10)),
  startTime: String(row.start_time ?? "08:00"),
  endTime: String(row.end_time ?? "10:00"),
  status: (row.status as Job["status"]) ?? "scheduled",
  address: String(row.address ?? ""),
  notes: String(row.notes ?? ""),
  createdAt: String(row.created_at ?? new Date().toISOString()),
  updatedAt: String(row.updated_at ?? new Date().toISOString()),
});

type SupabaseUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
};

const mapSupabaseUserToRegisteredUser = (userId: string, email: string | null | undefined, organizationId: string | null, profile?: { first_name?: string; last_name?: string }) => ({
  id: userId,
  email: email ?? "",
  firstName: profile?.first_name ?? "Benutzer",
  lastName: profile?.last_name ?? "",
  organizationId: organizationId ?? "",
  passwordHash: "",
} satisfies RegisteredUser);

interface AppContextValue {
  state: AppState;
  currentUser: RegisteredUser | null;
  activeOrganization: Organization | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<RegisteredUser>;
  signUp: (input: SignUpInput) => Promise<RegisteredUser>;
  signOut: () => Promise<void> | void;
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
  const [isReady, setIsReady] = useState(() => !supabase);
  const [supabaseUser, setSupabaseUser] = useState<null | SupabaseUserLike>(null);

  const hydrateSupabaseState = useCallback(async (user: SupabaseUserLike) => {
    const client = supabase;
    if (!client) return;

    const { data: memberData, error: memberError } = await client
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError) {
      console.error("Supabase member lookup failed:", memberError.message);
      return;
    }

    if (!memberData) {
      setState((previous) => ({ ...previous, currentUserId: null, activeOrganizationId: null }));
      setSupabaseUser(user);
      return;
    }

    const organizationId = String(memberData.organization_id);

    const [{ data: organizationRows }, { data: customerRows }, { data: employeeRows }, { data: jobRows }] = await Promise.all([
      client.from("organizations").select("*").eq("id", organizationId).maybeSingle(),
      client.from("customers").select("*").eq("organization_id", organizationId),
      client.from("employees").select("*").eq("organization_id", organizationId),
      client.from("jobs").select("*").eq("organization_id", organizationId),
    ]);

    setSupabaseUser(user);
    setState({
      organizations: organizationRows ? [mapOrganizationRow(organizationRows as Record<string, unknown>)] : [],
      organizationMembers: [{
        id: `member-${user.id}`,
        organizationId,
        userId: user.id,
        role: (memberData.role as "owner" | "manager" | "admin") ?? "owner",
        createdAt: new Date().toISOString(),
      }],
      customers: (customerRows ?? []).map((row) => mapCustomerRow(row as Record<string, unknown>)),
      employees: (employeeRows ?? []).map((row) => mapEmployeeRow(row as Record<string, unknown>)),
      jobs: (jobRows ?? []).map((row) => mapJobRow(row as Record<string, unknown>)),
      users: [mapSupabaseUserToRegisteredUser(user.id, user.email, organizationId, user.user_metadata)],
      currentUserId: user.id,
      activeOrganizationId: organizationId,
    });
  }, []);

  useEffect(() => {
    if (!hasSupabase || !supabase) {
      return;
    }

    let isMounted = true;

    const initialize = async () => {
      const client = supabase;
      if (!client) return;

      const { data: { session } } = await client.auth.getSession();
      if (!isMounted) return;

      if (session?.user) {
        await hydrateSupabaseState(session.user);
      }

      setIsReady(true);
    };

    void initialize();

    const client = supabase;
    if (!client) {
      return;
    }

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void hydrateSupabaseState(session.user);
      } else {
        setSupabaseUser(null);
        setState((previous) => ({ ...previous, currentUserId: null, activeOrganizationId: null }));
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [hydrateSupabaseState]);

  useEffect(() => {
    if (!hasSupabase || !supabase) {
      persistState(state);
    }
  }, [state]);

  const localCurrentUser =
    state.currentUserId === null
      ? null
      : state.users.find((user) => user.id === state.currentUserId) ?? null;

  const currentUser = supabaseUser
    ? mapSupabaseUserToRegisteredUser(
        supabaseUser.id,
        supabaseUser.email,
        state.activeOrganizationId,
        supabaseUser.user_metadata,
      )
    : localCurrentUser;

  const activeOrganization =
    state.activeOrganizationId === null
      ? null
      : state.organizations.find((organization) => organization.id === state.activeOrganizationId) ?? null;

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = supabase;
      if (client) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(error.message || "E-Mail oder Passwort ist ungültig.");
        }

        await hydrateSupabaseState(data.user);
        return mapSupabaseUserToRegisteredUser(
          data.user.id,
          data.user.email,
          state.activeOrganizationId,
          data.user.user_metadata,
        );
      }

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
    [hydrateSupabaseState, state.activeOrganizationId, state.users],
  );

  const signUp = useCallback(async (input: SignUpInput) => {
    const client = supabase;
    if (client) {
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            first_name: input.firstName,
            last_name: input.lastName,
            organization_name: input.organizationName,
          },
        },
      });

      if (error) {
        throw new Error(error.message || "Registrierung fehlgeschlagen.");
      }

      if (data.user) {
        const { data: organizationData, error: organizationError } = await client
          .from("organizations")
          .insert({
            name: input.organizationName,
            phone: "",
            email: input.email,
            address: "",
          })
          .select()
          .single();

        if (organizationError) {
          throw new Error(organizationError.message || "Organisation konnte nicht erstellt werden.");
        }

        const { error: memberError } = await client.from("organization_members").insert({
          organization_id: organizationData.id,
          user_id: data.user.id,
          role: "owner",
        });

        if (memberError) {
          throw new Error(memberError.message || "Mitglied konnte nicht angelegt werden.");
        }

        await hydrateSupabaseState(data.user);

        return mapSupabaseUserToRegisteredUser(
          data.user.id,
          data.user.email,
          organizationData.id,
          data.user.user_metadata,
        );
      }

      throw new Error("Registrierung fehlgeschlagen.");
    }

    const passwordHash = await hashPassword(input.password);
    const organizationId = `org-${Math.random().toString(36).slice(2, 11)}`;
    const organization: Organization = {
      id: organizationId,
      name: input.organizationName,
      phone: "+41 44 000 00 00",
      email: input.email,
      address: "Noch nicht hinterlegt",
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
  }, [hydrateSupabaseState]);

  const signOut = useCallback(async () => {
    const client = supabase;
    if (client) {
      const { error } = await client.auth.signOut();
      if (error) {
        throw new Error(error.message || "Abmeldung fehlgeschlagen.");
      }
      setSupabaseUser(null);
      setState((previous) => ({ ...previous, currentUserId: null, activeOrganizationId: null }));
      return;
    }

    setState((previous) => ({ ...previous, currentUserId: null }));
  }, []);

  const saveCustomer = useCallback((input: CustomerFormInput, customerId?: string) => {
    const timestamp = new Date().toISOString();
    const organizationId = state.activeOrganizationId ?? state.organizations[0]?.id ?? "org-demo";

    let saved!: Customer;

    if (supabase && state.activeOrganizationId) {
      const payload = {
        id: customerId,
        organization_id: state.activeOrganizationId,
        name: input.name,
        company_name: input.companyName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        postal_code: input.postalCode,
        city: input.city,
        notes: input.notes,
      };

      const query = customerId
        ? supabase.from("customers").update(payload).eq("id", customerId).select().single()
        : supabase.from("customers").insert(payload).select().single();

      void query.then(({ data, error }) => {
        if (error) {
          console.error("Supabase customer save failed:", error.message);
          return;
        }

        const mapped = mapCustomerRow(data as Record<string, unknown>);
        setState((previous) => ({
          ...previous,
          customers: customerId
            ? previous.customers.map((customer) => (customer.id === customerId ? mapped : customer))
            : [...previous.customers, mapped],
        }));
      });
    }

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
    if (supabase && state.activeOrganizationId) {
      void supabase.from("customers").delete().eq("id", customerId).then(({ error }) => {
        if (error) {
          console.error("Supabase customer delete failed:", error.message);
        }
      });
    }

    setState((previous) => ({
      ...previous,
      customers: previous.customers.filter((customer) => customer.id !== customerId),
    }));
  }, [state.activeOrganizationId]);

  const saveEmployee = useCallback((input: EmployeeFormInput, employeeId?: string) => {
    const timestamp = new Date().toISOString();
    const organizationId = state.activeOrganizationId ?? state.organizations[0]?.id ?? "org-demo";

    let saved!: Employee;

    if (supabase && state.activeOrganizationId) {
      const payload = {
        id: employeeId,
        organization_id: state.activeOrganizationId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        color: input.color,
        active: input.active,
        notes: input.notes,
      };

      const query = employeeId
        ? supabase.from("employees").update(payload).eq("id", employeeId).select().single()
        : supabase.from("employees").insert(payload).select().single();

      void query.then(({ data, error }) => {
        if (error) {
          console.error("Supabase employee save failed:", error.message);
          return;
        }

        const mapped = mapEmployeeRow(data as Record<string, unknown>);
        setState((previous) => ({
          ...previous,
          employees: employeeId
            ? previous.employees.map((employee) => (employee.id === employeeId ? mapped : employee))
            : [...previous.employees, mapped],
        }));
      });
    }

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
    if (supabase && state.activeOrganizationId) {
      void supabase.from("employees").delete().eq("id", employeeId).then(({ error }) => {
        if (error) {
          console.error("Supabase employee delete failed:", error.message);
        }
      });
    }

    setState((previous) => ({
      ...previous,
      employees: previous.employees.filter((employee) => employee.id !== employeeId),
    }));
  }, [state.activeOrganizationId]);

  const saveJob = useCallback((input: JobFormInput, jobId?: string) => {
    const timestamp = new Date().toISOString();
    const organizationId = state.activeOrganizationId ?? state.organizations[0]?.id ?? "org-demo";

    let saved!: Job;

    if (supabase && state.activeOrganizationId) {
      const payload = {
        id: jobId,
        organization_id: state.activeOrganizationId,
        customer_id: input.customerId,
        employee_id: input.employeeId || null,
        title: input.title,
        description: input.description,
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        status: input.status,
        address: input.address,
        notes: input.notes,
      };

      const query = jobId
        ? supabase.from("jobs").update(payload).eq("id", jobId).select().single()
        : supabase.from("jobs").insert(payload).select().single();

      void query.then(({ data, error }) => {
        if (error) {
          console.error("Supabase job save failed:", error.message);
          return;
        }

        const mapped = mapJobRow(data as Record<string, unknown>);
        setState((previous) => ({
          ...previous,
          jobs: jobId
            ? previous.jobs.map((job) => (job.id === jobId ? mapped : job))
            : [...previous.jobs, mapped],
        }));
      });
    }

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
    if (supabase && state.activeOrganizationId) {
      void supabase.from("jobs").delete().eq("id", jobId).then(({ error }) => {
        if (error) {
          console.error("Supabase job delete failed:", error.message);
        }
      });
    }

    setState((previous) => ({
      ...previous,
      jobs: previous.jobs.filter((job) => job.id !== jobId),
    }));
  }, [state.activeOrganizationId]);

  const updateOrganization = useCallback((name: string, phone: string, email: string, address: string) => {
    const organizationId = state.activeOrganizationId ?? state.organizations[0]?.id ?? "org-demo";
    const currentOrganization = state.organizations.find((entry) => entry.id === organizationId);
    const updated: Organization = {
      id: organizationId,
      name,
      phone,
      email,
      address,
      createdAt: currentOrganization?.createdAt ?? new Date().toISOString(),
    };

    if (supabase && state.activeOrganizationId) {
      void supabase
        .from("organizations")
        .update({ name, phone, email, address })
        .eq("id", state.activeOrganizationId)
        .then(({ error }) => {
          if (error) {
            console.error("Supabase organization update failed:", error.message);
          }
        });
    }

    setState((previous) => ({
      ...previous,
      organizations: previous.organizations.map((entry) =>
        entry.id === organizationId ? { ...entry, name, phone, email, address } : entry,
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
