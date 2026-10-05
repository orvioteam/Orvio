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
    organization_name?: string;
  };
};

const mapSupabaseUser = (
  user: SupabaseUserLike,
  organizationId: string,
): RegisteredUser => ({
  id: user.id,
  email: user.email ?? "",
  firstName: user.user_metadata?.first_name ?? "Benutzer",
  lastName: user.user_metadata?.last_name ?? "",
  organizationId,
  passwordHash: "",
});

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.";

class AuthFlowError extends Error {}

interface AppContextValue {
  state: AppState;
  currentUser: RegisteredUser | null;
  activeOrganization: Organization | null;
  isReady: boolean;
  appError: string | null;
  refreshData: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<RegisteredUser>;
  signUp: (input: SignUpInput) => Promise<
    | { status: "authenticated"; user: RegisteredUser }
    | { status: "confirmation_required" }
  >;
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
  if (!hasSupabase) {
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
  const [state, setState] = useState<AppState>(emptyState);
  const [isReady, setIsReady] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUserLike | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  const requireClient = useCallback(() => {
    if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
    return supabase;
  }, []);

  const hydrateSupabaseState = useCallback(async (user: SupabaseUserLike) => {
    const client = requireClient();
    const { data: membership, error: memberError } = await client
      .from("organization_members")
      .select("id, organization_id, role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberError) throw new Error(`Mitgliedschaft konnte nicht geladen werden: ${memberError.message}`);
    let memberData = membership;
    if (!memberData) {
      const organizationName = user.user_metadata?.organization_name?.trim();
      if (!organizationName) {
        throw new Error("Für dieses Benutzerkonto ist noch keine Organisation eingerichtet.");
      }

      const { data: existingOrganization, error: lookupError } = await client
        .from("organizations")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();
      if (lookupError) throw new Error(`Organisation konnte nicht geprüft werden: ${lookupError.message}`);

      let organization = existingOrganization;
      if (!organization) {
        const { data, error } = await client
          .from("organizations")
          .insert({ name: organizationName, email: user.email ?? "", created_by: user.id })
          .select()
          .single();
        if (error) throw new Error(`Organisation konnte nicht erstellt werden: ${error.message}`);
        organization = data;
      }

      const { data: newMembership, error: createMemberError } = await client
        .from("organization_members")
        .insert({ organization_id: organization.id, user_id: user.id, role: "owner" })
        .select("id, organization_id, role, created_at")
        .single();
      if (createMemberError) throw new Error(`Mitgliedschaft konnte nicht angelegt werden: ${createMemberError.message}`);
      memberData = newMembership;
    }

    const organizationId = String(memberData.organization_id);
    const [organizationResult, customersResult, employeesResult, jobsResult] = await Promise.all([
      client.from("organizations").select("*").eq("id", organizationId).single(),
      client.from("customers").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
      client.from("employees").select("*").eq("organization_id", organizationId).order("last_name", { ascending: true }),
      client.from("jobs").select("*").eq("organization_id", organizationId).order("date", { ascending: true }).order("start_time", { ascending: true }),
    ]);

    if (organizationResult.error) throw new Error(`Organisation konnte nicht geladen werden: ${organizationResult.error.message}`);
    if (customersResult.error) throw new Error(`Kunden konnten nicht geladen werden: ${customersResult.error.message}`);
    if (employeesResult.error) throw new Error(`Mitarbeiter konnten nicht geladen werden: ${employeesResult.error.message}`);
    if (jobsResult.error) throw new Error(`Aufträge konnten nicht geladen werden: ${jobsResult.error.message}`);

    const organization = mapOrganizationRow(organizationResult.data as Record<string, unknown>);
    const registeredUser = mapSupabaseUser(user, organizationId);
    setSupabaseUser(user);
    setState({
      organizations: [organization],
      organizationMembers: [{
        id: String(memberData.id),
        organizationId,
        userId: user.id,
        role: memberData.role as "owner" | "manager" | "admin",
        createdAt: String(memberData.created_at ?? ""),
      }],
      customers: (customersResult.data ?? []).map((row) => mapCustomerRow(row as Record<string, unknown>)),
      employees: (employeesResult.data ?? []).map((row) => mapEmployeeRow(row as Record<string, unknown>)),
      jobs: (jobsResult.data ?? []).map((row) => mapJobRow(row as Record<string, unknown>)),
      users: [registeredUser],
      currentUserId: user.id,
      activeOrganizationId: organizationId,
    });
    setAppError(null);
    return registeredUser;
  }, [requireClient]);

  const refreshData = useCallback(async () => {
    setAppError(null);
    try {
      const client = requireClient();
      const { data, error } = await client.auth.getUser();
      if (error) throw new Error(`Sitzung konnte nicht geprüft werden: ${error.message}`);
      if (!data.user) {
        setState(emptyState);
        setSupabaseUser(null);
        return;
      }
      await hydrateSupabaseState(data.user);
    } catch (error) {
      setState(emptyState);
      setSupabaseUser(null);
      setAppError(errorMessage(error));
    }
  }, [hydrateSupabaseState, requireClient]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw new Error(`Sitzung konnte nicht geladen werden: ${error.message}`);
        if (data.session?.user) await hydrateSupabaseState(data.session.user);
      } catch (error) {
        if (isMounted) {
          setAppError(errorMessage(error));
          setState(emptyState);
          setSupabaseUser(null);
        }
      } finally {
        if (isMounted) setIsReady(true);
      }
    };

    void initialize();

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setState(emptyState);
        setSupabaseUser(null);
        setAppError(null);
      } else if (event === "USER_UPDATED") {
        void hydrateSupabaseState(session.user).catch((error: unknown) => setAppError(errorMessage(error)));
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [hydrateSupabaseState]);

  const currentUser = supabaseUser
    ? mapSupabaseUser(supabaseUser, state.activeOrganizationId ?? "")
    : null;
  const activeOrganization = state.organizations.find(
    (organization) => organization.id === state.activeOrganizationId,
  ) ?? null;

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const client = requireClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Supabase rejected the CleanFlow sign-in request.", error);
        const message = error.code === "email_not_confirmed"
          ? "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse."
          : error.code === "invalid_credentials"
            ? "E-Mail oder Passwort ist nicht korrekt."
            : "Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.";
        throw new AuthFlowError(message);
      }
      if (!data.user) throw new Error("Supabase hat nach dem Login keinen Benutzer zurückgegeben.");

      const { data: authenticatedData, error: identityError } = await client.auth.getUser();
      if (identityError) throw identityError;
      if (authenticatedData.user?.id !== data.user.id) {
        throw new Error("Die Supabase-Sitzung konnte nicht bestätigt werden.");
      }

      const user = await hydrateSupabaseState(authenticatedData.user);
      setAppError(null);
      return user;
    } catch (hydrateError) {
      if (hydrateError instanceof AuthFlowError) throw hydrateError;
      console.error("CleanFlow sign-in could not be completed.", hydrateError);
      setAppError(null);
      throw new AuthFlowError("Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.");
    }
  }, [hydrateSupabaseState, requireClient]);

  const signUp = useCallback(async (input: SignUpInput) => {
    try {
      const client = requireClient();
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

      if (error) throw error;
      if (!data.user) throw new Error("Supabase hat kein Benutzerkonto zurückgegeben.");
      if (data.user.identities?.length === 0) {
        throw new Error("Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut oder melden Sie sich an.");
      }
      if (!data.session) {
        return { status: "confirmation_required" as const };
      }

      const { data: authenticatedData, error: identityError } = await client.auth.getUser();
      if (identityError) throw identityError;
      if (authenticatedData.user?.id !== data.user.id) throw new Error("Der angemeldete Benutzer stimmt nicht mit dem neuen Konto überein.");

      const user = await hydrateSupabaseState(authenticatedData.user);
      return { status: "authenticated" as const, user };
    } catch (error) {
      console.error("CleanFlow registration could not be completed.", error);
      throw new Error("Registrierung konnte nicht abgeschlossen werden.");
    }
  }, [hydrateSupabaseState, requireClient]);

  const signOut = useCallback(async () => {
    const { error } = await requireClient().auth.signOut();
    if (error) throw new Error(error.message || "Abmeldung fehlgeschlagen.");
    setState(emptyState);
    setSupabaseUser(null);
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
  }), [
    activeOrganization, appError, currentUser, deleteCustomer, deleteEmployee, deleteJob, isReady,
    refreshData, saveCustomer, saveEmployee, saveJob, signIn, signOut, signUp, state, updateOrganization,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
