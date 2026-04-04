export type DefaultServiceOption = {
  key: string;
  name: string;
  durationMin: number;
  priceCents: number;
  description: string;
};

export const DEFAULT_PETSHOP_SERVICES: DefaultServiceOption[] = [
  {
    key: "banho-simples",
    name: "Banho simples",
    durationMin: 60,
    priceCents: 7000,
    description: "Banho completo com secagem e finalização básica."
  },
  {
    key: "banho-e-tosa",
    name: "Banho e tosa",
    durationMin: 90,
    priceCents: 12000,
    description: "Banho com tosa completa conforme padrão da raça ou pedido do tutor."
  },
  {
    key: "tosa-higienica",
    name: "Tosa higiênica",
    durationMin: 45,
    priceCents: 6500,
    description: "Higienização de áreas íntimas, patas e barriga."
  },
  {
    key: "hidratacao-pelos",
    name: "Hidratação de pelos",
    durationMin: 40,
    priceCents: 5500,
    description: "Tratamento hidratante para brilho e maciez da pelagem."
  },
  {
    key: "desembolo",
    name: "Desembolo de pelos",
    durationMin: 50,
    priceCents: 6000,
    description: "Remoção cuidadosa de nós e pelagem embaraçada."
  },
  {
    key: "corte-unhas",
    name: "Corte de unhas",
    durationMin: 20,
    priceCents: 3000,
    description: "Corte e acabamento de unhas com segurança."
  },
  {
    key: "limpeza-ouvidos",
    name: "Limpeza de ouvidos",
    durationMin: 20,
    priceCents: 2800,
    description: "Higienização externa dos ouvidos com produto apropriado."
  },
  {
    key: "escovacao-dental",
    name: "Escovação dental",
    durationMin: 25,
    priceCents: 3200,
    description: "Escovação preventiva e redução de placa superficial."
  },
  {
    key: "taxi-pet",
    name: "Táxi pet",
    durationMin: 30,
    priceCents: 4000,
    description: "Serviço de leva e traz para facilitar o atendimento."
  },
  {
    key: "daycare",
    name: "Daycare",
    durationMin: 480,
    priceCents: 9000,
    description: "Permanência durante o dia com atividades e supervisão."
  },
  {
    key: "hotelzinho",
    name: "Hotelzinho",
    durationMin: 1440,
    priceCents: 18000,
    description: "Hospedagem por diária com rotinas de cuidado."
  },
  {
    key: "adestramento-basico",
    name: "Adestramento básico",
    durationMin: 60,
    priceCents: 15000,
    description: "Sessão inicial para comandos básicos e socialização."
  }
];
