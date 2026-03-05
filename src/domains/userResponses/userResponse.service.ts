import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserResponse } from './schemas/userResponse.schema';

@Injectable()
export class UserResponseService {
    constructor(
        @InjectModel(UserResponse.name)
        private responseModel: Model<UserResponse>
    ) { }

    /**
     * Creates a new user response.
     * @param responseData - The data for the new user response.
     * @returns The created user response.
     */
    async createResponse(responseData: Partial<UserResponse>): Promise<UserResponse> {
        const response = new this.responseModel(responseData);
        return response.save();
    }

    /**
     * Retrieves all user responses for a given user.
     * @param userId - The ID of the user.
     * @returns An array of user responses.
     */
    async getUserResponses(userId: string): Promise<UserResponse[]> {
        return this.responseModel
            .find({ user: userId })
            .sort({ createdAt: -1 })
            .exec();
    }
}