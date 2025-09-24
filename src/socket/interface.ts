export interface sendTripDriver {
    service_id: string;
    tripStops: tripStops;
    sendPassanger: tripPassanger;
    tripChange: tripChange;
  }

export interface sendTripPassanger {
  service_id: string;
  tripStops: tripStops;
  sendDriver: tripDriver;
  carLocation: carLocation;
  tripChange: tripChange;
}

export interface tripDriver {
  driver_id: string;
  full_name: string;
  qualifications: number;
  selfie: string;
  total_trips: number;
  car_model: string
  car_color: string
  car_plate: string
  phone: string
}

export interface tripPassanger {
    passanger_id: string;
    full_name: string;
    qualifications: number;
    selfie: string;
    total_trips: number;
    phone: string
  }


export interface tripStops {
  start_address: stopInTravel;
  end_address: stopInTravel;
  stops: stopInTravel[];
}


export interface tripChange {
  tripStatus: TripStatusV2;

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
  