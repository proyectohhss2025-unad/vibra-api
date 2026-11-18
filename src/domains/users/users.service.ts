import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { FileUploadService } from '../../infrastructure/file-upload/file-upload.service';
import { Config } from '../config/schemas/config.schema';
import { Participant } from '../participant/schemas/participant.schema';
import { Role } from '../roles/schemas/role.schema';
import {
  AvatarGalleryItemTypeEnum,
  AvatarGalleryResponseDto,
} from './dto/avatar-gallery.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AvatarGalleryItem, User } from './schemas/user.schema';

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

  /**
   * Crea un nuevo usuario.
   *
   * @param createUserDto - Datos del usuario a crear
   * @param options - Opciones de creación
   * @param options.isPublic - true solo para el registro público (POST /api/auth/register):
   *   fuerza `isActive: false` (pendiente de activación por docente/admin) y el rol
   *   Estudiante, ignorando el rol enviado por el cliente.
   * @param options.actorRoleName - Nombre del rol del usuario autenticado que realiza
   *   el alta. Se usa para impedir que se asigne el rol Super Admin a quien no lo es.
   */
  async create(
    createUserDto: CreateUserDto,
    options?: { isPublic?: boolean; actorRoleName?: string },
  ): Promise<User> {
    this.logger.log('Creating a new user...');

    // Sanitizar _id: si el frontend envía _id vacío (ej: formularios reutilizados),
    // eliminarlo para que MongoDB lo autogenere como ObjectId nativo.
    const { _id, ...sanitizedDto } = createUserDto as any;

    const isPublic = options?.isPublic ?? false;

    let role = sanitizedDto.role;
    let isActive: boolean | undefined;

    if (isPublic) {
      // Registro público (app mobile): forzar rol Estudiante y estado inactivo.
      // El usuario NO puede auto-activarse ni auto-asignarse otro rol.
      const estudianteRole = await this.roleModel
        .findOne({
          name: { $regex: /^estudiante$/i },
          deleted: { $ne: true },
        })
        .exec();
      if (!estudianteRole) {
        throw new BadRequestException(
          'Rol Estudiante no configurado en el sistema. Contacte al administrador.',
        );
      }
      role = estudianteRole._id.toString();
      isActive = false;
    } else if (!role) {
      throw new BadRequestException(
        'El rol es obligatorio para crear un usuario.',
      );
    } else {
      await this.assertRoleAssignable(role, options?.actorRoleName);
    }

    const hashedPassword = await bcrypt.hash(sanitizedDto.password, 10);
    const presets = this.getDefaultPresetGallery();
    const createdUser = new this.userModel({
      ...sanitizedDto,
      role,
      ...(isActive !== undefined ? { isActive } : {}),
      password: hashedPassword,
      avatar: sanitizedDto.avatar || 'default-avatar.svg',
      avatarGallery: presets,
    });

    let savedUser: User;
    try {
      savedUser = await createdUser.save();
    } catch (error: any) {
      // Error 11000 = violación de índice único (username, documentNumber o email duplicado)
      if (error?.code === 11000) {
        const duplicatedField = Object.keys(error?.keyValue || {})[0];
        const fieldMessages: Record<string, string> = {
          username: 'El nombre de usuario ya está registrado. Elige otro.',
          documentNumber:
            'El número de documento ya está registrado en el sistema.',
          email: 'El correo electrónico ya está registrado. Usa otro.',
        };
        throw new ConflictException(
          fieldMessages[duplicatedField] ||
            'Ya existe un usuario con esos datos. Verifica e intenta de nuevo.',
        );
      }
      throw error;
    }

    // Sincronizar el documentNumber del nuevo usuario con todas las configs activas
    await this.syncUserWithConfigs(
      savedUser.documentNumber,
      savedUser.name || savedUser.username,
    );

    return savedUser;
  }

  /**
   * Actualiza el perfil del propio usuario autenticado.
   *
   * Solo acepta campos personales (lista blanca). Cualquier intento de cambiar
   * rol, estado, institución, documento, email o contraseña se descarta: el
   * auto-perfil nunca es una vía de escalada de privilegios.
   */
  async updateOwnProfile(
    userId: string,
    updateOwnProfileDto: UpdateOwnProfileDto,
  ): Promise<any> {
    // Defensa: el id viene del JWT, pero si faltara no debe llegar a la query.
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedException(
        'Se requiere autenticación para actualizar el perfil.',
      );
    }

    const { name, address, phoneNumber, birthDate, gender, avatar } =
      updateOwnProfileDto;

    const updatePayload: Record<string, any> = {};

    if (name !== undefined) updatePayload.name = name;
    if (address !== undefined) updatePayload.address = address;
    if (phoneNumber !== undefined) {
      updatePayload.phoneNumber = phoneNumber.replace(/\D/g, '');
    }
    if (gender !== undefined) updatePayload.gender = gender;
    if (avatar !== undefined) updatePayload.avatar = avatar;
    if (birthDate !== undefined) updatePayload.birthDate = new Date(birthDate);

    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException(
        'No se recibieron campos válidos para actualizar el perfil.',
      );
    }

    updatePayload.editedAt = new Date();

    const updated = await this.userModel
      .findByIdAndUpdate(userId, updatePayload, {
        new: true,
        runValidators: true,
      })
      .select('-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return updated;
  }

  /**
   * Valida que el rol enviado exista y que el solicitante pueda asignarlo.
   *
   * - Evita que un
   *   Administrador (o cualquier rol con permiso de gestión de usuarios) escale
   *   privilegios creando o editando usuarios.
   */
  private async assertRoleAssignable(
    roleId: string,
    actorRoleName?: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(roleId)) {
      throw new BadRequestException('El rol seleccionado no es válido.');
    }

    const role = await this.roleModel
      .findOne({ _id: roleId, deleted: { $ne: true } })
      .exec();

    if (!role) {
      throw new BadRequestException(
        'El rol seleccionado no existe o fue eliminado.',
      );
    }

    if (role.isSuperAdmin && actorRoleName !== 'Super Admin') {
      throw new ForbiddenException(
        'Solo un Super Admin puede asignar el rol Super Admin.',
      );
    }
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

  async update(
    updateUserDto: UpdateUserDto,
    options?: { actorRoleName?: string },
  ): Promise<any> {
    const { _id, password, ...payload } = updateUserDto;

    const userExists = await this.userModel.findById(_id).exec();
    if (!userExists) {
      throw new NotFoundException(`Usuario con id ${_id} no encontrado`);
    }

    // Un cambio de rol debe respetar las mismas reglas que el alta:
    // rol existente y sin escalada a Super Admin.
    if (payload.role) {
      await this.assertRoleAssignable(payload.role, options?.actorRoleName);
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

  // ─── Dashboard: Total usuarios + último usuario registrado ───
  async getOverviewStats() {
    const count = await this.userModel
      .countDocuments({ isActive: true })
      .exec();

    // Buscar el último usuario registrado por createdAt
    const lastUser = await this.userModel
      .findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .populate('role', 'name')
      .populate('company', 'name')
      .select('-password')
      .lean()
      .exec();

    let lastRegisteredUser = null;
    if (lastUser) {
      lastRegisteredUser = {
        userId: (lastUser as any)._id?.toString(),
        name: (lastUser as any).name,
        username: (lastUser as any).username,
        email: (lastUser as any).email,
        avatar: (lastUser as any).avatar,
        role: (lastUser as any).role
          ? {
              _id: (lastUser as any).role._id?.toString(),
              name: (lastUser as any).role.name,
            }
          : null,
        company: (lastUser as any).company
          ? {
              _id: (lastUser as any).company._id?.toString(),
              name: (lastUser as any).company.name,
            }
          : null,
        documentNumber: (lastUser as any).documentNumber,
        phoneNumber: (lastUser as any).phoneNumber,
        gender: (lastUser as any).gender,
        createdAt: (lastUser as any).createdAt,
      };
    }

    return { count, lastRegisteredUser };
  }

  /**
   * Lista usuarios con paginación real (server-side).
   *
   * Antes este método ignoraba `page`/`rows` y devolvía TODOS los usuarios con
   * tres `populate` completos: el paginador del dashboard era decorativo.
   *
   * @param pagination.page - Página solicitada (1-based). Por defecto 1.
   * @param pagination.rows - Tamaño de página (1..100). Por defecto 8.
   * @returns `{ data, total }` — mismo contrato que consumía el dashboard.
   */
  async findAllWithPaginate(pagination?: {
    page?: string | number;
    rows?: string | number;
  }): Promise<{ data: User[]; total: number }> {
    const page = Math.max(1, Number(pagination?.page) || 1);
    const rows = Math.min(100, Math.max(1, Number(pagination?.rows) || 8));
    const skip = (page - 1) * rows;

    const [data, total] = await Promise.all([
      this.userModel
        .find()
        .populate({ path: 'role', select: '_id name' })
        .populate({ path: 'documentType', select: '_id name' })
        .populate({ path: 'company', select: '_id name' })
        // `avatarGallery` es un array de presets por usuario: no lo necesita la tabla.
        .select('-password -avatarGallery')
        // Orden estable: sin él, skip/limit puede repetir o saltar documentos.
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(rows)
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return { data, total };
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
        'name username password documentNumber documentType address phoneNumber email keepSessionActive role company avatar gender birthDate isLogged totalScore serial isActive',
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
      .populate({
        path: 'role',
        populate: {
          path: 'permissionTemplate',
          populate: { path: 'permissions' },
        },
      })
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
      // No se revela si el email existe o no (evita enumeración de cuentas).
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      // Nunca incluir la contraseña, el hash ni datos del usuario en el error:
      // este mensaje termina en logs y en la respuesta HTTP.
      throw new UnauthorizedException('Credenciales inválidas');
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

  /**
   * Búsqueda de usuarios para el listado del panel.
   *
   * Devuelve los mismos campos que `allPaginate` **incluido `role`**: 
   */
  async search(searchTerm: string): Promise<Partial<User>[]> {
    const fields = 'name username email documentNumber avatar isActive role';
    const populateRole = { path: 'role', select: '_id name' };

    if (!searchTerm || searchTerm === 'all') {
      return this.userModel
        .find({ deleted: { $ne: true } })
        .select(fields)
        .populate(populateRole)
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
      .select(fields)
      .populate(populateRole)
      .limit(20)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Activa o desactiva un usuario
   * @param id - ID del usuario
   * @param active - Estado activo/inactivo
   * @param editedBy - Usuario que realizó el cambio
   */
  async setActive(id: string, active: boolean, editedBy: string) {
    try {
      const user = await this.userModel.findById(id);

      if (!user) {
        this.logger.warn(`User with ID ${id} not found`);
        throw new NotFoundException('User not found');
      }

      user.isActive = active;
      user.editedBy = editedBy;
      user.editedAt = new Date();

      await user.save();

      this.logger.log(`User with ID ${id} active status updated to ${active}`);
      return { message: 'User active status updated', user };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating active status for user with ID ${id}: ${error.message}`,
      );
      throw new InternalServerErrorException('Error updating user status');
    }
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
