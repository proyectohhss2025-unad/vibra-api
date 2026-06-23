import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { FileUploadService } from '../../infrastructure/file-upload/file-upload.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AvatarGalleryItemTypeEnum,
  AvatarGalleryResponseDto,
} from './dto/avatar-gallery.dto';
import { User, AvatarGalleryItem } from './schemas/user.schema';
import { Role } from '../roles/schemas/role.schema';
import { Participant } from '../participant/schemas/participant.schema';
import { Config } from '../config/schemas/config.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(Participant.name) private participantModel: Model<Participant>,
    @InjectModel(Config.name) private configModel: Model<Config>,
    private readonly logger: AppLoggerService,
    private readonly fileUploadService: FileUploadService,
  ) {
    this.logger.log('UsersService initialized');
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log('Creating a new user...');
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const presets = this.getDefaultPresetGallery();
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      avatarGallery: presets,
    });
    const savedUser = await createdUser.save();

    // Sincronizar el documentNumber del nuevo usuario con todas las configs activas
    await this.syncUserWithConfigs(
      savedUser.documentNumber,
      savedUser.name || savedUser.username,
    );

    return savedUser;
  }

  /**
   * Agrega el documentNumber de un usuario a todas las configs activas
   * para que el nuevo usuario pueda acceder al sistema sin restricciones.
   */
  private async syncUserWithConfigs(
    documentNumber: string,
    userName: string,
  ): Promise<void> {
    try {
      const result = await this.configModel
        .updateMany(
          { deleted: { $ne: true }, isActive: { $ne: false } },
          { $addToSet: { allowedUsers: documentNumber } },
        )
        .exec();
      this.logger.log(
        `Usuario ${userName} (doc: ${documentNumber}) sincronizado con ${result.modifiedCount} configs`,
      );
    } catch (error) {
      this.logger.error(
        `Error al sincronizar usuario ${userName} con configs: ${error.message}`,
      );
    }
  }

  async update(updateUserDto: UpdateUserDto): Promise<any> {
    const { _id, password, ...payload } = updateUserDto;

    const userExists = await this.userModel.findById(_id).exec();
    if (!userExists) {
      throw new NotFoundException(`Usuario con id ${_id} no encontrado`);
    }

    const updatePayload: Record<string, any> = { ...payload };

    // Sanitize phone number: store only digits
    if (updatePayload.phoneNumber) {
      updatePayload.phoneNumber = updatePayload.phoneNumber.replace(/\D/g, '');
    }

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
   * Busca un usuario por su ID
   *
   * @param id - ID del usuario
   * @returns User | null
   */
  async findById(id: string): Promise<User | null> {
    return await this.userModel.findById(id).exec();
  }

  /**
   * Actualiza únicamente la contraseña de un usuario.
   *
   * @param userId - ID del usuario
   * @param hashedPassword - Contraseña ya hasheada con bcrypt
   * @returns User actualizado
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        { password: hashedPassword, editedAt: new Date() },
        { new: true },
      )
      .select('-password')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }
    return updated;
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
        'name username password documentNumber documentType address phoneNumber email keepSessionActive role company avatar gender birthDate isLogged totalScore serial',
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
      .populate({ path: 'documentType' })
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

  /**
   * Busca usuarios por nombre de rol y término de búsqueda
   * @param roleName - Nombre del rol (ej: 'docente')
   * @param searchTerm - Término de búsqueda (name, email, documentNumber, username)
   * @param limit - Máximo de resultados
   */
  async searchByRole(
    roleName: string,
    searchTerm: string,
    limit: number,
  ): Promise<Partial<User>[]> {
    // Búsqueda case-insensitive del rol (ej: "docente" encuentra "Docente")
    const role = await this.roleModel
      .findOne({
        name: {
          $regex: new RegExp(
            `^${roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i',
          ),
        },
        deleted: { $ne: true },
      })
      .exec();
    if (!role) {
      this.logger.warn(
        `No se encontró el rol "${roleName}" en la base de datos`,
      );
      return [];
    }

    const regex = new RegExp(searchTerm, 'i');
    return this.userModel
      .find({
        deleted: { $ne: true },
        $and: [
          {
            // Coincidir rol tanto si está como string o como ObjectId
            $or: [{ role: role._id }, { role: role._id.toString() }],
          },
          {
            $or: [
              { name: { $regex: regex } },
              { email: { $regex: regex } },
              { documentNumber: { $regex: regex } },
              { username: { $regex: regex } },
            ],
          },
        ],
      })
      .limit(limit)
      .select('name email documentNumber username _id')
      .sort({ name: 1 })
      .exec();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  AVATAR GALLERY
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Pre-carga los avatares prediseñados en la galería de un usuario
   * (se llama al crear un usuario nuevo).
   */
  private getDefaultPresetGallery(): AvatarGalleryItem[] {
    const presets = [
      'default-avatar.svg',
      '01.svg',
      '02.svg',
      '03.jpg',
      '04.jpg',
      '05.jpg',
      '06.jpg',
      '07.jpg',
      '08.jpg',
      '09.jpg',
    ];
    return presets.map((filename) => ({
      id: uuidv4(),
      type: AvatarGalleryItemTypeEnum.PRESET,
      src: filename,
      label: '',
      addedAt: new Date(),
    }));
  }

  /**
   * Obtiene la galería de avatar del usuario autenticado.
   */
  async getAvatarGallery(userId: string): Promise<AvatarGalleryResponseDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Limpiar items rotos que no tengan type (bug de $push con findOneAndUpdate)
    const validItems = (user.avatarGallery || []).filter((i: any) => i.type);

    // Inicializar galería con presets si está vacía (usuarios creados antes del feature)
    // Usamos save() en vez de findByIdAndUpdate para que Mongoose caste correctamente
    // los subdocumentos (findByIdAndUpdate con $set no ejecuta el casteo completo).
    if (validItems.length === 0) {
      const presets = this.getDefaultPresetGallery();
      user.avatarGallery = presets;
      await user.save();
      return {
        gallery: presets,
        activeAvatar: user.avatar,
      };
    }

    // Si había items rotos, guardar solo los válidos (también con save())
    if (validItems.length !== (user.avatarGallery?.length || 0)) {
      user.avatarGallery = validItems;
      await user.save();
    }

    return {
      gallery: validItems,
      activeAvatar: user.avatar,
    };
  }

  /**
   * Marca un avatar de la galería como activo.
   */
  async selectAvatar(
    userId: string,
    galleryId: string,
  ): Promise<{ avatar: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const item = user.avatarGallery?.find((i) => i.id === galleryId);
    if (!item) {
      throw new NotFoundException('Item no encontrado en la galería');
    }

    user.avatar = item.src;
    user.editedAt = new Date();
    await user.save();

    // Sincronizar con Participant (para la app mobile)
    await this.participantModel
      .updateOne({ userId: user._id }, { $set: { avatar: item.src } })
      .exec();

    this.logger.log(`Avatar actualizado para usuario ${userId}: ${item.src}`);
    return { avatar: user.avatar };
  }

  /**
   * Agrega una imagen subida a la galería del usuario y la marca como activa.
   */
  async uploadAvatarImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{
    galleryItem: AvatarGalleryItem;
    avatar: string;
  }> {
    this.fileUploadService.validateImageFile(file);

    // Subir a GridFS con compresión automática
    const fileId = await this.fileUploadService.uploadAvatarImage(file);

    const newItem: AvatarGalleryItem = {
      id: uuidv4(),
      type: AvatarGalleryItemTypeEnum.UPLOAD,
      src: fileId,
      label: file.originalname || '',
      addedAt: new Date(),
    };

    // Usar save() en vez de findOneAndUpdate para asegurar que Mongoose
    // castea correctamente el subdocumento AvatarGalleryItem (incluyendo id, type, src, etc.).
    // findOneAndUpdate con $push tiene un bug con subdocumentos que tienen campo 'id'
    // (conflicto con el virtual id de Mongoose) — no persiste los campos del subdocumento.
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Inicializar avatarGallery si es undefined (usuarios creados antes del feature)
    if (!user.avatarGallery) {
      user.avatarGallery = [];
    }

    user.avatarGallery.push(newItem);
    user.avatar = fileId;
    user.editedAt = new Date();
    await user.save();

    // Sincronizar con Participant
    await this.participantModel
      .updateOne({ userId: user._id }, { $set: { avatar: fileId } })
      .exec();

    this.logger.log(
      `Imagen subida a galería para usuario ${userId}: ${fileId}`,
    );
    return { galleryItem: newItem, avatar: user.avatar };
  }

  /**
   * Elimina un item de la galería (solo uploads).
   */
  async deleteAvatarGalleryItem(
    userId: string,
    galleryId: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const itemIndex = user.avatarGallery?.findIndex((i) => i.id === galleryId);
    if (itemIndex === undefined || itemIndex < 0) {
      throw new NotFoundException('Item no encontrado en la galería');
    }

    const item = user.avatarGallery[itemIndex];
    if (item.type !== 'upload') {
      throw new BadRequestException(
        'No se puede eliminar un avatar prediseñado',
      );
    }

    // Eliminar de GridFS
    try {
      await this.fileUploadService.deleteFile(item.src);
    } catch (err) {
      this.logger.warn(`No se pudo eliminar archivo de GridFS: ${item.src}`);
    }

    // Quitar de la galería
    user.avatarGallery.splice(itemIndex, 1);

    // Si el avatar eliminado era el activo, volver al default
    if (user.avatar === item.src) {
      user.avatar = 'default-avatar.svg';
    }

    user.editedAt = new Date();
    await user.save();
  }

  async search(searchTerm: string): Promise<Partial<User>[]> {
    if (!searchTerm || searchTerm === 'all') {
      return this.userModel
        .find({ deleted: { $ne: true } })
        .select('name username email documentNumber avatar isActive')
        .limit(20)
        .sort({ createdAt: -1 })
        .exec();
    }
    const regex = new RegExp(searchTerm, 'i');
    return this.userModel
      .find({
        deleted: { $ne: true },
        $or: [
          { name: { $regex: regex } },
          { username: { $regex: regex } },
          { email: { $regex: regex } },
          { documentNumber: { $regex: regex } },
        ],
      })
      .select('name username email documentNumber avatar isActive')
      .limit(20)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Inicializa la galería de avatares prediseñados para un usuario nuevo.
   * Se llama desde create().
   */
  async initializeAvatarGallery(userId: string): Promise<void> {
    const presets = this.getDefaultPresetGallery();
    const user = await this.userModel.findById(userId).exec();
    if (user) {
      user.avatarGallery = presets;
      await user.save();
    }
  }
}
