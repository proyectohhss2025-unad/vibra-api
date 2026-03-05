import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        private readonly logger: AppLoggerService,
    ) {
        this.logger.log('UsersService initialized');
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        this.logger.log('Creating a new user...');
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const createdUser = new this.userModel({ ...createUserDto, password: hashedPassword });
        return createdUser.save();
    }

    /**
     * Update user is session active
     * 
     * @param createUserDto
     * @returns User
     */
    async updateKeepSessionActive(createUserDto: User): Promise<User> {
        this.logger.log('Updating a user...');
        const createdUser = new this.userModel({ ...createUserDto, keepSessionActive: createUserDto.keepSessionActive });
        return createdUser.save();
    }

    /**
     * Actualiza el estado de inicio de sesión del usuario
     * 
     * @param user - Usuario cuyo estado se actualizará
     * @returns User - Usuario actualizado
     */
    /*async updateIsLogged(user: User): Promise<User> {
        this.logger.log('Actualizando estado de sesión del usuario: ' + user.isLogged);
        return this.userModel.findByIdAndUpdate(
            user._id,
            { isLogged: !user.isLogged },
            { new: true }
        ).exec();
    }**/
    
    /**
     * Update user login status
     */
    async updateIsLogged(id: string, isLogged: boolean): Promise<User> {
        const user = await this.findByOne({ _id: id });
        user.isLogged = isLogged;
        return await this.userModel.findByIdAndUpdate(
            user._id,
            { isLogged: isLogged },
            { new: true }
        ).exec();
    }

    /**
      * @returns User[]
      */
    async findAll(): Promise<any> {
        return await this.userModel.find()
            .populate('role')
            /*.populate({
                path: 'course',
                populate: {
                    path: 'hightSchool'
                }
            })*/
            .exec();
    }
    /**
     * @returns User[]
     */
    async findAllWithPaginate(): Promise<any> {
        return {
            data: await this.userModel.find()
                .populate({ path: 'role' })
                /*.populate({
                    path: 'course',
                    populate: {
                        path: 'hightSchool'
                    }
                })*/
                .exec(),
            total: await this.userModel.countDocuments().exec()
        };
    }

    /**
     * @param username
     * @returns User | undefined
     */
    async findByUsername(username: string): Promise<any> {
        this.logger.log(`Finding user by username: ${username}`);
        const user: any = await this.userModel.findOne({ username})
            /*.populate({
                path: 'role',
                select: "_id name"
            })
            .populate({
                path: 'company',
                select: "_id name"
            })*/
            .select("name username password documentNumber documentType address phoneNumber email keepSessionActive role company avatar gender birthDate isLogged totalScore serial")
            .exec();

        this.logger.log(`Finding user by username: ${JSON.stringify(user)}`);

        if (!user) {
            throw new NotFoundException(`Usuario con username ${username} no encontrado`);
        }
        return user as User;
    }


    /**
     * @param username
     * @returns User | undefined
     */
    async findByOne(query: any): Promise<User | undefined> {
        this.logger.log(`Finding user by query: ${JSON.stringify(query)}`);
        return this.userModel.findOne({ query })
            .populate({
                path: "role",
            }).populate({
                path: "company",
                select: "-modules -managerData -userAdmin -address -email -phoneNumber -seriesCurrentBillingRange -editedBy -isMain"
            }).exec();
    }

    /**
     * @param email
     * @param password
     * @returns User | undefined
     */
    async findByEmailAndPassword(email: string, password: string): Promise<User | undefined> {
        const user = await this.userModel.findOne({ email })
            .populate({
                path: 'role',
                //select: "_id name"
            })
            .populate({
                path: 'company',
                //select: "_id name"
            })
            .exec();

        if (!user) {
            throw new NotFoundException(`Usuario con email ${email} no encontrado`);
        }

        const isPasswordValid = await bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            throw new NotFoundException(`Contraseña incorrecta para el usuario: ${password} ${user.username} ${user.email} ${user.password}`);
        }
        return user;
    }

}
