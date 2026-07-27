/**
 * Seed: Crear rol Estudiante con sus permisos específicos (vibra-078)
 *
 * Uso: npx tsx src/database/seeds/seed-estudiante-rol.ts
 *
 * Idempotente: si el rol ya existe, no hace nada.
 */
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import {
  PermissionCategory,
  PermissionCategorySchema,
} from '../../domains/permissionCategory/schemas/permissionCategory.schema';
import {
  Permission,
  PermissionSchema,
} from '../../domains/permissions/schemas/permission.schema';
import {
  PermissionTemplate,
  PermissionTemplateSchema,
} from '../../domains/permissionTemplates/schemas/permissionTemplate.schema';
import { Role, RoleSchema } from '../../domains/roles/schemas/role.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI),
    MongooseModule.forFeature([
      { name: PermissionCategory.name, schema: PermissionCategorySchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: PermissionTemplate.name, schema: PermissionTemplateSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
})
class SeedEstudianteRolModule {}

async function bootstrap() {
  const app = await NestFactory.create(SeedEstudianteRolModule);

  const categoryModel = app.get(getModelToken(PermissionCategory.name));
  const permissionModel = app.get(getModelToken(Permission.name));
  const templateModel = app.get(getModelToken(PermissionTemplate.name));
  const roleModel = app.get(getModelToken(Role.name));

  try {
    // 1. Verificar si ya existe
    const existingRole = await roleModel.findOne({ name: 'Estudiante' }).exec();
    if (existingRole) {
      console.log('✔ Rol "Estudiante" ya existe. Seed saltado (idempotente).');
      return;
    }

    // 2. Crear PermissionCategory
    const [category] = await categoryModel.create([
      {
        name: 'Estudiante',
        description:
          'Permisos específicos para estudiantes en la plataforma Vibra',
        serial: 'CAT-EST-001',
        isActive: true,
        deleted: false,
      },
    ]);
    console.log(`✔ Categoría creada: ${category.name}`);

    // 3. Crear 7 permisos
    const permisosData = [
      {
        name: 'Ver tests',
        serial: 'P-EST-001',
        description:
          'Visualizar tests disponibles y su detalle en la app mobile',
      },
      {
        name: 'Responder tests',
        serial: 'P-EST-002',
        description: 'Enviar respuestas de tests y pre-tests',
      },
      {
        name: 'Ver actividades',
        serial: 'P-EST-003',
        description:
          'Visualizar actividad del día, historial y detalle de actividades',
      },
      {
        name: 'Responder actividades',
        serial: 'P-EST-004',
        description: 'Enviar respuestas de actividades, retos y completions',
      },
      {
        name: 'Gestionar perfil',
        serial: 'P-EST-005',
        description: 'Editar avatar y datos del propio perfil de usuario',
      },
      {
        name: 'Ver resultados',
        serial: 'P-EST-006',
        description:
          'Ver resultados de tests, historial de actividades y leaderboard',
      },
      {
        name: 'Interactuar',
        serial: 'P-EST-007',
        description:
          'Registrar emociones, enviar feedback, gestionar notificaciones',
      },
    ];

    const permisos = await permissionModel.insertMany(
      permisosData.map((p) => ({
        ...p,
        permissionCategory: category._id,
        isActive: true,
        deleted: false,
      })),
    );
    console.log(`✔ ${permisos.length} permisos creados`);

    // 4. Crear PermissionTemplate
    const [template] = await templateModel.create([
      {
        name: 'Estudiante',
        description: 'Plantilla base con permisos mínimos para estudiantes',
        permissions: permisos.map((p) => p._id),
        serial: 'TMPL-EST-001',
        isActive: true,
        deleted: false,
      },
    ]);
    console.log(`✔ Template creado: ${template.name}`);

    // 5. Crear Role
    const [role] = await roleModel.create([
      {
        name: 'Estudiante',
        description: 'Rol base para estudiantes de la plataforma Vibra',
        permissionTemplate: template._id,
        isSuperAdmin: false,
        serial: 'ROLE-EST-001',
        isActive: true,
        deleted: false,
      },
    ]);
    console.log(`✔ Rol creado: ${role.name} (${role.serial})`);
    console.log('✅ Seed completado exitosamente.');
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
