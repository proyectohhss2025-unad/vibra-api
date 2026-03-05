import { Controller, Get, Post, Body, Param, Put, Req, UseGuards } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { Policy } from './schemas/policy.schema';
import { AuthGuard } from './guard/auth.guard';

@Controller('policies')
export class PoliciesController {
    constructor(private readonly policiesService: PoliciesService) { }

    @Post()
    @UseGuards(AuthGuard)
    async createPolicy(@Body() createPolicyDto: Partial<Policy>) {
        return this.policiesService.createPolicy(createPolicyDto);
    }

    @Put(':id')
    @UseGuards(AuthGuard)
    async updatePolicy(
        @Param('id') id: string,
        @Body() updatePolicyDto: Partial<Policy>,
    ) {
        return this.policiesService.updatePolicy(id, updatePolicyDto);
    }

    @Get()
    //@UseGuards(AuthGuard)
    async getAllPolicies() {
        return this.policiesService.getAllPolicies();
    }

    @Get(':id')
    @UseGuards(AuthGuard)
    async getPolicyById(@Param('id') id: string) {
        return this.policiesService.getPolicyById(id);
    }

    /**
     * Records a user's acceptance of a specific policy, capturing user agent and IP address information.
     * 
     * @param {string} policyId - The unique identifier of the policy being accepted
     * @param {string} userId - The unique identifier of the user accepting the policy
     * @param {any} request - The request object containing user agent and IP address information
     * @returns {Promise<any>} A promise that resolves to the created user policy acceptance record
     */
    @Post(':id/accept')
    @UseGuards(AuthGuard)
    async acceptPolicy(
        @Body('policyId') policyId: string,
        @Body('userId') userId: string,
        @Req() request: any,
    ): Promise<any> {
        const userAgent = request.headers['user-agent'];
        const ipAddress = request.ip;
        return this.policiesService.acceptPolicy(userId, policyId, userAgent, ipAddress);
    }

    /**
     * Records a user's acceptance of multiple policies at once, capturing user agent and IP address information.
     *
     * @param {string[]} policyIds - An array of unique identifiers for the policies being accepted
     * @param {string} userId - The unique identifier of the user accepting the policies
     * @param {any} request - The request object containing user agent and IP address information
     * @returns {Promise<any>} A promise that resolves to an array of created user policy acceptance records
     */
    @Post('accept-multiple')
    //@UseGuards(AuthGuard)
    async acceptMultiplePolicies(
        @Body('policyIds') policyIds: string[],
        @Body('userId') userId: string,
        @Req() request: any,
    ): Promise<any> {
        const userAgent = request.headers['user-agent'];
        const ipAddress = request.ip;
        return this.policiesService.acceptMultiplePolicies(userId, policyIds, userAgent, ipAddress);
    }

    @Get('user/:userId/pending')
    async getUserPendingPolicies(@Param('userId') userId: string) {
        return this.policiesService.getUserPendingPolicies(userId);
    }

    @Get('user/:userId/check/:policyId')
    async checkPolicyAcceptance(
        @Param('userId') userId: string,
        @Param('policyId') policyId: string,
    ) {
        return this.policiesService.checkPolicyAcceptance(userId, policyId);
    }
}