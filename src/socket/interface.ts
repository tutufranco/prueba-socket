export interface sendTripDriver {
    service_id: string;
    tripStops: tripStops;
    passengerProfile: tripPassanger;
    tripChange: tripChange;
    filters: filtersIntravel;
    payment: PaymentInTravel;
  }

export interface sendTripPassanger {
  service_id: string;
  tripStops: tripStops;
  driverProfile: tripDriver;
  carDriverLocation: carLocation;
  tripChange: tripChange;
  filters: filtersIntravel;
  payment: PaymentInTravel;
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
  passenger_boarded: boolean;
  payment_confirmed: boolean;
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
  
  export interface stopInTravel {
    address: string;
    lat: number;
    lon: number;
    status: boolean;
    index: number;
  }
  