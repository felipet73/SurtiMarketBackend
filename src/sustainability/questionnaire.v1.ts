export const QUESTIONNAIRE_V1 = {
  version: 1,
  scale: { min: 0, max: 4 },
  dimensions: ['waste', 'transport', 'energy', 'water', 'consumption'] as const,
  questions: [
    // WASTE (0,1)
    { id: 1, dimension: 'waste', text: '¿Con qué frecuencia separas residuos (orgánico/reciclable/no reciclable)?' },
    { id: 2, dimension: 'waste', text: '¿Con qué frecuencia reutilizas envases o bolsas en lugar de usar nuevas?' },

    // TRANSPORT (2,3)
    { id: 3, dimension: 'transport', text: '¿Qué tan seguido usas transporte público, bicicleta o caminas en lugar de auto?' },
    { id: 4, dimension: 'transport', text: '¿Qué tan seguido agrupas tus compras/salidas para reducir viajes?' },

    // ENERGY (4,5)
    { id: 5, dimension: 'energy', text: '¿Qué tan seguido apagas luces/equipos cuando no los usas?' },
    { id: 6, dimension: 'energy', text: '¿Qué tan seguido usas focos eficientes o modos de ahorro de energía?' },

    // WATER (6,7)
    { id: 7, dimension: 'water', text: '¿Qué tan seguido reduces el tiempo de ducha o el consumo de agua?' },
    { id: 8, dimension: 'water', text: '¿Qué tan seguido evitas desperdicio de agua (llaves abiertas/fugas)?' },

    // CONSUMPTION (8,9)
    { id: 9, dimension: 'consumption', text: '¿Qué tan seguido eliges productos locales o con menor empaque?' },
    { id: 10, dimension: 'consumption', text: '¿Qué tan seguido lees/consideras la sostenibilidad antes de comprar?' },
  ] as const,
  // Guía para UI (opcional)
  options: [
    { value: 0, label: 'Nunca' },
    { value: 1, label: 'Rara vez' },
    { value: 2, label: 'A veces' },
    { value: 3, label: 'Casi siempre' },
    { value: 4, label: 'Siempre' },
  ],
};