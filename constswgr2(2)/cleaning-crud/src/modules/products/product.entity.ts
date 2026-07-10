import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  category!: string;

  @Column({ type: 'integer', nullable: false, default: 0 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price!: number;

  @Column({ type: 'text', nullable: true })
  description!: string;

  // [PREVENTIVE] logical deletion flag
  @Column({ type: 'boolean', default: false })
  deleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
