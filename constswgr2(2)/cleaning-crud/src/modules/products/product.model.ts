export class Product {
  id: number;
  name: string;
  category: string;
  quantity: number;
  price: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  deleted?: boolean;

  constructor(
    id: number,
    name: string,
    category: string,
    quantity: number,
    price: number,
    description: string,
  ) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.quantity = quantity;
    this.price = price;
    this.description = description;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.deleted = false;
  }
}
