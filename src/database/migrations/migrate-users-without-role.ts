/**
 * Migración: Asignar rol "Estudiante" a usuarios existentes sin rol (vibra-078)
 *
 * Uso: npx tsx src/database/migrations/migrate-users-without-role.ts
 *
 * Requisito: Ejecutar seed-estudiante-rol.ts primero.
 */
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { User, UserSchema } from '../../domains/users/schemas/user.schema';
import { Role, RoleSchema } from '../../domains/roles/schemas/role.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
})
class MigrateUsersModule {}

async function bootstrap() {
  const app = await NestFactory.create(MigrateUsersModule);

  const userModel = app.get(getModelToken(User.name));
  const roleModel = app.get(getModelToken(Role.name));

  try {
    // 1. Buscar rol Estudiante
    const estudianteRole = await roleModel
      .findOne({ name: 'Estudiante' })
      .exec();
    if (!estudianteRole) {
      console.error(
        '❌ Rol "Estudiante" no encontrado. Ejecute seed-estudiante-rol.ts primero.',
      );
      process.exit(1);
    }

    // 2. Contar usuarios sin rol
    const withoutRole = await userModel.countDocuments({
      $or: [{ role: null }, { role: { $exists: false } }],
    });
    if (withoutRole === 0) {
      console.log('✔ No hay usuarios sin rol. Migración saltada.');
      return;
    }

    console.log(`→ ${withoutRole} usuarios sin rol encontrados.`);

    // 3. Asignar rol Estudiante
    const result = await userModel
      .updateMany(
        { $or: [{ role: null }, { role: { $exists: false } }] },
        { $set: { role: estudianteRole._id } },
      )
      .exec();

    console.log(
      `✅ ${result.modifiedCount} usuarios migrados al rol "Estudiante".`,
    );

    // 4. Verificar
    const remaining = await userModel.countDocuments({
      $or: [{ role: null }, { role: { $exists: false } }],
    });
    if (remaining > 0) {
      console.warn(`⚠ ${remaining} usuarios aún sin rol (no se migraron).`);
    } else {
      console.log('✔ Todos los usuarios tienen rol asignado.');
    }
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
