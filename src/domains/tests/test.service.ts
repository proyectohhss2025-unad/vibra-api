import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Test, TestDocument } from './schemas/test.schema';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { PreTest } from '../preTest/schemas/preTest.schema';

@Injectable()
export class TestService {
  constructor(
    @InjectModel(Test.name) private testModel: Model<TestDocument>,
    @InjectModel(PreTest.name) private preTestModel: Model<PreTest>,
  ) {}

  async create(createTestDto: CreateTestDto): Promise<Test> {
    const existing = await this.testModel
      .findOne({ testId: createTestDto.testId })
      .exec();
    if (existing) {
      throw new ConflictException(
        `Ya existe un test con testId "${createTestDto.testId}"`,
      );
    }

    const test = new this.testModel(createTestDto);
    return test.save();
  }

  async search(searchTerm: string): Promise<Test[]> {
    if (!searchTerm || searchTerm === 'all') {
      return this.testModel.find().limit(20).sort({ createdAt: -1 }).exec();
    }
    return this.testModel
      .find({
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { testId: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .limit(20)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    category?: string,
  ): Promise<{ data: Test[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { testId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const [data, total] = await Promise.all([
      this.testModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.testModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<Test> {
    const test = await this.testModel.findById(id).exec();
    if (!test) {
      throw new NotFoundException(`Test con ID "${id}" no encontrado`);
    }
    return test;
  }

  async findByTestId(testId: string): Promise<Test> {
    const test = await this.testModel.findOne({ testId }).exec();
    if (!test) {
      throw new NotFoundException(`Test con testId "${testId}" no encontrado`);
    }
    return test;
  }

  async update(id: string, updateTestDto: UpdateTestDto): Promise<Test> {
    if (!updateTestDto || Object.keys(updateTestDto).length === 0) {
      throw new NotFoundException(
        'No se proporcionaron datos para actualizar.',
      );
    }

    // Si se está cambiando el testId, verificar que no exista otro con ese valor
    if (updateTestDto.testId) {
      const existing = await this.testModel
        .findOne({
          testId: updateTestDto.testId,
          _id: { $ne: id },
        })
        .exec();
      if (existing) {
        throw new ConflictException(
          `Ya existe otro test con testId "${updateTestDto.testId}"`,
        );
      }
    }

    const updated = await this.testModel
      .findByIdAndUpdate(id, { $set: updateTestDto }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Test con ID "${id}" no encontrado`);
    }
    return updated;
  }

  async remove(id: string): Promise<Test> {
    const deleted = await this.testModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Test con ID "${id}" no encontrado`);
    }
    return deleted;
  }

  /**
   * Find pending tests by type (initial/final) for a specific user.
   * Returns tests that have showAtStart or showAtEnd flag and haven't been completed by the user.
   */
  async findPendingByType(
    type: 'initial' | 'final',
    userId: string,
  ): Promise<{ data: Test[]; total: number }> {
    const flag = type === 'initial' ? 'showAtStart' : 'showAtEnd';

    // Find tests with the flag enabled and active
    const tests = await this.testModel
      .find({ [flag]: true, isActive: true })
      .sort({ createdAt: -1 })
      .exec();

    // Check which ones the user has already completed
    const completedTestIds = await this.preTestModel
      .distinct('testId', { userId })
      .exec();

    const pending = tests.filter((t) => !completedTestIds.includes(t.testId));

    return { data: pending, total: pending.length };
  }

  async toggleStatus(id: string): Promise<Test> {
    const test = await this.testModel.findById(id).exec();
    if (!test) {
      throw new NotFoundException(`Test con ID "${id}" no encontrado`);
    }

    test.isActive = !test.isActive;
    return test.save();
  }
}
