import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePreTestDto } from './dto/create-pretest.dto';
import { UpdatePreTestDto } from './dto/update-pretest.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PreTest, TestDocument } from './schemas/preTest.schema';

@Injectable()
export class PreTestService {
  constructor(
    @InjectModel(PreTest.name) private preTestModel: Model<TestDocument>,
  ) { }

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

  /*
    findOne(id: number) {
      return `This action returns a #${id} test`;
    }*/

  async update(id: string, updateTestDto: UpdatePreTestDto): Promise<PreTest> {
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
    const parsedBody =
      typeof testData === 'string'
        ? JSON.parse(testData)
        : typeof testData?.body === 'string'
          ? JSON.parse(testData.body)
          : testData;

    const responses = parsedBody?.responses || [];
    const totalScore = responses.reduce(
      (sum: number, response: any) => sum + (response.points || 0),
      0,
    );
    const test = new this.preTestModel({ ...parsedBody, totalScore });
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
}
