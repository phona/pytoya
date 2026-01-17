import { ManifestResponseDto } from './manifest-response.dto';

export class ManifestListMetaDto {
  total!: number;
  page!: number;
  pageSize!: number;
  totalPages!: number;
}

export class ManifestListResponseDto {
  data!: ManifestResponseDto[];
  meta!: ManifestListMetaDto;
}
