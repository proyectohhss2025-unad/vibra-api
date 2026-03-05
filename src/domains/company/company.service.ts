import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './schemas/company.schema';

@Injectable()
export class CompanyService {
    private readonly logger = new Logger(CompanyService.name);

    constructor(
        @InjectModel(Company.name) private companyModel: Model<Company>,
        @InjectModel(User.name) private userModel: Model<User>,
    ) { }

    /**
     * Create a new company
     * @param createCompanyDto - Data for creating a company
     * @returns The created company
     */
    async create(createCompanyDto: CreateCompanyDto) {
        try {
            const { name, seriesCurrentBillingRange, ...companyData } = createCompanyDto;

            const existingCompany = await this.companyModel.findOne({ name });

            if (existingCompany) {
                this.logger.warn(`A company with name ${name} already exists`, { existingCompany });
                throw new BadRequestException('A company with that name already exists');
            }

            const company = new this.companyModel({
                ...companyData,
                name,
                modules: {
                    billing: {
                        seriesCurrentBillingRange
                    }
                },
                createdAt: new Date()
            });

            await company.save();

            this.logger.log(`Company registered successfully: ${name}`);
            return { company };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error('Error registering company', error.stack);
            throw new InternalServerErrorException('Error registering company');
        }
    }

    /**
     * Get a company by ID
     * @param id - Company ID
     * @returns The company
     */
    async findById(id: string) {
        try {
            const company = await this.companyModel.findById(id)
                .populate({
                    path: 'managerData.documentType',
                    model: 'DocumentType'
                })
                .populate({
                    path: 'userAdmin',
                    model: 'User'
                });

            if (!company) {
                this.logger.warn(`Company with ID ${id} not found`);
                throw new NotFoundException('Company not found');
            }

            return { message: 'Company found successfully', company };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error querying company with ID ${id}`, error.stack);
            throw new InternalServerErrorException('Error when querying the company');
        }
    }

    /**
     * Get the main company
     * @returns The main company
     */
    async findByIsMain() {
        try {
            console.log('findMain');
            const company = await this.companyModel.findOne({ isMain: true });
            //.select('-modules -userAdmin')
            /*.populate({
                path: 'managerData.documentType',
                model: 'DocumentType'
            });*/

            if (!company) {
                this.logger.warn('Main company not found');
                throw new NotFoundException('Company not found');
            }

            return { message: 'Company found successfully', company };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Error querying main company', error.stack);
            throw new InternalServerErrorException('Error when querying the company');
        }
    }

    /**
     * Get a company by name
     * @param name - Company name
     * @returns The company
     */
    async findByName(name: string) {
        try {
            const company = await this.companyModel.findOne({ name });

            if (!company) {
                this.logger.warn(`Company with name ${name} not found`);
                throw new NotFoundException('Company not found');
            }

            return { company };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error querying company with name ${name}`, error.stack);
            throw new InternalServerErrorException('Error when querying the company');
        }
    }

    /**
     * Get all companies with pagination
     * @param page - Page number
     * @param rows - Number of rows per page
     * @returns List of companies and total count
     */
    async findAll(page: number, rows: number) {
        try {
            const companies = await this.companyModel.find()
                .populate({
                    path: 'userAdmin',
                    model: 'User'
                })
                .skip(rows * (page - 1))
                .limit(rows)
                .sort({ name: 1 });

            if (!companies || companies.length === 0) {
                this.logger.warn('No companies found');
                throw new NotFoundException('Companies not found');
            }

            const count = await this.companyModel.countDocuments();

            return { companies, length: count };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Error querying companies', error.stack);
            throw new InternalServerErrorException('Error when querying the companies');
        }
    }

    /**
     * Update a company
     * @param updateCompanyDto - Data for updating the company
     * @returns The updated company
     */
    async update(updateCompanyDto: UpdateCompanyDto) {
        try {
            const {
                _id,
                name,
                slogan,
                nit,
                address,
                email,
                phoneNumber,
                seriesCurrentBillingRange,
                managerData,
                userAdmin,
                editedBy,
                isMain
            } = updateCompanyDto;

            if (isMain) {
                await this.companyModel.updateMany({ isMain: true }, { isMain: false });
            }

            const company = await this.companyModel.findById(_id);

            if (!company) {
                this.logger.warn(`Company with ID ${_id} not found`);
                throw new NotFoundException('Company not found');
            }

            company.name = name;
            company.slogan = slogan;
            company.nit = nit;
            company.address = address;
            company.email = email;
            company.phoneNumber = phoneNumber;
            company.modules = {
                billing: {
                    seriesCurrentBillingRange
                }
            };
            company.userAdmin = this.userModel.findById(userAdmin) as any;
            company.managerData = managerData;
            company.editedAt = new Date();
            company.editedBy = editedBy;
            company.isMain = isMain;

            await company.save();

            this.logger.log(`Company with ID ${_id} updated successfully`);
            return { message: 'The company update has been completed successfully', company };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Error updating company', error.stack);
            throw new InternalServerErrorException('Error updating company');
        }
    }

    /**
     * Delete a company by ID
     * @param id - Company ID
     * @returns The deleted company
     */
    async remove(id: string) {
        try {
            const company = await this.companyModel.findByIdAndDelete(id);

            if (!company) {
                this.logger.warn(`Company with ID ${id} not found`);
                throw new NotFoundException('Company not found');
            }

            this.logger.log(`Company with ID ${id} removed successfully`);
            return { company };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error deleting company with ID ${id}`, error.stack);
            throw new InternalServerErrorException('Error delete company');
        }
    }

    /**
     * Search companies by term
     * @param searchTerm - Search term
     * @param page - Page number
     * @param rows - Number of rows per page
     * @returns List of companies matching the search term
     */
    async search(searchTerm: string, page: number, rows: number) {
        try {
            // Ensure searchTerm is a string before constructing the regex
            const searchString = typeof searchTerm === 'string' ? searchTerm : '';
            // Create a regular expression for case-insensitive search
            const regex = new RegExp(searchString, 'i');

            // Construct a query object to search across all fields
            const query = {
                $or: [
                    { name: { $regex: regex } },
                    { slogan: { $regex: regex } },
                    { nit: { $regex: regex } },
                    { address: { $regex: regex } },
                    { email: { $regex: regex } },
                    { phoneNumber: { $regex: regex } },
                ],
            };

            // Perform the search using the Mongoose model
            const objects = await this.companyModel.find(searchString === 'all' ? {} : query)
                .skip(rows * (page - 1))
                .limit(rows)
                .sort({ name: -1 });

            const count = await this.companyModel.countDocuments(searchString === 'all' ? {} : query);

            return {
                message: 'Search results',
                data: objects,
                length: count
            };
        } catch (error) {
            this.logger.error('Error searching companies', error.stack);
            throw new InternalServerErrorException('An error occurred during the search');
        }
    }

    /**
     * Set a company as active or inactive
     * @param id - Company ID
     * @param active - Active status
     * @param editedBy - User who edited the company
     * @returns The updated company
     */
    async setActive(id: string, active: boolean, editedBy: string) {
        try {
            const company = await this.companyModel.findById(id);

            if (!company) {
                this.logger.warn(`Company with ID ${id} not found`);
                throw new NotFoundException('Company not found');
            }

            company.isActive = active;
            company.editedBy = editedBy;
            company.editedAt = new Date();

            await company.save();

            this.logger.log(`Company with ID ${id} active status updated to ${active}`);
            return { message: 'Update the company is successful', company };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error updating active status for company with ID ${id}`, error.stack);
            throw new InternalServerErrorException('Error updating company');
        }
    }
}