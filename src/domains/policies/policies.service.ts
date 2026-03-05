/**
 * Service responsible for managing policies and user policy acceptance
 * @class PoliciesService
 * @description Handles CRUD operations for policies and tracks user acceptance of policies
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Policy, PolicyDocument } from './schemas/policy.schema';
import { UserPolicy, UserPolicyDocument } from './schemas/userPolicy.schema';

@Injectable()
export class PoliciesService {
    constructor(
        @InjectModel(Policy.name) private policyModel: Model<PolicyDocument>,
        @InjectModel(UserPolicy.name) private userPolicyModel: Model<UserPolicyDocument>,
    ) { }

    /**
     * Creates a new policy in the system
     * @param createPolicyDto - Partial Policy object containing the policy details to create
     * @returns Promise<Policy> - The newly created policy
     */
    async createPolicy(createPolicyDto: Partial<Policy>): Promise<Policy> {
        const createdPolicy = new this.policyModel(createPolicyDto);
        return createdPolicy.save();
    }

    /**
     * Updates an existing policy in the system
     * @param id - The ID of the policy to update
     * @param updatePolicyDto - Partial Policy object containing the updated policy details
     * @returns Promise<Policy> - The updated policy
     * @throws NotFoundException if the policy is not found
     */
    async updatePolicy(id: string, updatePolicyDto: Partial<Policy>): Promise<Policy> {
        const policy = await this.policyModel.findByIdAndUpdate(id, updatePolicyDto, { new: true }).exec();
        if (!policy) {
            throw new NotFoundException('Policy not found');
        }
        return policy;
    }

    /**
     * Retrieves all active policies from the system
     * @returns Promise<Policy[]> - An array of all active policies
     */
    async getAllPolicies(): Promise<Policy[]> {
        return this.policyModel.find({ isActive: true }).exec();
    }

    /**
     * Retrieves a specific policy by its ID
     * @param id - The ID of the policy to retrieve
     * @returns Promise<Policy> - The requested policy
     * @throws NotFoundException if the policy is not found
     */
    async getPolicyById(id: string): Promise<Policy> {
        const policy = await this.policyModel.findById({ _id: id }).exec();
        if (!policy) {
            throw new NotFoundException('Policy not found');
        }
        return policy;
    }

    /**
     * Records a user's acceptance of a specific policy
     * @param userId - The ID of the user accepting the policy
     * @param policyId - The ID of the policy being accepted
     * @param userAgent - Optional. The user agent string from the client's browser
     * @param ipAddress - Optional. The IP address of the user accepting the policy
     * @returns Promise<UserPolicy> - The created user policy record
     * @throws NotFoundException if the policy is not found
     */
    async acceptPolicy(userId: string, policyId: string, userAgent?: string, ipAddress?: string): Promise<UserPolicy> {
        const policy = await this.getPolicyById(policyId);
        console.log('policy:', policy);
        const userPolicy = new this.userPolicyModel({
            userId,
            policyId,
            version: policy.version,
            userPolicyKey: `${userId}-${policyId}-${policy.version}`,
            isAccepted: true,
            userAgent,
            ipAddress,
        });

        return userPolicy.save();
    }

    /**
     * Records a user's acceptance of multiple policies at once
     * @param userId - The ID of the user accepting the policies
     * @param policyIds - Array of policy IDs to be accepted
     * @param userAgent - Optional. The user agent string from the client's browser
     * @param ipAddress - Optional. The IP address of the user accepting the policies
     * @returns Promise<UserPolicy[]> - Array of created user policy records
     * @throws NotFoundException if any policy is not found
     */
    async acceptMultiplePolicies(
        userId: string,
        policyIds: string[],
        userAgent?: string,
        ipAddress?: string
    ): Promise<UserPolicy[]> {
        const userPolicies = await Promise.all(
            policyIds.map(async (policyId) => {
                const policy = await this.getPolicyById(policyId);
                return new this.userPolicyModel({
                    userId,
                    policyId,
                    version: policy.version,
                    userPolicyKey: `${userId}-${policyId}-${policy.version}`,
                    isAccepted: true,
                    userAgent,
                    ipAddress,
                });
            })
        );

        return this.userPolicyModel.insertMany(userPolicies);
    }

    /**
     * Checks if a user has accepted a specific policy
     * @param userId - The ID of the user to check
     * @param policyId - The ID of the policy to check
     * @returns Promise<boolean> - True if the user has accepted the policy, false otherwise
     */
    async checkPolicyAcceptance(userId: string, policyId: string): Promise<boolean> {
        const policy = await this.getPolicyById(policyId);
        const userPolicy = await this.userPolicyModel
            .findOne({
                userId,
                policyId,
                version: policy.version,
                isAccepted: true,
            })
            .exec();

        return !!userPolicy;
    }

    /**
     * Retrieves all pending policies for a specific user
     * @param userId - The ID of the user to retrieve pending policies for
     * @returns Promise<Policy[]> - An array of all pending policies for the user
     */
    async getUserPendingPolicies(userId: string): Promise<Policy[]> {
        const acceptedPolicies = await this.userPolicyModel
            .find({ userId, isAccepted: true })
            .distinct('policyId')
            .exec();

        return this.policyModel
            .find({
                isActive: true,
                _id: { $nin: acceptedPolicies },
            })
            .exec();
    }
}