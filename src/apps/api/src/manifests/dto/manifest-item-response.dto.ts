import { ManifestItemEntity } from '../../entities/manifest-item.entity';

export class ManifestItemResponseDto {
  id!: number;
  description!: string;
  quantity!: number;
  unitPrice!: number;
  totalPrice!: number;
  manifestId!: number;

  static fromEntity(item: ManifestItemEntity): ManifestItemResponseDto {
    const unitPriceRaw = item.unitPrice as unknown;
    const totalPriceRaw = item.totalPrice as unknown;

    return {
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: typeof unitPriceRaw === 'string' ? Number.parseFloat(unitPriceRaw) : (unitPriceRaw as number),
      totalPrice: typeof totalPriceRaw === 'string' ? Number.parseFloat(totalPriceRaw) : (totalPriceRaw as number),
      manifestId: item.manifestId,
    };
  }
}

