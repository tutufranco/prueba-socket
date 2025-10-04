export interface sendTripDriver {
    service_id: string;
    tripStops: tripStops;
    passengerProfile: tripPassanger;
    tripChange: tripChange;
    filters: filtersIntravel;
    payment: PaymentInTravel;
    incident: tripIncident[];
    message: tripMessage[];
  }

export interface sendTripPassanger {
  service_id: string;
  tripStops: tripStops;
  driverProfile: tripDriver;
  carDriverLocation: carLocation;
  tripChange: tripChange;
  filters: filtersIntravel;
  payment: PaymentInTravel;
  incident: tripIncident[];
  message: tripMessage[];
}

export interface tripIncident {
  incident_id: string;
  incindent_user: "driver" | "passenger";
  incindent_message: string;
  incindent_timestamp: string;
}

export interface tripMessage {
  message_id: string;
  message_user: "driver" | "passenger";
  message_message: string;
  message_timestamp: string;
}

export interface tripAvailable {
  trip_id: string;
  passenger_id: string;
  passenger_name: string;
  passenger_rating: number;
  pickup_location: {
    address: string;
    lat: number;
    lon: number;
  };
  dropoff_location: {
    address: string;
    lat: number;
    lon: number;
  };
  estimated_distance: number; // en kilómetros
  estimated_duration: number; // en minutos
  estimated_fare: number; // precio estimado
  request_time: string; // timestamp ISO
  expires_at: string; // timestamp ISO cuando expira la oferta
}


export interface PaymentInTravel {
  payment_type: string;
  amount_passenger: number;
  amount_driver: number;
}

export interface tripDriver {
  driver_id: string;
  full_name: string;
  qualifications: number;
  selfie: string;
  total_trips: number;
  car_model: string;
  car_color: string;
  car_plate: string;
  phone: string;
}

export interface filtersIntravel {
  luggage: boolean;
  pets: boolean;
  packages: boolean;
  wheelchair: boolean;
}

export interface tripPassanger {
    passenger_id: string;
    full_name: string;
    qualifications: number;
    selfie: string;
    total_trips: number;
    phone: string;
  }


export interface tripStops {
  start_address: stopInTravel;
  end_address: stopInTravel;
  stops: stopInTravel[];
}


export interface tripChange {
  tripStatus: TripStatusV2;
  tripStatusText: string;
  passenger_boarded: boolean;
  payment_confirmed: boolean;
  message_number: number;
  incident_number: number;
}

export interface carLocation {
  lat: number;
  lon: number;
}

export enum TripStatusV2 {
    idle,
    searching,
    driverNotFound,
    driverFound,
    driverAccepted,
    driverOnWay,
    driverArrived,
    tripStarted,
    tripInProgress,
    tripCompleted,
    tripCancelled,
    tripCancelledByDriver,
    error,
  }

export function getTripStatusText(status: TripStatusV2): string {
  switch (status) {
    case TripStatusV2.idle:
      return 'idle';
    case TripStatusV2.searching:
      return 'searching';
    case TripStatusV2.driverNotFound:
      return 'driverNotFound';
    case TripStatusV2.driverFound:
      return 'driverFound';
    case TripStatusV2.driverAccepted:
      return 'driverAccepted';
    case TripStatusV2.driverOnWay:
      return 'driverOnWay';
    case TripStatusV2.driverArrived:
      return 'driverArrived';
    case TripStatusV2.tripStarted:
      return 'tripStarted';
    case TripStatusV2.tripInProgress:
      return 'tripInProgress';
    case TripStatusV2.tripCompleted:
      return 'tripCompleted';
    case TripStatusV2.tripCancelled:
      return 'tripCancelled';
    case TripStatusV2.tripCancelledByDriver:
      return 'tripCancelledByDriver';
    case TripStatusV2.error:
      return 'error';
  }
}
  
  export interface stopInTravel {
    address: string;
    lat: number;
    lon: number;
    status: boolean;
    index: number;
  }
  