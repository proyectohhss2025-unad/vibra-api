import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateClientDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    nit: string;

    @IsString()
    @IsOptional()
    epsCode?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsNotEmpty()
    createdBy: string;

    @IsOptional()
    managerData?: {
        name: string;
        document: string;
        documentType: string;
        email: string;
        phoneNumber: string;
    };

    @IsOptional()
    creditLimit?: number;

    @IsBoolean()
    @IsOptional()
    isParticular?: boolean;
}