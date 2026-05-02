export class Vehicle {
  vehicleNumber: string;
  vehicleName: string;
  vehicleMake?: string;
  vehicleModel?: string;
  fuelType?: string;
  vehicleYear?: number;
  driverName?: string;

  constructor({
    vehicleNumber,
    vehicleName,
    vehicleMake,
    vehicleModel,
    fuelType,
    vehicleYear,
    driverName,
  }: {
    vehicleNumber: string;
    vehicleName: string;
    vehicleMake?: string;
    vehicleModel?: string;
    fuelType?: string;
    vehicleYear?: number;
    driverName?: string;
  }) {
    this.vehicleNumber = vehicleNumber;
    this.vehicleName = vehicleName;
    this.vehicleMake = vehicleMake;
    this.vehicleModel = vehicleModel;
    this.fuelType = fuelType;
    this.vehicleYear = vehicleYear;
    this.driverName = driverName;
  }
}
