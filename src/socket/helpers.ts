import  * as interfaces from './interface';

export function buildSendTripPassanger({trip_status = interfaces.TripStatusV2.idle}: {trip_status?: interfaces.TripStatusV2}): interfaces.sendTripPassanger {

    const tripStopsData: interfaces.tripStops =  buildTripStops();

    const driverData: interfaces.tripDriver =  buildTripDriver();

    const carLocationData: interfaces.carLocation =  buildCarLocation();

    const tripChangeData: interfaces.tripChange =  buildTripChange({tripStatus: trip_status});

    const filtersData: interfaces.filtersIntravel = buildFilters();

    const paymentData: interfaces.PaymentInTravel = buildPayment();

    const sendTripPassangerData: interfaces.sendTripPassanger = {
      service_id: 'service-789',
      tripStops: tripStopsData,
      driverProfile: driverData,
      carDriverLocation: carLocationData,
      tripChange: tripChangeData,
      filters: filtersData,
      payment: paymentData,
    };

    return sendTripPassangerData;
  }


  export function buildSendTripDriver({trip_status = interfaces.TripStatusV2.driverFound}: {trip_status?: interfaces.TripStatusV2}): interfaces.sendTripDriver {
    const tripStopsData: interfaces.tripStops =  buildTripStops();
 
    const passengerData: interfaces.tripPassanger = buildTripPassanger();

    const tripChangeData: interfaces.tripChange =  buildTripChange({tripStatus: trip_status});

    const filtersData: interfaces.filtersIntravel = buildFilters();

    const paymentData: interfaces.PaymentInTravel = buildPayment();
  

    const sendTripDriverData: interfaces.sendTripDriver = {
      service_id: 'service-456',
      tripStops: tripStopsData,
      passengerProfile: passengerData,
      tripChange: tripChangeData,
      filters: filtersData,
      payment: paymentData,
    };

    return sendTripDriverData;
  }

  /**
   * Función para crear un stopInTravel
   */
  export function buildStopInTravel({
    address = 'Dirección Demo',
    lat = -34.6037,
    lon = -58.3816,
    status = true,
    index = 0
  }: {
    address?: string;
    lat?: number;
    lon?: number;
    status?: boolean;
    index?: number;
  } = {}): interfaces.stopInTravel {
    return {
      address,
      lat,
      lon,
      status,
      index,
    };
  }

  /**
   * Función para crear tripStops
   */
  export function buildTripStops({
    start_address,
    end_address,
    stops = []
  }: {
    start_address?: interfaces.stopInTravel;
    end_address?: interfaces.stopInTravel;
    stops?: interfaces.stopInTravel[];
  } = {}): interfaces.tripStops {
    const defaultStart = buildStopInTravel({
      address: 'Origen Demo',
      lat: -34.6037,
      lon: -58.3816,
      index: 0
    });

    const defaultEnd = buildStopInTravel({
      address: 'Destino Demo',
      lat: -34.6157,
      lon: -58.4333,
      index: 1
    });

    return {
      start_address: start_address || defaultStart,
      end_address: end_address || defaultEnd,
      stops,
    };
  }

  /**
   * Función para crear tripDriver
   */
  export function buildTripDriver({
    driver_id = 'driver-demo',
    full_name = 'Conductor Demo',
    qualifications = 4.5,
    selfie = 'https://i.imgur.com/driver-demo.jpg',
    total_trips = 100,
    car_model = 'Toyota Corolla',
    car_color = 'Blanco',
    car_plate = 'ABC-123',
    phone = '+54 9 11 0000-0000'
  }: {
    driver_id?: string;
    full_name?: string;
    qualifications?: number;
    selfie?: string;
    total_trips?: number;
    car_model?: string;
    car_color?: string;
    car_plate?: string;
    phone?: string;
  } = {}): interfaces.tripDriver {
    return {
      driver_id,
      full_name,
      qualifications,
      selfie,
      total_trips,
      car_model,
      car_color,
      car_plate,
      phone,
    };
  }

  /**
   * Función para crear tripPassanger
   */
  export function buildTripPassanger({
    passenger_id = 'passenger-demo',
    full_name = 'Pasajero Demo',
    qualifications = 4.5,
    selfie = 'https://i.imgur.com/passenger-demo.jpg',
    total_trips = 50,
    phone = '+54 9 11 0000-0000'
  }: {
    passenger_id?: string;
    full_name?: string;
    qualifications?: number;
    selfie?: string;
    total_trips?: number;
    phone?: string;
  } = {}): interfaces.tripPassanger {
    return {
      passenger_id,
      full_name,
      qualifications,
      selfie,
      total_trips,
      phone,
    };
  }

  /**
   * Función para crear carLocation
   */
  export function buildCarLocation({
    lat = -34.6037,
    lon = -58.3816
  }: {
    lat?: number;
    lon?: number;
  } = {}): interfaces.carLocation {
    return {
      lat,
      lon,
    };
  }

  /**
   * Función para crear tripChange
   */
  export function buildTripChange({
    tripStatus = interfaces.TripStatusV2.idle,
    passenger_boarded = false,
    payment_confirmed = false,
  }: {
    tripStatus?: interfaces.TripStatusV2;
    passenger_boarded?: boolean;
    payment_confirmed?: boolean;
  } = {}): interfaces.tripChange {
    return {
      tripStatus,
      passenger_boarded,
      payment_confirmed,
    };
  }

  /**
   * Función para crear filters
   */
  export function buildFilters({
    luggage = true,
    pets = false,
    packages = true,
    wheelchair = false,
  }: {
    luggage?: boolean;
    pets?: boolean;
    packages?: boolean;
    wheelchair?: boolean;
  } = {}): interfaces.filtersIntravel {
    return {
      luggage,
      pets,
      packages,
      wheelchair,
    };
  }

  /**
   * Función para crear payment
   */
  export function buildPayment({
    payment_type = 'cash',
    amount_passenger = 1500.0,
    amount_driver = 1200.0,
  }: {
    payment_type?: string;
    amount_passenger?: number;
    amount_driver?: number;
  } = {}): interfaces.PaymentInTravel {
    return {
      payment_type,
      amount_passenger,
      amount_driver,
    };
  }
