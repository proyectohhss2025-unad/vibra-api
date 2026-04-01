import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNumber,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slogan?: string;

  @IsString()
  nit: string;

  @IsString()
  address: string;

  @IsString()
  email: string;

  @IsNumber()
  phoneNumber: number;

  @IsObject()
  managerData: {
    name: string;
    documentType: Types.ObjectId;
    document: string;
    email: string;
    phoneNumber: string;
  };

  @IsString()
  @IsOptional()
  seriesCurrentBillingRange?: string;

  @IsString()
  createdBy: string;

  @IsBoolean()
  @IsOptional()
  isMain?: boolean;

  @IsString()
  @IsOptional()
  userAdmin?: string;
}
