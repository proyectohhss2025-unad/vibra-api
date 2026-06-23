import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { SecurityService } from './security.service';
import { BlockedIpQueryDto } from './dto/blocked-ip-query.dto';
import {
  BlockedIpResponseDto,
  BlockedIpListResponseDto,
} from './dto/blocked-ip.dto';
import { ReleaseIpResponseDto } from './dto/release-ip.dto';

@ApiTags('Security')
@Controller('api/blocked-ips')
@RequirePermission('9')
export class BlockedIpController {
  constructor(private readonly securityService: SecurityService) {}

  @Get()
  @ApiOperation({ summary: 'Listar IPs bloqueadas/liberadas' })
  @ApiOkResponse({ type: BlockedIpListResponseDto })
  async findAll(
    @Query() query: BlockedIpQueryDto,
  ): Promise<BlockedIpListResponseDto> {
    const result = await this.securityService.getBlockedIps(
      query.page || 1,
      query.limit || 20,
      query.filter,
    );

    return {
      data: result.data as unknown as BlockedIpResponseDto[],
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Get(':ip')
  @ApiOperation({ summary: 'Obtener detalle de una IP bloqueada' })
  @ApiParam({ name: 'ip', description: 'Dirección IP' })
  @ApiOkResponse({ type: BlockedIpResponseDto })
  async findOne(@Param('ip') ip: string): Promise<BlockedIpResponseDto> {
    const blockedIp = await this.securityService.getBlockedIp(ip);
    return blockedIp as unknown as BlockedIpResponseDto;
  }

  @Get(':ip/info')
  @ApiOperation({ summary: 'Re-consultar metadata de IP en ip-api.com' })
  @ApiParam({ name: 'ip', description: 'Dirección IP' })
  @ApiOkResponse({ type: BlockedIpResponseDto })
  async refreshInfo(@Param('ip') ip: string): Promise<BlockedIpResponseDto> {
    const blockedIp = await this.securityService.refreshIpMetadata(ip);
    return blockedIp as unknown as BlockedIpResponseDto;
  }

  @Patch(':ip/release')
  @ApiOperation({ summary: 'Liberar una IP bloqueada' })
  @ApiParam({ name: 'ip', description: 'Dirección IP' })
  @ApiOkResponse({ type: ReleaseIpResponseDto })
  @HttpCode(HttpStatus.OK)
  async release(
    @Param('ip') ip: string,
    @Req() req: any,
  ): Promise<ReleaseIpResponseDto> {
    const adminUserId =
      req.user?.userId || req.user?._id?.toString() || 'unknown';
    await this.securityService.releaseIP(ip, adminUserId);
    return {
      ip,
      success: true,
      message: `IP "${ip}" liberada exitosamente`,
    };
  }

  @Delete(':ip')
  @ApiOperation({ summary: 'Eliminar IP de la colección (no solo liberar)' })
  @ApiParam({ name: 'ip', description: 'Dirección IP' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('ip') ip: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.securityService.deleteBlockedIp(ip);
    return {
      success: true,
      message: `IP "${ip}" eliminada de la lista negra`,
    };
  }
}
