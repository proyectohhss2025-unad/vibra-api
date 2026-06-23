import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../infrastructure/auth/public.decorator';
import { RankingQueryDto } from './dto/ranking-query.dto';
import { RankingResponseDto } from './dto/ranking-response.dto';
import { RankingsRestService } from './rankings-rest.service';

@ApiTags('Rankings')
@Controller('api/rankings')
export class RankingsController {
  private readonly logger = new Logger(RankingsController.name);

  constructor(private readonly rankingsRestService: RankingsRestService) {}

  @Public()
  @Get('general')
  @ApiOperation({
    summary: 'Ranking general',
    description:
      'Obtiene el ranking global de todos los participantes activos ordenados por puntaje.',
  })
  @ApiOkResponse({
    description: 'Ranking general',
    type: RankingResponseDto,
  })
  async getGeneral(
    @Query() query: RankingQueryDto,
  ): Promise<RankingResponseDto> {
    try {
      return await this.rankingsRestService.getGeneral(query);
    } catch (error) {
      this.logger.error(
        `Error en GET /api/rankings/general: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        { message: 'Error al obtener ranking general', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('course/:courseId')
  @ApiOperation({
    summary: 'Ranking por curso',
    description:
      'Obtiene el ranking de participantes de un curso específico ordenados por puntaje.',
  })
  @ApiParam({ name: 'courseId', description: 'ID del curso' })
  @ApiOkResponse({
    description: 'Ranking del curso',
    type: RankingResponseDto,
  })
  async getByCourse(
    @Param('courseId') courseId: string,
    @Query() query: RankingQueryDto,
  ): Promise<RankingResponseDto> {
    try {
      return await this.rankingsRestService.getByCourse(courseId, query);
    } catch (error) {
      this.logger.error(
        `Error en GET /api/rankings/course/${courseId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        { message: 'Error al obtener ranking del curso', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('institution/:institutionId')
  @ApiOperation({
    summary: 'Ranking por institución',
    description:
      'Obtiene el ranking de participantes de una institución específica ordenados por puntaje.',
  })
  @ApiParam({
    name: 'institutionId',
    description: 'ID de la institución (company)',
  })
  @ApiOkResponse({
    description: 'Ranking de la institución',
    type: RankingResponseDto,
  })
  async getByInstitution(
    @Param('institutionId') institutionId: string,
    @Query() query: RankingQueryDto,
  ): Promise<RankingResponseDto> {
    try {
      return await this.rankingsRestService.getByInstitution(
        institutionId,
        query,
      );
    } catch (error) {
      this.logger.error(
        `Error en GET /api/rankings/institution/${institutionId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: 'Error al obtener ranking de institución',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
