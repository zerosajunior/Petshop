export type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export type DashboardMetrics = {
  appointmentsToday: number;
  pendingConfirmations: number;
  smsSentLast24h: number;
  lowStockProducts: number;
  activeCampaigns: number;
};

export type DashboardAppointmentItem = {
  id: string;
  petName: string;
  customerName: string;
  serviceName: string;
  startsAt: string;
  status: string;
};

export type DashboardMessageItem = {
  id: string;
  channel: "SMS" | "WHATSAPP";
  toPhone: string;
  body: string;
  createdAt: string;
};

export type DashboardStockItem = {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
};

export type DashboardCampaignItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  segmentPetType: string | null;
};

export type DashboardData = DashboardMetrics & {
  totalCustomers: number;
  totalPets: number;
  totalServices: number;
  totalProducts: number;
  totalCampaigns: number;
  totalAppointments: number;
  appointmentsTodayItems: DashboardAppointmentItem[];
  smsSentLast24hItems: DashboardMessageItem[];
  lowStockProductsItems: DashboardStockItem[];
  activeCampaignItems: DashboardCampaignItem[];
};
