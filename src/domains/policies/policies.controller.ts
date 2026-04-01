import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { Policy } from './schemas/policy.schema';
import { AuthGuard } from './guard/auth.guard';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

class PolicyDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  isActive?: boolean;
}

class PoliciesListDto {
  @ApiProperty({ type: [PolicyDto] })
  items: PolicyDto[];
}

@ApiTags('Policies')
@Controller('api/policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Crear política' })
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({ status: 201, description: 'Política creada.' })
  async createPolicy(@Body() createPolicyDto: Partial<Policy>) {
    return this.policiesService.createPolicy(createPolicyDto);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Actualizar política' })
  @ApiParam({ name: 'id', description: 'ID de la política.' })
  @ApiBody({ schema: { type: 'object' } })
  @ApiOkResponse({ description: 'Política actualizada.', type: PolicyDto })
  async updatePolicy(
    @Param('id') id: string,
    @Body() updatePolicyDto: Partial<Policy>,
  ) {
    return this.policiesService.updatePolicy(id, updatePolicyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar políticas activas' })
  @ApiOkResponse({ description: 'Listado de políticas.', type: PoliciesListDto })
  async getAllPolicies() {
    return this.policiesService.getAllPolicies();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Obtener política por id' })
  @ApiParam({ name: 'id', description: 'ID de la política.' })
  @ApiOkResponse({ description: 'Política encontrada.', type: PolicyDto })
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
  @ApiOperation({ summary: 'Aceptar política' })
  @ApiParam({ name: 'id', description: 'ID de la política.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        policyId: { type: 'string' },
        userId: { type: 'string' },
      },
      required: ['policyId', 'userId'],
    },
  })
  @ApiOkResponse({ description: 'Aceptación registrada.' })
  async acceptPolicy(
    @Body('policyId') policyId: string,
    @Body('userId') userId: string,
    @Req() request: any,
  ): Promise<any> {
    const userAgent = request.headers['user-agent'];
    const ipAddress = request.ip;
    return this.policiesService.acceptPolicy(
      userId,
      policyId,
      userAgent,
      ipAddress,
    );
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
  @ApiOperation({ summary: 'Aceptar múltiples políticas' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        policyIds: { type: 'array', items: { type: 'string' } },
        userId: { type: 'string' },
      },
      required: ['policyIds', 'userId'],
    },
  })
  @ApiOkResponse({ description: 'Aceptaciones registradas.' })
  async acceptMultiplePolicies(
    @Body('policyIds') policyIds: string[],
    @Body('userId') userId: string,
    @Req() request: any,
  ): Promise<any> {
    const userAgent = request.headers['user-agent'];
    const ipAddress = request.ip;
    return this.policiesService.acceptMultiplePolicies(
      userId,
      policyIds,
      userAgent,
      ipAddress,
    );
  }

  @Get('user/:userId/pending')
  @ApiOperation({ summary: 'Listar políticas pendientes por usuario' })
  @ApiParam({ name: 'userId', description: 'ID del usuario.' })
  @ApiOkResponse({ description: 'Listado de políticas pendientes.', type: PoliciesListDto })
  async getUserPendingPolicies(@Param('userId') userId: string) {
    return this.policiesService.getUserPendingPolicies(userId);
  }

  @Get('user/:userId/check/:policyId')
  @ApiOperation({ summary: 'Verificar aceptación de una política' })
  @ApiParam({ name: 'userId', description: 'ID del usuario.' })
  @ApiParam({ name: 'policyId', description: 'ID de la política.' })
  @ApiOkResponse({ description: 'Resultado de verificación.', schema: { type: 'object' } })
  async checkPolicyAcceptance(
    @Param('userId') userId: string,
    @Param('policyId') policyId: string,
  ) {
    return this.policiesService.checkPolicyAcceptance(userId, policyId);
  }
}
