import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePreTestDto } from './dto/create-pretest.dto';
import { UpdatePreTestDto } from './dto/update-pretest.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PreTest, TestDocument } from './schemas/preTest.schema';
import { Test } from '../tests/schemas/test.schema';

@Injectable()
export class PreTestService {
  constructor(
    @InjectModel(PreTest.name) private preTestModel: Model<TestDocument>,
    @InjectModel(Test.name) private testModel: Model<Test>,
  ) {}

  async create(createTestDto: CreatePreTestDto): Promise<PreTest> {
    const totalScore =
      typeof createTestDto.totalScore === 'number'
        ? createTestDto.totalScore
        : (createTestDto.responses || []).reduce(
            (sum: number, response: any) => sum + (response.points || 0),
            0,
          );

    const test = new this.preTestModel({
      ...createTestDto,
      totalScore,
    });
    return test.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: PreTest[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.preTestModel.find().skip(skip).limit(limit).exec(),
      this.preTestModel.countDocuments(),
    ]);
    return { data, total };
  }

  async getCountAll(query: any) {
    return this.preTestModel.countDocuments(query).exec();
  }

  async findByTestId(
    testId: string,
    page: number = 1,
    limit: number = 10,
    userId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ data: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const matchFilter: any = { testId };
    if (userId) {
      matchFilter.userId = userId;
    }
    if (dateFrom || dateTo) {
      matchFilter.createdAt = {};
      if (dateFrom) matchFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilter.createdAt.$lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.preTestModel
        .aggregate([
          { $match: matchFilter },
          { $sort: { _id: -1 } },
          { $skip: skip },
          { $limit: limit },
          // Buscar usuario por documentNumber O por _id (soporta ambos formatos de userId)
          {
            $lookup: {
              from: 'users',
              let: { userIdStr: '$userId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        { $eq: ['$documentNumber', '$$userIdStr'] },
                        { $eq: [{ $toString: '$_id' }, '$$userIdStr'] },
                      ],
                    },
                  },
                },
              ],
              as: 'user',
            },
          },
          // Buscar el rol del usuario desde el primer user encontrado
          {
            $lookup: {
              from: 'roles',
              let: {
                roleId: {
                  $ifNull: [{ $arrayElemAt: ['$user.role', 0] }, null],
                },
              },
              pipeline: [
                { $match: { $expr: { $eq: ['$_id', '$$roleId'] } } },
                { $project: { _id: 0, name: 1 } },
              ],
              as: 'role',
            },
          },
          {
            $addFields: {
              userName: {
                $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, '$userId'],
              },
              userRole: {
                $ifNull: [{ $arrayElemAt: ['$role.name', 0] }, null],
              },
              createdAt: { $ifNull: ['$createdAt', null] },
            },
          },
          {
            $project: {
              user: 0,
              role: 0,
              __v: 0,
            },
          },
        ])
        .exec(),
      this.preTestModel.countDocuments(matchFilter).exec(),
    ]);

    return { data, total };
  }

  /*
    findOne(id: number) {
      return `This action returns a #${id} test`;
    }*/

  async update(id: string, updateTestDto: UpdatePreTestDto): Promise<PreTest> {
    if (!updateTestDto || Object.keys(updateTestDto).length === 0) {
      throw new NotFoundException(
        'No se proporcionaron datos para actualizar.',
      );
    }

    const updated = await this.preTestModel
      .findByIdAndUpdate(id, { $set: updateTestDto }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Pre-test not found.');
    }
    return updated;
  }

  async remove(id: string): Promise<PreTest> {
    const deleted = await this.preTestModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Pre-test not found.');
    }
    return deleted;
  }

  /**
   *
   * @param testData
   * @returns
   */
  async savePreTestResponse(testData: any): Promise<PreTest> {
    let parsedBody = testData;

    // Parsear si viene como string
    if (typeof testData === 'string') {
      try {
        parsedBody = JSON.parse(testData);
      } catch (e) {
        throw new Error('Invalid JSON in request body');
      }
    } else if (testData?.body && typeof testData.body === 'string') {
      try {
        parsedBody = JSON.parse(testData.body);
      } catch (e) {
        throw new Error('Invalid JSON in request body');
      }
    }

    // Validar que userId esté presente
    if (!parsedBody?.userId) {
      throw new Error('userId es requerido pero no fue proporcionado');
    }

    const responses = parsedBody?.responses || [];
    const totalScore =
      typeof parsedBody?.totalScore === 'number'
        ? parsedBody.totalScore
        : responses.reduce(
            (sum: number, response: any) => sum + (response.points || 0),
            0,
          );

    const test = new this.preTestModel({
      ...parsedBody,
      totalScore,
    });
    return test.save();
  }

  /**
   *
   * @param userId
   * @param testId
   * @returns
   */
  async getUserAndTestResponses(
    userId: string,
    testId: string,
  ): Promise<PreTest[]> {
    return this.preTestModel.find({ userId, testId }).exec();
  }

  /**
   *
   * @param userId
   * @returns
   */
  async getAlByUserId(userId: string): Promise<PreTest[]> {
    return this.preTestModel.find({ userId }).exec();
  }

  /**
   *
   * @returns
   */
  async getAllPreTestResults(): Promise<PreTest[]> {
    console.log('Entro....');
    return this.preTestModel.find().exec();
  }

  /**
   *
   * @param id
   * @returns
   */
  async getPreTestResultById(id: string): Promise<PreTest> {
    const testResult = await this.preTestModel
      .findById(id)
      .populate({
        path: 'userId',
        model: 'User',
      })
      .exec();
    if (!testResult) {
      throw new NotFoundException('Test result not found');
    }
    return testResult;
  }

  /**
   * Obtiene el estado de los tests activos para un usuario, filtrados opcionalmente por tipo.
   *
   * @param userId - ID del usuario (documentNumber)
   * @param type - Opcional: 'initial' filtra por showAtStart, 'final' filtra por showAtEnd
   * @returns Estado de completitud de tests
   */
  async getStatusByUserId(
    userId: string,
    type?: 'initial' | 'final',
  ): Promise<{
    totalTests: number;
    completedTests: number;
    pendingTests: number;
    allCompleted: boolean;
    tests: Array<{
      testId: string;
      title: string;
      description: string;
      completed: boolean;
      completedAt?: Date;
      score?: number;
    }>;
  }> {
    // Construir filtro base: solo tests activos
    const filter: any = { isActive: true };

    // Agregar filtro por bandera según el tipo solicitado
    if (type === 'initial') {
      filter.showAtStart = true;
    } else if (type === 'final') {
      filter.showAtEnd = true;
    }
    // Si type es undefined, se retornan todos los activos (backward compatible)

    // Obtener tests activos del catálogo aplicando filtro
    const allTests = await this.testModel
      .find(filter)
      .select('testId title description')
      .sort({ createdAt: 1 })
      .exec();

    // Obtener los pretests que el usuario ya completó
    const userPretests = await this.preTestModel
      .find({ userId })
      .select('testId createdAt totalScore')
      .exec();

    // Mapa de tests completados por testId para acceso rápido
    const completedMap = new Map<string, (typeof userPretests)[0]>();
    for (const pt of userPretests) {
      if (!completedMap.has(pt.testId)) {
        completedMap.set(pt.testId, pt);
      }
    }

    // Armar la lista con estado
    const tests = allTests.map((test) => {
      const completed = completedMap.get(test.testId);
      return {
        testId: test.testId,
        title: test.title,
        description: test.description,
        completed: !!completed,
        completedAt: completed?._id?.getTimestamp(),
        score: completed?.totalScore,
      };
    });

    const completedTests = tests.filter((t) => t.completed).length;

    return {
      totalTests: tests.length,
      completedTests,
      pendingTests: tests.length - completedTests,
      allCompleted: completedTests === tests.length,
      tests,
    };
  }
}
