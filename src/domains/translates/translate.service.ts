import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Translate, TranslateDocument } from './schemas/translate.schema';
import { CreateTranslateDto } from './dto/create-translate.dto';
import { UpdateTranslateDto } from './dto/update-translate.dto';
import { FilterTranslateDto } from './dto/filter-translate.dto';
import { AppLoggerService } from 'src/helpers/logger/logger.service';

@Injectable()
export class TranslateService {
  constructor(
    @InjectModel(Translate.name)
    private translateModel: Model<TranslateDocument>,
    private readonly logger: AppLoggerService,
  ) {}

  async seedTranslations(translations: any[]) {
    this.logger.log(`Seeding translations... ${translations.length}`);
    try {
      await this.translateModel.deleteMany({});
      const docs = translations.map((t) => ({
        language: t.language,
        translations: t.translations,
      }));
      return this.translateModel.insertMany(docs);
    } catch (error) {
      console.error('Error seeding translations:', error);
      throw error;
    }
  }

  async findByText(text: string) {
    return this.translateModel.find({
      $or: [
        { translations: { $exists: true, $ne: null } },
        { [`translations.${text}`]: { $exists: true } },
      ],
    });
  }

  async findTranslation(language: string, text: string) {
    return this.translateModel.findOne({
      language,
      [`translations.${text}`]: { $exists: true },
    });
  }

  async create(createTranslateDto: CreateTranslateDto): Promise<Translate> {
    const createdTranslate = new this.translateModel(createTranslateDto);
    return createdTranslate.save();
  }

  async findAll(filterDto: FilterTranslateDto): Promise<{
    paginatedTranslates: Translate[];
    totalPaginatedTranslates: number;
    totalTranslates: number;
  }> {
    const { language, page, limit } = filterDto;
    const query: any = { isActive: true, deleted: false };

    if (language) query.language = language;

    const totalTranslates = await this.translateModel
      .countDocuments(query)
      .exec();

    const paginatedTranslates = await this.translateModel
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const totalPaginatedTranslates = paginatedTranslates.length;

    return { paginatedTranslates, totalPaginatedTranslates, totalTranslates };
  }

  async findOne(id: string): Promise<Translate> {
    return this.translateModel.findById(id).exec();
  }

  async findByLanguage(language: string): Promise<Translate> {
    return this.translateModel
      .findOne({ language, isActive: true, deleted: false })
      .exec();
  }

  async update(
    id: string,
    updateTranslateDto: UpdateTranslateDto,
  ): Promise<Translate> {
    return this.translateModel
      .findByIdAndUpdate(id, updateTranslateDto, { new: true })
      .exec();
  }

  async remove(id: string, deletedBy: string): Promise<Translate> {
    return this.translateModel
      .findByIdAndUpdate(
        id,
        {
          deleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
        { new: true },
      )
      .exec();
  }

  async translateText(language: string, text: string): Promise<string> {
    const translation = await this.translateModel.findOne({ language }).exec();
    return translation?.translations[text] || text;
  }

  async detectLanguage(text: string): Promise<string> {
    // Implementación básica de detección de idioma
    // En una implementación real, usaríamos un servicio externo como Google Translate API
    return 'es';
  }

  async translateSingleText(
    text: string,
    targetLanguage: string,
  ): Promise<string> {
    const translation = await this.translateModel
      .findOne({ language: targetLanguage })
      .exec();
    return translation?.translations[text] || text;
  }

  /**
   * Traduce múltiples textos al idioma objetivo
   * @param texts Arreglo de textos a traducir
   * @param targetLanguage Idioma objetivo para la traducción
   * @returns Un objeto Record con las traducciones, garantizando que contiene todos los textos originales
   */
  async translateSeveralTexts(
    texts: string[],
    targetLanguage: string,
  ): Promise<Record<string, string>> {
    const translation = await this.translateModel
      .findOne({ language: targetLanguage })
      .exec();
    const result: Record<string, string> = {};

    // Añadir cada texto con su traducción al resultado
    texts.forEach((text) => {
      result[text] = translation?.translations[text] || text;
    });

    this.logger.log(
      `Translating ${texts.length} texts to ${targetLanguage}...`,
    );

    // Validar que todos los textos originales estén en el resultado
    const resultKeys = Object.keys(result);
    if (resultKeys.length !== texts.length) {
      this.logger.warn(
        `Discrepancia detectada: ${texts.length} textos de entrada pero ${resultKeys.length} en el resultado`,
      );

      // Identificar textos faltantes y añadirlos al resultado
      texts.forEach((text) => {
        if (!result.hasOwnProperty(text)) {
          this.logger.warn(`Añadiendo texto faltante al resultado: "${text}"`);
          result[text] = text; // Usar el texto original como valor predeterminado
        }
      });
    }

    return result;
  }
}
