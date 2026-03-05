import { IsOptional, IsString, IsEmail, IsNumber } from 'class-validator';

export class UpdateClientDto {
    _id: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    nit?: string;

    @IsOptional()
    @IsString()
    epsCode?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsNumber()
    creditLimit?: number;

    @IsOptional()
    managerData?: {
        name?: string;
        document?: string;
        documentType?: string;
        email?: string;
        phoneNumber?: string;
    };
}