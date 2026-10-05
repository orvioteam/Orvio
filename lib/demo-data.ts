import { AppState, Customer, Employee, Job, Organization, RegisteredUser } from "@/lib/types";

export const STORAGE_KEY = "cleanflow-state-v1";

const demoPasswordHash = "342ab287291f0b80be808d2c860b246576119d0b49791394900e5b15d6e3fd08";

export function createSeedState(): AppState {
  const organization: Organization = {
    id: "org-sauberplus",
    name: "SauberPlus Reinigung",
    phone: "+41 44 555 88 11",
    email: "hello@sauberplus.ch",
    address: "Bahnhofstrasse 10, 8001 Zürich",
    createdAt: "2025-08-01T08:00:00.000Z",
  };

  const users: RegisteredUser[] = [
    {
      id: "user-anna",
      email: "owner@sauberplus.ch",
      passwordHash: demoPasswordHash,
      firstName: "Anna",
      lastName: "Müller",
      organizationId: organization.id,
    },
  ];

  const customers: Customer[] = [
    {
      id: "cust-mueller-ag",
      organizationId: organization.id,
      name: "Luca Müller",
      companyName: "Müller AG",
      email: "luca@muellerag.ch",
      phone: "+41 44 555 12 22",
      address: "Bahnhofstrasse 22",
      postalCode: "8001",
      city: "Zürich",
      notes: "Büroreinigung wöchentlich",
      createdAt: "2025-08-05T08:00:00.000Z",
      updatedAt: "2025-08-05T08:00:00.000Z",
    },
    {
      id: "cust-keller-privat",
      organizationId: organization.id,
      name: "Sara Meier",
      companyName: "Keller Privat",
      email: "sara@example.ch",
      phone: "+41 78 111 44 66",
      address: "Kellerweg 6",
      postalCode: "8400",
      city: "Winterthur",
      notes: "Privathaushalt",
      createdAt: "2025-08-07T09:15:00.000Z",
      updatedAt: "2025-08-07T09:15:00.000Z",
    },
    {
      id: "cust-meier-gmbh",
      organizationId: organization.id,
      name: "Sophie Meier",
      companyName: "Meier GmbH",
      email: "kontakt@meiergmbh.ch",
      phone: "+41 44 777 90 30",
      address: "Industriestrasse 18",
      postalCode: "8050",
      city: "Zürich",
      notes: "Regular maintenance",
      createdAt: "2025-08-10T11:00:00.000Z",
      updatedAt: "2025-08-10T11:00:00.000Z",
    },
    {
      id: "cust-buero-zentrum",
      organizationId: organization.id,
      name: "Daniel Keller",
      companyName: "Büro Zentrum AG",
      email: "office@buerozentrum.ch",
      phone: "+41 44 600 33 11",
      address: "Limmatquai 44",
      postalCode: "8001",
      city: "Zürich",
      notes: "Grossraum-Büro",
      createdAt: "2025-08-12T15:00:00.000Z",
      updatedAt: "2025-08-12T15:00:00.000Z",
    },
  ];

  const employees: Employee[] = [
    {
      id: "emp-luca",
      organizationId: organization.id,
      firstName: "Luca",
      lastName: "Müller",
      email: "luca@sauberplus.ch",
      phone: "+41 79 442 10 11",
      color: "#10b981",
      active: true,
      notes: "Verantwortlich für Büroflächen",
      createdAt: "2025-08-02T08:00:00.000Z",
      updatedAt: "2025-08-02T08:00:00.000Z",
    },
    {
      id: "emp-sara",
      organizationId: organization.id,
      firstName: "Sara",
      lastName: "Meier",
      email: "sara@sauberplus.ch",
      phone: "+41 79 551 19 91",
      color: "#f59e0b",
      active: true,
      notes: "Wohnungsreinigung",
      createdAt: "2025-08-02T08:15:00.000Z",
      updatedAt: "2025-08-02T08:15:00.000Z",
    },
    {
      id: "emp-david",
      organizationId: organization.id,
      firstName: "David",
      lastName: "Keller",
      email: "david@sauberplus.ch",
      phone: "+41 76 223 88 22",
      color: "#3b82f6",
      active: false,
      notes: "Zurzeit inaktiv",
      createdAt: "2025-08-02T08:30:00.000Z",
      updatedAt: "2025-08-02T08:30:00.000Z",
    },
  ];

  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);
  const jobs: Job[] = [
    {
      id: "job-1",
      organizationId: organization.id,
      customerId: "cust-mueller-ag",
      employeeId: "emp-luca",
      title: "Büroreinigung",
      description: "Grundreinigung und Schreibtische",
      date: isoDate,
      startTime: "08:00",
      endTime: "10:00",
      status: "scheduled",
      address: "Bahnhofstrasse 22, 8001 Zürich",
      notes: "Bitte Eingangstür beachten",
      createdAt: "2025-08-11T07:00:00.000Z",
      updatedAt: "2025-08-11T07:00:00.000Z",
    },
    {
      id: "job-2",
      organizationId: organization.id,
      customerId: "cust-keller-privat",
      employeeId: "emp-sara",
      title: "Privatreinigung",
      description: "Wohnungsservice",
      date: isoDate,
      startTime: "10:30",
      endTime: "12:00",
      status: "scheduled",
      address: "Kellerweg 6, 8400 Winterthur",
      notes: "Küche und Badezimmer",
      createdAt: "2025-08-11T07:05:00.000Z",
      updatedAt: "2025-08-11T07:05:00.000Z",
    },
    {
      id: "job-3",
      organizationId: organization.id,
      customerId: "cust-meier-gmbh",
      employeeId: "emp-luca",
      title: "Unterhaltsreinigung",
      description: "Flure und Konferenzräume",
      date: isoDate,
      startTime: "13:00",
      endTime: "15:00",
      status: "in_progress",
      address: "Industriestrasse 18, 8050 Zürich",
      notes: "Kaffeeautomat reinigen",
      createdAt: "2025-08-11T07:10:00.000Z",
      updatedAt: "2025-08-11T07:10:00.000Z",
    },
    {
      id: "job-4",
      organizationId: organization.id,
      customerId: "cust-buero-zentrum",
      employeeId: "emp-sara",
      title: "Büroreinigung",
      description: "Gemeinschaftsbereiche",
      date: isoDate,
      startTime: "15:30",
      endTime: "17:00",
      status: "completed",
      address: "Limmatquai 44, 8001 Zürich",
      notes: "Abgeschlossen am Vortag",
      createdAt: "2025-08-10T07:00:00.000Z",
      updatedAt: "2025-08-10T07:00:00.000Z",
    },
  ];

  return {
    organizations: [organization],
    organizationMembers: [
      {
        id: "member-anna",
        organizationId: organization.id,
        userId: "user-anna",
        role: "owner",
        createdAt: "2025-08-01T08:00:00.000Z",
      },
    ],
    customers,
    employees,
    jobs,
    users,
    currentUserId: "user-anna",
    activeOrganizationId: organization.id,
  };
}

export function getInitialState(): AppState {
  if (typeof window === "undefined") {
    return createSeedState();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as AppState;
    } catch {
      return createSeedState();
    }
  }

  const initial = createSeedState();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

export function persistState(state: AppState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
