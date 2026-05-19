export interface TollguruTollDto {
  id?: string;
  name: string;
  road?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  type?: string;
  tagCost?: number | null;
  cashCost?: number | null;
  currency?: string;
  tagPrimary?: string;
  paymentMethods?: string[];
}
