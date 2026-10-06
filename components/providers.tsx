"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { translate } from "@/lib/i18n";
import {
  type AppState,
  type AppLanguage,
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
  workdayStart: String(row.workday_start ?? "06:00").slice(0, 5),
  workdayEnd: String(row.workday_end ?? "24:00").slice(0, 5),
  weekStartsOn: Number(row.week_starts_on ?? 1),
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
  userId: row.user_id ? String(row.user_id) : null,
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
  language: AppLanguage;
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
  currentRole: "owner" | "employee" | null;
  language: AppLanguage;
  t: (message: string) => string;
  activeOrganization: Organization | null;
  isReady: boolean;
  appError: string | null;
  refreshData: (organizationName?: string, debugSignup?: boolean) => Promise<string | null>;
  signOut: () => Promise<void>;
  saveCustomer: (input: CustomerFormInput, customerId?: string) => Promise<Customer>;
  deleteCustomer: (customerId: string) => Promise<void>;
  saveEmployee: (input: EmployeeFormInput, employeeId?: string) => Promise<Employee>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  saveJob: (input: JobFormInput, jobId?: string) => Promise<Job>;
  deleteJob: (jobId: string) => Promise<void>;
  updateOrganization: (name: string, phone: string, email: string, address: string) => Promise<Organization>;
  updateOrganizationSettings: (settings: Pick<Organization, "name" | "email" | "workdayStart" | "workdayEnd" | "weekStartsOn">) => Promise<Organization>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  updateMyJobStatus: (jobId: string, status: "in_progress" | "completed") => Promise<void>;
  createEmployeeInvitation: (employeeId: string) => Promise<{ url: string; expiresAt: string }>;
  changePassword: (password: string) => Promise<void>;
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
  const [language, setLanguageState] = useState<AppLanguage>("de");
  const dataLoadGeneration = useRef(0);
  const t = useCallback((message: string) => translate(language, message), [language]);

  const requireClient = useCallback(() => {
    return client;
  }, [client]);

  const loadOrganizationData = useCallback((
    user: SupabaseUserLike,
    preferredOrganizationName?: string,
    debugSignup = false,
  ) => {
    const load = async (): Promise<OrganizationDataResult> => {
      const client = requireClient();
      const displayName = user.user_metadata?.full_name?.trim()
        || user.email?.split("@")[0]
        || "Benutzer";
      const organizationName = preferredOrganizationName?.trim()
        || user.user_metadata?.organization_name?.trim()
        || `${displayName} Organisation`;
      const mayProvisionOrganization = Boolean(
        preferredOrganizationName?.trim() || user.user_metadata?.organization_name?.trim(),
      );
      const { data: memberships, error: memberError } = await client
        .from("organization_members")
        .select("id, organization_id, role, language, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (memberError) {
        throw new Error(`Mitgliedschaft konnte nicht geladen werden: ${memberError.message}`);
      }

      let membership = memberships?.[0] ?? null;
      if (!membership && mayProvisionOrganization) {
        const { data: organizationId, error: provisionError } = await client.rpc(
          "ensure_current_user_organization",
          { p_organization_name: organizationName },
        );
        if (debugSignup && process.env.NODE_ENV === "development") {
          console.info("[signup] PROVISION RESULT", JSON.stringify({
            data: organizationId ?? null,
            errorMessage: provisionError?.message ?? null,
            errorCode: provisionError?.code ?? null,
          }, null, 2));
        }
        if (provisionError) {
          throw new Error(`Organisation konnte nicht eingerichtet werden: ${provisionError.message}`);
        }
        if (!organizationId) throw new Error("Provisionierung hat keine Organisation zurückgegeben.");

        const membershipResult = await client
          .from("organization_members")
          .select("id, organization_id, role, language, created_at")
          .eq("organization_id", organizationId)
          .eq("user_id", user.id)
          .single();
        if (membershipResult.error) {
          throw new Error(`Owner-Mitgliedschaft konnte nicht geladen werden: ${membershipResult.error.message}`);
        }
        membership = membershipResult.data;
      }
      if (!membership) {
        throw new Error("Für dieses Konto wurde keine Organisationsmitgliedschaft gefunden.");
      }

      const organizationIdString = String(membership.organization_id);
      let organizationRow: Record<string, unknown>;
      if (membership.role === "employee") {
        const { data, error: organizationError } = await client.rpc("get_my_employee_organization");
        if (organizationError) throw new Error(`Organisation konnte nicht geladen werden: ${organizationError.message}`);
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || typeof row !== "object") throw new Error("Mitarbeiterorganisation konnte nicht gefunden werden.");
        organizationRow = row as Record<string, unknown>;
      } else {
        const { data, error: organizationError } = await client
          .from("organizations")
          .select("*")
          .eq("id", organizationIdString)
          .single();
        if (organizationError) throw new Error(`Organisation konnte nicht geladen werden: ${organizationError.message}`);
        organizationRow = data as Record<string, unknown>;
      }

      const organization = mapOrganizationRow(organizationRow as Record<string, unknown>);
      const registeredUser = mapSupabaseUser(user, organizationIdString);
      const organizationMember = {
        id: String(membership.id),
        organizationId: organizationIdString,
        userId: user.id,
        role: membership.role as "owner" | "employee",
        language: membership.language as AppLanguage,
        createdAt: String(membership.created_at ?? ""),
      };

      if (membership.role === "employee") {
        const { data: assignedRows, error: assignedError } = await client.rpc("get_my_jobs");
        if (assignedError) throw new Error(`Eigene Aufträge konnten nicht geladen werden: ${assignedError.message}`);
        const rows = (assignedRows ?? []) as unknown as Array<Record<string, unknown>>;
        const jobs = rows.map((row) => mapJobRow(row));
        const customers = Array.from(new Map(rows.map((row) => {
          const customer = mapCustomerRow({
            id: row.customer_id,
            organization_id: organizationIdString,
            name: row.customer_name,
            company_name: row.customer_company_name,
            address: row.customer_address,
          });
          return [customer.id, customer] as const;
        })).values());
        const employeeById = new Map<string, Employee>();
        rows.forEach((row) => {
          const id = String(row.employee_id ?? "");
          if (!id || employeeById.has(id)) return;
          employeeById.set(id, mapEmployeeRow({
            id,
            organization_id: organizationIdString,
            first_name: row.employee_first_name,
            last_name: row.employee_last_name,
            active: true,
          }));
        });
        return {
          state: {
            organizations: [organization],
            organizationMembers: [organizationMember],
            customers,
            employees: Array.from(employeeById.values()),
            jobs,
            users: [registeredUser],
            currentUserId: user.id,
            activeOrganizationId: organizationIdString,
          },
          appError: null,
          language: membership.language as AppLanguage,
        };
      }

      const [customersResult, employeesResult, jobsResult] = await Promise.all([
        client.from("customers").select("*").eq("organization_id", organizationIdString).order("created_at", { ascending: false }),
        client.from("employees").select("*").eq("organization_id", organizationIdString).order("last_name", { ascending: true }),
        client.from("jobs").select("*").eq("organization_id", organizationIdString).order("date", { ascending: true }).order("start_time", { ascending: true }),
      ]);
      if (customersResult.error) throw new Error(`Kunden konnten nicht geladen werden: ${customersResult.error.message}`);
      if (employeesResult.error) throw new Error(`Mitarbeiter konnten nicht geladen werden: ${employeesResult.error.message}`);
      if (jobsResult.error) throw new Error(`Aufträge konnten nicht geladen werden: ${jobsResult.error.message}`);

      return {
        state: {
          organizations: [organization],
          organizationMembers: [organizationMember],
          customers: (customersResult.data ?? []).map((row) => mapCustomerRow(row as Record<string, unknown>)),
          employees: (employeesResult.data ?? []).map((row) => mapEmployeeRow(row as Record<string, unknown>)),
          jobs: (jobsResult.data ?? []).map((row) => mapJobRow(row as Record<string, unknown>)),
          users: [registeredUser],
          currentUserId: user.id,
          activeOrganizationId: organizationIdString,
        },
        appError: null,
        language: membership.language as AppLanguage,
      };
    };

    return load();
  }, [requireClient]);

  const refreshData = useCallback(async (organizationName?: string, debugSignup = false) => {
    const generation = ++dataLoadGeneration.current;
    try {
      const client = requireClient();
      const { data, error } = await client.auth.getUser();
      if (error) throw new Error(`Sitzung konnte nicht geprüft werden: ${error.message}`);
      if (generation !== dataLoadGeneration.current) return null;
      if (!data.user) {
        setState(emptyState);
        setSupabaseUser(null);
        setAppError(null);
        setIsReady(true);
        return organizationName
          ? "Die authentifizierte Sitzung konnte nach der Registrierung nicht geladen werden."
          : null;
      }
      const result = await loadOrganizationData(data.user, organizationName, debugSignup);
      if (generation !== dataLoadGeneration.current) return null;
      setSupabaseUser((current) => current?.id === data.user.id ? current : data.user);
      setState(result.state);
      setAppError(result.appError);
      setLanguageState(result.language);
      window.localStorage.setItem("orvio-language", result.language);
      setIsReady(true);
      return result.appError;
    } catch (error) {
      if (generation !== dataLoadGeneration.current) return null;
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
      dataLoadGeneration.current += 1;
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
    const generation = ++dataLoadGeneration.current;

    void Promise.resolve()
      .then(() => loadOrganizationData(supabaseUser))
      .then((result) => {
        if (!isActive || generation !== dataLoadGeneration.current) return;
        setState(result.state);
        setAppError(result.appError);
        setLanguageState(result.language);
        window.localStorage.setItem("orvio-language", result.language);
      })
      .catch((error: unknown) => {
        if (isActive && generation === dataLoadGeneration.current) {
          setAppError(
            process.env.NODE_ENV === "development"
              ? errorMessage(error)
              : "Ihre Organisation konnte nicht eingerichtet werden. Bitte versuchen Sie es erneut.",
          );
        }
      })
      .finally(() => {
        if (isActive && generation === dataLoadGeneration.current) setIsReady(true);
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
  const currentRole = state.organizationMembers.find((member) => member.userId === state.currentUserId)?.role ?? null;

  const signOut = useCallback(async () => {
    const { error } = await requireClient().auth.signOut();
    if (error) throw new Error(error.message || "Abmeldung fehlgeschlagen.");
    dataLoadGeneration.current += 1;
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

  const updateOrganizationSettings = useCallback(async (
    settings: Pick<Organization, "name" | "email" | "workdayStart" | "workdayEnd" | "weekStartsOn">,
  ) => {
    const client = requireClient();
    const organizationId = requireOrganizationId();
    const { data, error } = await client.from("organizations")
      .update({
        name: settings.name.trim(),
        email: settings.email.trim(),
        workday_start: settings.workdayStart,
        workday_end: settings.workdayEnd,
        week_starts_on: settings.weekStartsOn,
      })
      .eq("id", organizationId)
      .select()
      .single();
    if (error) throw new Error(`Einstellungen konnten nicht gespeichert werden: ${error.message}`);
    const organization = mapOrganizationRow(data as Record<string, unknown>);
    setState((previous) => ({
      ...previous,
      organizations: previous.organizations.map((item) => item.id === organizationId ? organization : item),
    }));
    return organization;
  }, [requireClient, requireOrganizationId]);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    const { error } = await requireClient().rpc("set_my_language", { p_language: nextLanguage });
    if (error) throw new Error(`Sprache konnte nicht gespeichert werden: ${error.message}`);
    setLanguageState(nextLanguage);
    window.localStorage.setItem("orvio-language", nextLanguage);
    setState((previous) => ({
      ...previous,
      organizationMembers: previous.organizationMembers.map((member) =>
        member.userId === previous.currentUserId ? { ...member, language: nextLanguage } : member,
      ),
    }));
  }, [requireClient]);

  const updateMyJobStatus = useCallback(async (jobId: string, status: "in_progress" | "completed") => {
    const { error } = await requireClient().rpc("update_my_job_status", {
      p_job_id: jobId,
      p_new_status: status,
    });
    if (error) throw new Error(`Auftragsstatus konnte nicht geändert werden: ${error.message}`);
    setState((previous) => ({
      ...previous,
      jobs: previous.jobs.map((job) => job.id === jobId ? { ...job, status } : job),
    }));
  }, [requireClient]);

  const createEmployeeInvitation = useCallback(async (employeeId: string) => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { data, error } = await requireClient().rpc("create_employee_invitation", {
      p_employee_id: employeeId,
      p_token: token,
    });
    if (error) throw new Error(`Einladung konnte nicht erstellt werden: ${error.message}`);
    return {
      url: `${window.location.origin}/join/${token}`,
      expiresAt: String(data),
    };
  }, [requireClient]);

  const changePassword = useCallback(async (password: string) => {
    const { error } = await requireClient().auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }, [requireClient]);

  const value = useMemo<AppContextValue>(() => ({
    state,
    currentUser,
    currentRole,
    language,
    t,
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
    updateOrganizationSettings,
    setLanguage,
    updateMyJobStatus,
    createEmployeeInvitation,
    changePassword,
  }), [
    activeOrganization, appError, changePassword, createEmployeeInvitation, currentRole, currentUser, deleteCustomer,
    deleteEmployee, deleteJob, isReady, language, refreshData, saveCustomer, saveEmployee,
    saveJob, setLanguage, signOut, state, updateMyJobStatus, updateOrganization,
    updateOrganizationSettings, t,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
