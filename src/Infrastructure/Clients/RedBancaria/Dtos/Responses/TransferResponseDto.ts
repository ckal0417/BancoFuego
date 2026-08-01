export interface ResponseMetadataPaginationDto {
    [key: string]: unknown;
}

export interface ResponseMetadataDto {
    message: string;
    pagination: ResponseMetadataPaginationDto | null;
    statusCode: number;
}

export interface TransferResponseDto<T> {
    data: T;
    metadata: ResponseMetadataDto;
}