/**
 * Seed: Agregar permisos de Enrollment a los roles existentes
 *
 * Crea 4 permisos (P-ENROLL-001 a P-ENROLL-004) y los asigna
 * a las plantillas de Admin, Docente y Estudiante según corresponda.
 *
 * Uso: npx tsx src/database/seeds/seed-enrollment-roles.ts
 *
 * Idempotente: si los permisos ya existen, los salta.
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
class SeedEnrollmentRolModule {}

async function bootstrap() {
  const app = await NestFactory.create(SeedEnrollmentRolModule);

  const categoryModel = app.get(getModelToken(PermissionCategory.name));
  const permissionModel = app.get(getModelToken(Permission.name));
  const templateModel = app.get(getModelToken(PermissionTemplate.name));
  const roleModel = app.get(getModelToken(Role.name));

  try {
    // 1. Verificar si los permisos ya existen (idempotente)
    const existingPerms = await permissionModel
      .find({ serial: { $in: ['P-ENROLL-001', 'P-ENROLL-002', 'P-ENROLL-003', 'P-ENROLL-004'] } })
      .exec();
    if (existingPerms.length >= 4) {
      console.log('✔ Todos los permisos P-ENROLL ya existen. Seed saltado (idempotente).');
      return;
    }

    // 2. Crear PermissionCategory si no existe
    let category = await categoryModel
      .findOne({ serial: 'CAT-ENROLL-001' })
      .exec();
    if (!category) {
      [category] = await categoryModel.create([
        {
          name: 'Inscripciones (Enrollments)',
          description:
            'Permisos para gestionar inscripciones de estudiantes en cursos',
          serial: 'CAT-ENROLL-001',
          isActive: true,
          deleted: false,
        },
      ]);
      console.log(`✔ Categoría creada: ${category.name}`);
    } else {
      console.log(`✔ Categoría ya existe: ${category.name}`);
    }

    // 3. Crear permisos faltantes
    const permisosData = [
      {
        name: 'Inscribir estudiantes',
        serial: 'P-ENROLL-001',
        description:
          'Permite inscribir estudiantes en cursos mediante el módulo de enrollments',
      },
      {
        name: 'Retirar estudiantes',
        serial: 'P-ENROLL-002',
        description:
          'Permite retirar estudiantes de cursos (cambiar estado a retirado)',
      },
      {
        name: 'Ver estudiantes del curso',
        serial: 'P-ENROLL-003',
        description:
          'Permite ver la lista de estudiantes inscritos en un curso',
      },
      {
        name: 'Ver mis cursos',
        serial: 'P-ENROLL-004',
        description:
          'Permite al estudiante ver sus cursos asignados',
      },
    ];

    const createdPermisos: any[] = [];
    for (const pData of permisosData) {
      const exists = await permissionModel.findOne({ serial: pData.serial }).exec();
      if (!exists) {
        const [perm] = await permissionModel.create([
          {
            ...pData,
            permissionCategory: category._id,
            isActive: true,
            deleted: false,
          },
        ]);
        createdPermisos.push(perm);
        console.log(`  ✔ Permiso creado: ${perm.serial} - ${perm.name}`);
      } else {
        createdPermisos.push(exists);
        console.log(`  → Permiso ya existe: ${exists.serial}`);
      }
    }

    // 4. Asignar permisos a las plantillas existentes
    // Admin → P-ENROLL-001, P-ENROLL-002, P-ENROLL-003
    // Docente → P-ENROLL-001, P-ENROLL-002, P-ENROLL-003
    // Estudiante → P-ENROLL-004

    const permIds_001_003 = createdPermisos
      .filter((p) => ['P-ENROLL-001', 'P-ENROLL-002', 'P-ENROLL-003'].includes(p.serial))
      .map((p) => p._id);

    const permIds_004 = createdPermisos
      .filter((p) => p.serial === 'P-ENROLL-004')
      .map((p) => p._id);

    // Buscar roles y sus plantillas
    const adminRole = await roleModel.findOne({ name: 'Administrador' }).populate('permissionTemplate').exec();
    const docenteRole = await roleModel.findOne({ name: 'Docente' }).populate('permissionTemplate').exec();
    const estudianteRole = await roleModel.findOne({ name: 'Estudiante' }).populate('permissionTemplate').exec();

    // Admin
    if (adminRole && (adminRole as any).permissionTemplate) {
      const templateId = (adminRole as any).permissionTemplate._id;
      await templateModel
        .findByIdAndUpdate(templateId, {
          $addToSet: { permissions: { $each: [...permIds_001_003, ...permIds_004] } },
        })
        .exec();
      console.log(`✔ Permisos agregados a plantilla del rol Administrador`);
    }

    // Docente
    if (docenteRole && (docenteRole as any).permissionTemplate) {
      const templateId = (docenteRole as any).permissionTemplate._id;
      await templateModel
        .findByIdAndUpdate(templateId, {
          $addToSet: { permissions: { $each: permIds_001_003 } },
        })
        .exec();
      console.log(`✔ Permisos agregados a plantilla del rol Docente`);
    }

    // Estudiante
    if (estudianteRole && (estudianteRole as any).permissionTemplate) {
      const templateId = (estudianteRole as any).permissionTemplate._id;
      await templateModel
        .findByIdAndUpdate(templateId, {
          $addToSet: { permissions: { $each: permIds_004 } },
        })
        .exec();
      console.log(`✔ Permisos agregados a plantilla del rol Estudiante`);
    }

    console.log('✅ Seed completado exitosamente.');
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
