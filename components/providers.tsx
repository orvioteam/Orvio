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
import { createClient } from "@/lib/supabase/client";
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
} from "@/lib/types";

const emptyState: AppState = {
  organizations: [],
  organizationMembers: [],
  customers: [],
  employees: [],
  jobs: [],
  users: [],
  currentUserId: null,
  activeOrganizationId: null,
};

const mapOrganizationRow = (row: Record<string, unknown>): Organization => ({
  id: String(row.id ?? ""),
  name: String(row.name ?? ""),
  phone: String(row.phone ?? ""),
  email: String(row.email ?? ""),
  address: String(row.address ?? ""),
  createdAt: String(row.created_at ?? ""),
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
  createdAt: String(row.created_at ?? ""),
  updatedAt: String(row.updated_at ?? ""),
});

const mapEmployeeRow = (row: Record<string, unknown>): Employee => ({
  id: String(row.id ?? ""),
  organizationId: String(row.organization_id ?? ""),
  firstName: String(row.first_name ?? ""),
  lastName: String(row.last_name ?? ""),
  email: String(row.email ?? ""),
  phone: String(row.phone ?? ""),
  color: String(row.color ?? "#10b981"),
  active: row.active === true,
  notes: String(row.notes ?? ""),
  createdAt: String(row.created_at ?? ""),
  updatedAt: String(row.updated_at ?? ""),
});

const mapJobRow = (row: Record<string, unknown>): Job => ({
  id: String(row.id ?? ""),
  organizationId: String(row.organization_id ?? ""),
  customerId: String(row.customer_id ?? ""),
  employeeId: row.employee_id ? String(row.employee_id) : null,
  title: String(row.title ?? ""),
  description: String(row.description ?? ""),
  date: String(row.date ?? ""),
  startTime: String(row.start_time ?? ""),
  endTime: String(row.end_time ?? ""),
  status: row.status as Job["status"],
  address: String(row.address ?? ""),
  notes: String(row.notes ?? ""),
  createdAt: String(row.created_at ?? ""),
  updatedAt: String(row.updated_at ?? ""),
});

type SupabaseUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    organization_name?: string;
  };
};

type OrganizationDataResult = {
  state: AppState;
  appError: string | null;
};

const mapSupabaseUser = (user: SupabaseUserLike, organizationId: string): RegisteredUser => {
  const fullName = user.user_metadata?.full_name?.trim().split(/\s+/) ?? [];
  return {
    id: user.id,
    email: user.email ?? "",
    firstName: user.user_metadata?.first_name ?? fullName[0] ?? "Benutzer",
    lastName: user.user_metadata?.last_name ?? fullName.slice(1).join(" "),
    organizationId,
    passwordHash: "",
  };
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.";

interface AppContextValue {
  state: AppState;
  currentUser: RegisteredUser | null;
  activeOrganization: Organization | null;
  isReady: boolean;
  appError: string | null;
  refreshData: (organizationName?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  saveCustomer: (input: CustomerFormInput, customerId?: string) => Promise<Customer>;
  deleteCustomer: (customerId: string) => Promise<void>;
  saveEmployee: (input: EmployeeFormInput, employeeId?: string) => Promise<Employee>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  saveJob: (input: JobFormInput, jobId?: string) => Promise<Job>;
  deleteJob: (jobId: string) => Promise<void>;
  updateOrganization: (name: string, phone: string, email: string, address: string) => Promise<Organization>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Supabase-Konfiguration fehlt</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            CleanFlow benötigt eine echte Supabase-Projekt-URL und einen Publishable Key.
            Tragen Sie <code>NEXT_PUBLIC_SUPABASE_URL</code> und{" "}
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code> ein und
            starten Sie den Entwicklungsserver neu. Es werden keine Demo-Daten angezeigt.
          </p>
        </section>
      </main>
    );
  }

  return <ConfiguredAppProvider>{children}</ConfiguredAppProvider>;
}

function ConfiguredAppProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => createClient(), []);
  const [state, setState] = useState<AppState>(emptyState);
  const [isReady, setIsReady] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUserLike | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  const requireClient = useCallback(() => {
    return client;
  }, [client]);

  const loadOrganizationData = useCallback((user: SupabaseUserLike, preferredOrganizationName?: string) => {
    const load = async (): Promise<OrganizationDataResult> => {
      const client = requireClient();
      const displayName = user.user_metadata?.full_name?.trim()
        || user.email?.split("@")[0]
        || "Benutzer";
      const organizationName = preferredOrganizationName?.trim()
        || user.user_metadata?.organization_name?.trim()
        || `${displayName} Organisation`;
      const { data: organizationId, error: provisionError } = await client.rpc(
        "ensure_current_user_organization",
        { p_organization_name: organizationName },
      );

      if (provisionError) {
        throw new Error(`Organisation konnte nicht eingerichtet werden: ${provisionError.message}`);
      }
      if (!organizationId) {
        throw new Error("Provisionierung hat keine Organisation zurückgegeben.");
      }

      const { data: membership, error: memberError } = await client
        .from("organization_members")
        .select("id, organization_id, role, created_at")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      if (memberError) {
        throw new Error(`Owner-Mitgliedschaft konnte nicht geladen werden: ${memberError.message}`);
      }

      const organizationIdString = String(organizationId);
      const [organizationResult, customersResult, employeesResult, jobsResult] = await Promise.all([
        client.from("organizations").select("*").eq("id", organizationIdString).single(),
        client.from("customers").select("*").eq("organization_id", organizationIdString).order("created_at", { ascending: false }),
        client.from("employees").select("*").eq("organization_id", organizationIdString).order("last_name", { ascending: true }),
        client.from("jobs").select("*").eq("organization_id", organizationIdString).order("date", { ascending: true }).order("start_time", { ascending: true }),
      ]);

      if (organizationResult.error) throw new Error(`Organisation konnte nicht geladen werden: ${organizationResult.error.message}`);
      if (customersResult.error) throw new Error(`Kunden konnten nicht geladen werden: ${customersResult.error.message}`);
      if (employeesResult.error) throw new Error(`Mitarbeiter konnten nicht geladen werden: ${employeesResult.error.message}`);
      if (jobsResult.error) throw new Error(`Aufträge konnten nicht geladen werden: ${jobsResult.error.message}`);
      const organization = mapOrganizationRow(organizationResult.data as Record<string, unknown>);
      const registeredUser = mapSupabaseUser(user, organizationIdString);
      return {
        state: {
          organizations: [organization],
          organizationMembers: [{
            id: String(membership.id),
            organizationId: organizationIdString,
            userId: user.id,
            role: membership.role as "owner" | "manager" | "admin",
            createdAt: String(membership.created_at ?? ""),
          }],
          customers: (customersResult.data ?? []).map((row) => mapCustomerRow(row as Record<string, unknown>)),
          employees: (employeesResult.data ?? []).map((row) => mapEmployeeRow(row as Record<string, unknown>)),
          jobs: (jobsResult.data ?? []).map((row) => mapJobRow(row as Record<string, unknown>)),
          users: [registeredUser],
          currentUserId: user.id,
          activeOrganizationId: organizationIdString,
        },
        appError: null,
      };
    };

    return load();
  }, [requireClient]);

  const refreshData = useCallback(async (organizationName?: string) => {
    try {
      const client = requireClient();
      const { data, error } = await client.auth.getUser();
      if (error) throw new Error(`Sitzung konnte nicht geprüft werden: ${error.message}`);
      if (!data.user) {
        setState(emptyState);
        setSupabaseUser(null);
        setAppError(null);
        setIsReady(true);
        return organizationName
          ? "Die authentifizierte Sitzung konnte nach der Registrierung nicht geladen werden."
          : null;
      }
      setSupabaseUser(data.user);
      const result = await loadOrganizationData(data.user, organizationName);
      setState(result.state);
      setAppError(result.appError);
      setIsReady(true);
      return result.appError;
    } catch (error) {
      const message = errorMessage(error);
      setAppError(
        process.env.NODE_ENV === "development"
          ? message
          : "Ihre Organisation konnte nicht eingerichtet werden. Bitte versuchen Sie es erneut.",
      );
      setIsReady(true);
      return process.env.NODE_ENV === "development"
        ? message
        : "Ihre Organisation konnte nicht eingerichtet werden. Bitte versuchen Sie es erneut.";
    }
  }, [loadOrganizationData, requireClient]);

  useEffect(() => {
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setState(emptyState);
        setSupabaseUser(null);
        setAppError(null);
        setIsReady(true);
        return;
      }

      setSupabaseUser(session.user);
      setIsReady(false);
    });

    return () => subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!supabaseUser) return;
    let isActive = true;

    void Promise.resolve()
      .then(() => loadOrganizationData(supabaseUser))
      .then((result) => {
        if (!isActive) return;
        setState(result.state);
        setAppError(result.appError);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setAppError(
            process.env.NODE_ENV === "development"
              ? errorMessage(error)
              : "Ihre Organisation konnte nicht eingerichtet werden. Bitte versuchen Sie es erneut.",
          );
        }
      })
      .finally(() => {
        if (isActive) setIsReady(true);
      });

    return () => {
      isActive = false;
    };
  }, [loadOrganizationData, supabaseUser]);

  const currentUser = supabaseUser
    ? mapSupabaseUser(supabaseUser, state.activeOrganizationId ?? "")
    : null;
  const activeOrganization = state.organizations.find(
    (organization) => organization.id === state.activeOrganizationId,
  ) ?? null;

  const signOut = useCallback(async () => {
    const { error } = await requireClient().auth.signOut();
    if (error) throw new Error(error.message || "Abmeldung fehlgeschlagen.");
    setState(emptyState);
    setSupabaseUser(null);
    setAppError(null);
    setIsReady(true);
  }, [requireClient]);

  const requireOrganizationId = useCallback(() => {
    if (!state.activeOrganizationId) throw new Error("Es ist keine aktive Organisation geladen.");
    return state.activeOrganizationId;
  }, [state.activeOrganizationId]);

  const saveCustomer = useCallback(async (input: CustomerFormInput, customerId?: string) => {
    const client = requireClient();
    const organizationId = requireOrganizationId();
    const payload = {
      organization_id: organizationId,
      name: input.name.trim(),
      company_name: input.companyName.trim() || null,
      email: input.email.trim() || null,
      phone: input.phone.trim() || null,
      address: input.address.trim() || null,
      postal_code: input.postalCode.trim() || null,
      city: input.city.trim() || null,
      notes: input.notes.trim() || null,
    };
    const query = customerId
      ? client.from("customers").update(payload).eq("id", customerId).eq("organization_id", organizationId)
      : client.from("customers").insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw new Error(`Kunde konnte nicht gespeichert werden: ${error.message}`);
    const customer = mapCustomerRow(data as Record<string, unknown>);
    setState((previous) => ({
      ...previous,
      customers: customerId
        ? previous.customers.map((item) => item.id === customerId ? customer : item)
        : [customer, ...previous.customers],
    }));
    return customer;
  }, [requireClient, requireOrganizationId]);

  const deleteCustomer = useCallback(async (customerId: string) => {
    const client = requireClient();
    const organizationId = requireOrganizationId();
    const { data, error } = await client.from("customers").delete()
      .eq("id", customerId).eq("organization_id", organizationId).select("id").maybeSingle();
    if (error) throw new Error(`Kunde konnte nicht gelöscht werden: ${error.message}`);
    if (!data) throw new Error("Der Kunde wurde nicht gefunden oder ist bereits gelöscht.");
    setState((previous) => ({
      ...previous,
      customers: previous.customers.filter((customer) => customer.id !== customerId),
    }));
  }, [requireClient, requireOrganizationId]);

  const saveEmployee = useCallback(async (input: EmployeeFormInput, employeeId?: string) => {
    const client = requireClient();
    const organizationId = requireOrganizationId();
    const payload = {
      organization_id: organizationId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email.trim() || null,
      phone: input.phone.trim() || null,
      color: input.color,
      active: input.active,
      notes: input.notes.trim() || null,
    };
    const query = employeeId
      ? client.from("employees").update(payload).eq("id", employeeId).eq("organization_id", organizationId)
      : client.from("employees").insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw new Error(`Mitarbeiter konnte nicht gespeichert werden: ${error.message}`);
    const employee = mapEmployeeRow(data as Record<string, unknown>);
    setState((previous) => ({
      ...previous,
      employees: employeeId
        ? previous.employees.map((item) => item.id === employeeId ? employee : item)
        : [...previous.employees, employee],
    }));
    return employee;
  }, [requireClient, requireOrganizationId]);

  const deleteEmployee = useCallback(async (employeeId: string) => {
    const client = requireClient();
    const organizationId = requireOrganizationId();
    const { data, error } = await client.from("employees").delete()
      .eq("id", employeeId).eq("organization_id", organizationId).select("id").maybeSingle();
    if (error) throw new Error(`Mitarbeiter konnte nicht gelöscht werden: ${error.message}`);
    if (!data) throw new Error("Der Mitarbeiter wurde nicht gefunden oder ist bereits gelöscht.");
    setState((previous) => ({
      ...previous,
      employees: previous.employees.filter((employee) => employee.id !== employeeId),
      jobs: previous.jobs.map((job) => job.employeeId === employeeId ? { ...job, employeeId: null } : job),
    }));
  }, [requireClient, requireOrganizationId]);

  const saveJob = useCallback(async (input: JobFormInput, jobId?: string) => {
    const client = requireClient();
    const organizationId = requireOrganizationId();
    const payload = {
      organization_id: organizationId,
      customer_id: input.customerId,
      employee_id: input.employeeId || null,
      title: input.title.trim(),
      description: input.description.trim() || null,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime || null,
      status: input.status,
      address: input.address.trim() || null,
      notes: input.notes.trim() || null,
    };
    const query = jobId
      ? client.from("jobs").update(payload).eq("id", jobId).eq("organization_id", organizationId)
      : client.from("jobs").insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw new Error(`Auftrag konnte nicht gespeichert werden: ${error.message}`);
    const job = mapJobRow(data as Record<string, unknown>);
    setState((previous) => ({
      ...previous,
      jobs: jobId
        ? previous.jobs.map((item) => item.id === jobId ? job : item)
        : [...previous.jobs, job],
    }));
    return job;
  }, [requireClient, requireOrganizationId]);

  const deleteJob = useCallback(async (jobId: string) => {
    const client = requireClient();
    const organizationId = requireOrganizationId();
    const { data, error } = await client.from("jobs").delete()
      .eq("id", jobId).eq("organization_id", organizationId).select("id").maybeSingle();
    if (error) throw new Error(`Auftrag konnte nicht gelöscht werden: ${error.message}`);
    if (!data) throw new Error("Der Auftrag wurde nicht gefunden oder ist bereits gelöscht.");
    setState((previous) => ({
      ...previous,
      jobs: previous.jobs.filter((job) => job.id !== jobId),
    }));
  }, [requireClient, requireOrganizationId]);

  const updateOrganization = useCallback(async (name: string, phone: string, email: string, address: string) => {
    const client = requireClient();
    const organizationId = requireOrganizationId();
    const { data, error } = await client.from("organizations")
      .update({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() })
      .eq("id", organizationId)
      .select()
      .single();
    if (error) throw new Error(`Organisation konnte nicht gespeichert werden: ${error.message}`);
    const organization = mapOrganizationRow(data as Record<string, unknown>);
    setState((previous) => ({
      ...previous,
      organizations: previous.organizations.map((item) => item.id === organizationId ? organization : item),
    }));
    return organization;
  }, [requireClient, requireOrganizationId]);

  const value = useMemo<AppContextValue>(() => ({
    state,
    currentUser,
    activeOrganization,
    isReady,
    appError,
    refreshData,
    signOut,
    saveCustomer,
    deleteCustomer,
    saveEmployee,
    deleteEmployee,
    saveJob,
    deleteJob,
    updateOrganization,
  }), [
    activeOrganization, appError, currentUser, deleteCustomer, deleteEmployee, deleteJob, isReady,
    refreshData, saveCustomer, saveEmployee, saveJob, signOut, state, updateOrganization,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
