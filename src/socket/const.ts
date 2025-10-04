// ============================================
// EVENTOS DE PASAJERO (Passenger Events)
// ============================================

/**
 * Pasajero solicita datos iniciales del viaje
 * Cliente emite → Servidor responde con el mismo evento
 */
export const GET_TRIP_P_ON = 'get-trip-p-on';

/**
 * Pasajero envía su ubicación
 * Cliente emite → Servidor procesa
 */
export const LOCATION_P_SEND = 'location-p-send';

/**
 * Notificación de incidente en el viaje (pasajero recibe)
 * Servidor emite → Cliente recibe
 */
export const TRIP_INCIDENT_P_ON = 'trip-incident-p-on';

/**
 * Pasajero envía incidente
 * Cliente emite → Servidor procesa y difunde
 */
export const TRIP_INCIDENT_P_SEND = 'trip-incident-p-send';

/**
 * Conductor envía incidente
 * Cliente emite → Servidor procesa y difunde
 */
export const TRIP_INCIDENT_D_SEND = 'trip-incident-d-send';

/**
 * Pasajero envía mensaje
 * Cliente emite → Servidor procesa y difunde
 */
export const TRIP_MESSAGE_P_SEND = 'trip-message-p-send';

/**
 * Conductor envía mensaje
 * Cliente emite → Servidor procesa y difunde
 */
export const TRIP_MESSAGE_D_SEND = 'trip-message-d-send';

/**
 * Solicitar lista de mensajes e incidentes
 * Cliente emite → Servidor responde con listas completas
 */
export const GET_MESSAGES_INCIDENTS = 'get-messages-incidents';

/**
 * Respuesta con todos los mensajes e incidentes
 * Servidor emite → Cliente recibe listas completas
 */
export const ALL_MESSAGES = 'all-messages';

/**
 * Pasajero solicita cancelar el viaje
 * Cliente emite → Servidor procesa
 */
export const TRIP_CANCEL_P_SEND = 'trip-cancel-p-send';

/**
 * Notificación de cancelación de viaje (pasajero recibe)
 * Servidor emite → Cliente recibe
 */
export const TRIP_CANCEL_P_ON = 'trip-cancel-p-on';

/**
 * Pasajero indica que está disponible para iniciar viaje
 * Cliente emite → Servidor procesa
 */
export const TRIP_START_AVAILABLE_P_SEND = 'trip-start-available-p-send';

/**
 * Notificación de mensaje del viaje (pasajero recibe)
 * Servidor emite → Cliente recibe
 */
export const TRIP_MESSAGE_P_ON = 'trip-message-p-on';

/**
 * Pasajero envía información de pago
 * Cliente emite → Servidor procesa
 */
export const TRIP_PAYMENT_P_SEND = 'trip-payment-p-send';

// ============================================
// EVENTOS DE CONDUCTOR (Driver Events)
// ============================================

/**
 * Conductor solicita datos iniciales del viaje
 * Cliente emite → Servidor responde
 */
export const GET_TRIP_D_ON = 'get-trip-d-on';

/**
 * Conductor envía su ubicación
 * Cliente emite → Servidor procesa y difunde
 */
export const DRIVER_LOCATION = 'driver-location';

/**
 * Conductor envía su ubicación (alternativo)
 * Cliente emite → Servidor procesa y difunde
 */
export const LOCATION_D_SEND = 'location-d-send';

/**
 * Conductor cancela el viaje
 * Cliente emite → Servidor procesa y notifica
 */
export const TRIP_CANCEL_D_SEND = 'trip-cancel-d-send';

/**
 * Viaje disponible para conductor
 * Servidor emite → Conductor recibe oferta de viaje
 */
export const TRIP_AVAILABLE = 'trip-available';

/**
 * Conductor acepta el viaje
 * Cliente emite → Servidor procesa y asigna viaje
 */
export const TRIP_ACCEPT = 'trip-accept';

/**
 * Conductor rechaza el viaje
 * Cliente emite → Servidor procesa y busca otro conductor
 */
export const TRIP_REJECT = 'trip-reject';

/**
 * Actualización de ubicación del conductor (todos reciben)
 * Servidor emite → Todos los clientes reciben
 */
export const DRIVER_LOCATION_UPDATE = 'driver-location-update';

// ============================================
// EVENTOS COMPARTIDOS (Shared Events)
// ============================================

/**
 * Cambio en el estado del viaje
 * Bidireccional: Cliente envía cambios O Servidor notifica cambios
 */
export const SEND_CHANGE_TRIP = 'send-change-trip';

/**
 * Evento global genérico (desde EventEmitter)
 * Servidor emite eventos dinámicos
 */
export const GLOBAL_EVENT = 'global.event';

// ============================================
// OBJETO CON TODOS LOS EVENTOS
// ============================================

export const SOCKET_EVENTS = {
  // Pasajero
  PASSENGER: {
    GET_TRIP: GET_TRIP_P_ON,
    LOCATION_SEND: LOCATION_P_SEND,
    INCIDENT_ON: TRIP_INCIDENT_P_ON,
    CANCEL_SEND: TRIP_CANCEL_P_SEND,
    CANCEL_ON: TRIP_CANCEL_P_ON,
    START_AVAILABLE: TRIP_START_AVAILABLE_P_SEND,
    MESSAGE_ON: TRIP_MESSAGE_P_ON,
    PAYMENT_SEND: TRIP_PAYMENT_P_SEND,
    MESSAGE_SEND: TRIP_MESSAGE_P_SEND,
  },
  
  // Conductor
  DRIVER: {
    GET_TRIP: GET_TRIP_D_ON,
    LOCATION: DRIVER_LOCATION,
    LOCATION_SEND: LOCATION_D_SEND,
    LOCATION_UPDATE: DRIVER_LOCATION_UPDATE,
    CANCEL_SEND: TRIP_CANCEL_D_SEND,
    TRIP_AVAILABLE: TRIP_AVAILABLE,
    TRIP_ACCEPT: TRIP_ACCEPT,
    TRIP_REJECT: TRIP_REJECT,
  },
  
  // Compartidos
  SHARED: {
    CHANGE_TRIP: SEND_CHANGE_TRIP,
    GLOBAL_EVENT: GLOBAL_EVENT,
    GET_MESSAGES_INCIDENTS: GET_MESSAGES_INCIDENTS,
    ALL_MESSAGES: ALL_MESSAGES,
  }
} as const;

// ============================================
// TIPOS TYPESCRIPT
// ============================================

/**
 * Tipo union de todos los eventos de pasajero
 */
export type PassengerEvent = 
  | typeof GET_TRIP_P_ON
  | typeof LOCATION_P_SEND
  | typeof TRIP_INCIDENT_P_ON
  | typeof TRIP_CANCEL_P_SEND
  | typeof TRIP_CANCEL_P_ON
  | typeof TRIP_START_AVAILABLE_P_SEND
  | typeof TRIP_MESSAGE_P_ON
  | typeof TRIP_PAYMENT_P_SEND
  | typeof TRIP_MESSAGE_P_SEND;

/**
 * Tipo union de todos los eventos de conductor
 */
export type DriverEvent = 
  | typeof GET_TRIP_D_ON
  | typeof DRIVER_LOCATION
  | typeof LOCATION_D_SEND
  | typeof DRIVER_LOCATION_UPDATE
  | typeof TRIP_CANCEL_D_SEND
  | typeof TRIP_AVAILABLE
  | typeof TRIP_ACCEPT
  | typeof TRIP_REJECT;

/**
 * Tipo union de todos los eventos
 */
export type SocketEvent = PassengerEvent | DriverEvent | typeof SEND_CHANGE_TRIP | typeof GLOBAL_EVENT | typeof GET_MESSAGES_INCIDENTS | typeof ALL_MESSAGES;

