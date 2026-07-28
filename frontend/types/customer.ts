export interface Customer {
  id: string;
  name: string;
  businessName?: string;
  customerType: "Farm" | "Contractor" | "Dealer" | "Other";

  phone: string;
  email?: string;

  address: string;
  postcode: string;

  vatNumber?: string;
  notes?: string;

  createdAt: string;
}