/**
 * Seed: Crear rol Docente con sus permisos específicos (vibra-156)
 *
 * Uso: npx tsx src/database/seeds/seed-docente-rol.ts
 *
 * Idempotente: si el rol ya existe, no hace nada.
 *
 * Patrón: seed-estudiante-rol.ts (vibra-078)
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
class SeedDocenteRolModule {}

async function bootstrap() {
  const app = await NestFactory.create(SeedDocenteRolModule);

  const categoryModel = app.get(getModelToken(PermissionCategory.name));
  const permissionModel = app.get(getModelToken(Permission.name));
  const templateModel = app.get(getModelToken(PermissionTemplate.name));
  const roleModel = app.get(getModelToken(Role.name));

  try {
    // 1. Verificar si ya existe
    const existingRole = await roleModel.findOne({ name: 'Docente' }).exec();
    if (existingRole) {
      console.log('✔ Rol "Docente" ya existe. Seed saltado (idempotente).');
      return;
    }

    // 2. Crear PermissionCategory
    const [category] = await categoryModel.create([
      {
        name: 'Docente',
        description:
          'Permisos específicos para docentes en la plataforma Vibra',
        serial: 'CAT-DOC-001',
        isActive: true,
        deleted: false,
      },
    ]);
    console.log(`✔ Categoría creada: ${category.name}`);

    // 3. Crear 6 permisos P-DOC
    const permisosData = [
      {
        name: 'Ver estudiantes',
        serial: 'P-DOC-001',
        description:
          'Visualizar lista de estudiantes del grupo y buscar usuarios',
      },
      {
        name: 'Ver resultados',
        serial: 'P-DOC-002',
        description: 'Ver resultados de tests y actividades de los estudiantes',
      },
      {
        name: 'Gestionar actividades',
        serial: 'P-DOC-003',
        description: 'Crear, editar, activar/desactivar actividades y retos',
      },
      {
        name: 'Gestionar tests',
        serial: 'P-DOC-004',
        description: 'Crear, editar, activar/desactivar tests',
      },
      {
        name: 'Ver reportes',
        serial: 'P-DOC-005',
        description: 'Acceder a reportes y estadísticas del grupo',
      },
      {
        name: 'Gestionar emociones',
        serial: 'P-DOC-006',
        description: 'Gestionar el catálogo de emociones',
      },
    ];

    const nuevosPermisos = await permissionModel.insertMany(
      permisosData.map((p) => ({
        ...p,
        permissionCategory: category._id,
        isActive: true,
        deleted: false,
      })),
    );
    console.log(`✔ ${nuevosPermisos.length} permisos P-DOC creados`);

    // 4. Buscar permisos existentes por serial que también aplican al docente
    const serialesExistentes = ['8', '15', '16'];
    const permisosExistentes = await permissionModel
      .find({ serial: { $in: serialesExistentes } })
      .exec();

    if (permisosExistentes.length !== serialesExistentes.length) {
      console.warn(
        `⚠ Se encontraron ${permisosExistentes.length}/${serialesExistentes.length} permisos existentes. ` +
          `Serials encontrados: [${permisosExistentes.map((p) => p.serial).join(', ')}]`,
      );
    } else {
      console.log(
        `✔ ${permisosExistentes.length} permisos existentes vinculados: [${serialesExistentes.join(', ')}]`,
      );
    }

    // 5. Crear PermissionTemplate (nuevos + existentes)
    const todosLosPermisos = [
      ...nuevosPermisos.map((p) => p._id),
      ...permisosExistentes.map((p) => p._id),
    ];

    const [template] = await templateModel.create([
      {
        name: 'Docente',
        description:
          'Plantilla con permisos para gestión educativa (P-DOC + existentes)',
        permissions: todosLosPermisos,
        serial: 'TMPL-DOC-001',
        isActive: true,
        deleted: false,
      },
    ]);
    console.log(
      `✔ Template creado: ${template.name} (${todosLosPermisos.length} permisos)`,
    );

    // 6. Crear Role
    const [role] = await roleModel.create([
      {
        name: 'Docente',
        description:
          'Rol para docentes con acceso a gestión educativa en Vibra',
        permissionTemplate: template._id,
        isSuperAdmin: false,
        serial: 'ROLE-DOC-001',
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
