import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async update(updateUserDto: UpdateUserDto): Promise<any> {
    const { _id, password, ...payload } = updateUserDto;

    const userExists = await this.userModel.findById(_id).exec();
    if (!userExists) {
      throw new NotFoundException(`Usuario con id ${_id} no encontrado`);
    }

    const updatePayload: Record<string, any> = { ...payload };

    if (typeof password === 'string' && password.trim().length > 0) {
      updatePayload.password = await bcrypt.hash(password, 10);
    }

    if (typeof updateUserDto.birthDate === 'string') {
      updatePayload.birthDate = new Date(updateUserDto.birthDate);
    }

    updatePayload.editedAt = new Date();

    try {
      const updated = await this.userModel
        .findByIdAndUpdate(_id, updatePayload, {
          new: true,
          runValidators: true,
        })
        .select('-password')
        .populate({ path: 'role', select: '_id name' })
        .populate({ path: 'company', select: '_id name' })
        .exec();

      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          `Conflicto de unicidad al actualizar usuario: ${JSON.stringify(error.keyValue)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Update user is session active
   *
   * @param createUserDto
   * @returns User
   */
  async updateKeepSessionActive(createUserDto: User): Promise<User> {
    this.logger.log('Updating a user...');
    const createdUser = new this.userModel({
      ...createUserDto,
      keepSessionActive: createUserDto.keepSessionActive,
    });
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
   *
   * @param id
   * @param isLogged
   * @returns User
   */
  async updateIsLogged(id: string, isLogged: boolean): Promise<User> {
    return await this.userModel
      .findByIdAndUpdate(id, { isLogged }, { new: true })
      .exec();
  }

  /**
   * @returns User[]
   */
  async findAll(): Promise<any> {
    return await this.userModel
      .find()
      .populate('role')
      .populate('documentType')
      .populate('company')
      /*.populate({
                path: 'course',
                populate: {
                    path: 'hightSchool'
                }
            })*/
      .select('-password')
      .exec();
  }

  async getCountAll(query: any) {
    return this.userModel.countDocuments(query).exec();
  }

  /**
   * @returns User[]
   */
  async findAllWithPaginate(): Promise<any> {
    return {
      data: await this.userModel
        .find()
        .populate({ path: 'role' })
        .populate({ path: 'documentType' })
        .populate({ path: 'company' })
        /*.populate({
                    path: 'course',
                    populate: {
                        path: 'hightSchool'
                    }
                })*/
        .select('-password')
        .exec(),
      total: await this.userModel.countDocuments().exec(),
    };
  }

  /**
   * @param username
   * @returns User | undefined
   */
  async findByUsername(username: string): Promise<any> {
    this.logger.log(`Finding user by username: ${username}`);
    const user: any = await this.userModel
      .findOne({ username })
      .populate({
        path: 'role',
        select: '_id name',
      })
      .populate({
        path: 'company',
        select: '_id name',
      })
      .select(
        'name username -password documentNumber documentType address phoneNumber email keepSessionActive role company avatar gender birthDate isLogged totalScore serial',
      )
      .exec();

    if (!user) {
      throw new NotFoundException(
        `Usuario con username ${username} no encontrado`,
      );
    }
    return user as User;
  }

  /**
   * @param username
   * @returns User | undefined
   */
  async findByOne(query: any): Promise<User | undefined> {
    this.logger.log(`Finding user by query: ${JSON.stringify(query)}`);
    return this.userModel
      .findOne(query)
      .populate({ path: 'role' })
      .populate({
        path: 'company',
        select:
          '-modules -managerData -userAdmin -address -email -phoneNumber -editedBy -isMain',
      })
      .select('-password')
      .exec();
  }

  /**
   * @param email
   * @param password
   * @returns User | undefined
   */
  async findByEmailAndPassword(
    email: string,
    password: string,
  ): Promise<User | undefined> {
    const user = await this.userModel
      .findOne({ email })
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
      throw new NotFoundException(
        `Contraseña incorrecta para el usuario: ${password} ${user.username} ${user.email} ${user.password}`,
      );
    }
    return user;
  }
}
