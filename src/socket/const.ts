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

/**
 * Pasajero envía mensaje
 * Cliente emite → Servidor procesa y difunde
 */
export const TRIP_MESSAGE_P_SEND = 'trip-message-p-send';

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
    LOCATION_UPDATE: DRIVER_LOCATION_UPDATE,
  },
  
  // Compartidos
  SHARED: {
    CHANGE_TRIP: SEND_CHANGE_TRIP,
    GLOBAL_EVENT: GLOBAL_EVENT,
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
  | typeof DRIVER_LOCATION_UPDATE;

/**
 * Tipo union de todos los eventos
 */
export type SocketEvent = PassengerEvent | DriverEvent | typeof SEND_CHANGE_TRIP | typeof GLOBAL_EVENT;

