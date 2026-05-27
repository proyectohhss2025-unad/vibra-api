import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { CreateIdeaDto, UpdateIdeaDto } from './dto/create-idea.dto';
import { Idea } from './schemas/idea.schema';

@Injectable()
export class IdeasService {
  constructor(
    @InjectModel(Idea.name) private ideaModel: Model<Idea>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.log('IdeasService initialized');
  }

  async create(createIdeaDto: CreateIdeaDto): Promise<Idea> {
    this.logger.log(`Creating idea: ${createIdeaDto.id}`);
    const now = new Date().toISOString();
    const idea = new this.ideaModel({
      ...createIdeaDto,
      detalle: createIdeaDto.detalle ?? '',
      tags: createIdeaDto.tags ?? [],
      prioridad: createIdeaDto.prioridad ?? 'media',
      estado: createIdeaDto.estado ?? 'pendiente',
      requerimiento: null,
      fechas: {
        creacion: now,
        modificacion: now,
        desarrollo_inicio: null,
        desarrollo_fin: null,
      },
      historial: [
        {
          fecha: now,
          accion: 'creada',
          detalle: 'Idea creada',
        },
      ],
    });
    return idea.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    estado?: string,
    prioridad?: string,
    tag?: string,
  ): Promise<{ data: Idea[]; total: number }> {
    this.logger.log('Fetching ideas...');
    const filter: any = {};
    if (estado) filter.estado = estado;
    if (prioridad) filter.prioridad = prioridad;
    if (tag) filter.tags = tag;

    const skip = (page - 1) * limit;
    const data = await this.ideaModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ 'fechas.modificacion': -1 })
      .exec();
    const total = await this.ideaModel.countDocuments(filter).exec();
    return { data, total };
  }

  async findById(id: string): Promise<Idea> {
    this.logger.log(`Finding idea by custom id: ${id}`);
    const idea = await this.ideaModel.findOne({ id }).exec();
    if (!idea) {
      throw new NotFoundException(`Idea con id ${id} no encontrada`);
    }
    return idea;
  }

  async findByMongoId(mongoId: string): Promise<Idea> {
    this.logger.log(`Finding idea by _id: ${mongoId}`);
    const idea = await this.ideaModel.findById(mongoId).exec();
    if (!idea) {
      throw new NotFoundException(`Idea con _id ${mongoId} no encontrada`);
    }
    return idea;
  }

  async update(id: string, updateIdeaDto: UpdateIdeaDto): Promise<Idea> {
    this.logger.log(`Updating idea ${id}...`);
    const now = new Date().toISOString();
    const updateData: any = { ...updateIdeaDto };
    updateData['fechas.modificacion'] = now;

    const updated = await this.ideaModel
      .findOneAndUpdate({ id }, { $set: updateData }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Idea con id ${id} no encontrada`);
    }
    return updated;
  }

  async updateEstado(id: string, estado: string, detalle?: string): Promise<Idea> {
    this.logger.log(`Updating estado for idea ${id} to ${estado}...`);
    const now = new Date().toISOString();
    const updateData: any = {
      estado,
      'fechas.modificacion': now,
    };

    if (estado === 'en_desarrollo') {
      updateData['fechas.desarrollo_inicio'] = now;
    }
    if (estado === 'desarrollada') {
      updateData['fechas.desarrollo_fin'] = now;
    }

    const updated = await this.ideaModel
      .findOneAndUpdate({ id }, { $set: updateData, $push: { historial: { fecha: now, accion: estado, detalle: detalle ?? `Estado cambiado a ${estado}` } } }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Idea con id ${id} no encontrada`);
    }
    return updated;
  }

  async updateRequerimiento(
    id: string,
    requerimiento: {
      spec_path?: string;
      plan_path?: string;
      skill_usado?: string;
      fecha_conversion?: string;
    },
  ): Promise<Idea> {
    this.logger.log(`Updating requerimiento for idea ${id}...`);
    const now = new Date().toISOString();
    const updated = await this.ideaModel
      .findOneAndUpdate(
        { id },
        {
          $set: {
            requerimiento,
            estado: 'en_desarrollo',
            'fechas.modificacion': now,
            'fechas.desarrollo_inicio': now,
          },
          $push: {
            historial: {
              fecha: now,
              accion: 'convertida',
              detalle: 'Idea convertida a requerimiento usando brainstorming',
            },
          },
        },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`Idea con id ${id} no encontrada`);
    }
    return updated;
  }

  async remove(id: string): Promise<Idea> {
    this.logger.log(`Removing idea ${id}...`);
    const deleted = await this.ideaModel.findOneAndDelete({ id }).exec();
    if (!deleted) {
      throw new NotFoundException(`Idea con id ${id} no encontrada`);
    }
    return deleted;
  }

  async getEstadisticas(): Promise<{
    total: number;
    desarrolladas: number;
    en_desarrollo: number;
    pendientes: number;
    por_prioridad: Record<string, number>;
  }> {
    this.logger.log('Fetching idea statistics...');
    const [total, desarrolladas, en_desarrollo, pendientes, prioridadAgg] =
      await Promise.all([
        this.ideaModel.countDocuments().exec(),
        this.ideaModel.countDocuments({ estado: 'desarrollada' }).exec(),
        this.ideaModel.countDocuments({ estado: 'en_desarrollo' }).exec(),
        this.ideaModel.countDocuments({ estado: 'pendiente' }).exec(),
        this.ideaModel.aggregate([
          { $group: { _id: '$prioridad', count: { $sum: 1 } } },
        ]).exec(),
      ]);

    const por_prioridad: Record<string, number> = {};
    prioridadAgg.forEach((item) => {
      por_prioridad[item._id] = item.count;
    });

    return {
      total,
      desarrolladas,
      en_desarrollo,
      pendientes,
      por_prioridad,
    };
  }

  async buscar(texto: string): Promise<Idea[]> {
    this.logger.log(`Searching ideas for: ${texto}`);
    const regex = new RegExp(texto, 'i');
    return this.ideaModel
      .find({
        $or: [
          { descripcion: regex },
          { detalle: regex },
          { tags: regex },
        ],
      })
      .sort({ 'fechas.modificacion': -1 })
      .exec();
  }
}
