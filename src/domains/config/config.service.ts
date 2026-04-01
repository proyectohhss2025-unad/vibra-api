import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { Config, ConfigDocument } from './schemas/config.schema';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    @InjectModel(Config.name) private configModel: Model<ConfigDocument>,
  ) {}

  /**
   * Create a new configuration or update an existing one
   *
   * @param createConfigDto - Data for creating or updating a configuration
   * @returns The created or updated configuration
   */
  async addConfig(createConfigDto: CreateConfigDto) {
    try {
      const {
        _id,
        name,
        flag,
        allowedUsers,
        disallowedUsers,
        description,
        createdBy,
        editedBy,
      } = createConfigDto as any;

      // If _id is provided, update existing config
      if (_id) {
        try {
          const config = await this.configModel.findById(_id);

          if (!config) {
            throw new NotFoundException('Config not found');
          }

          config.name = name;
          config.flag = flag;
          config.description = description;
          config.allowedUsers = allowedUsers;
          config.disallowedUsers = disallowedUsers;
          config.editedBy = editedBy;
          config.editedAt = new Date();

          await config.save();

          this.logger.log('Configuration update was successful', { config });
          return { config, message: 'Configuration update was successful' };
        } catch (error) {
          this.logger.error('Error updating configs', { error });
          throw new InternalServerErrorException('Error updating configs');
        }
      }

      // Check if config with same name already exists
      const existingConfig = await this.configModel.findOne({ name });

      if (existingConfig) {
        throw new BadRequestException('A config with that name already exists');
      }

      // Create new config
      const config = new this.configModel({
        name,
        flag: Boolean(flag),
        description,
        allowedUsers,
        disallowedUsers,
        createdBy,
        isActive: true,
      });

      await config.save();

      this.logger.log('The configuration has been registered successfully', {
        name,
        flag,
        allowedUsers,
        disallowedUsers,
      });

      return { config };
    } catch (error) {
      this.logger.error('Error registering config', { error });
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error registering config');
    }
  }

  /**
   * Get a configuration by ID
   *
   * @param id - The ID of the configuration to retrieve
   * @returns The configuration
   */
  async getConfigById(id: string) {
    try {
      const config = await this.configModel.findById(id);

      if (!config) {
        this.logger.warn('Config not found');
        throw new NotFoundException('Config not found');
      }

      return { config };
    } catch (error) {
      this.logger.error('Error when querying the config', { error });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error when querying the config');
    }
  }

  /**
   * Get a configuration by name
   *
   * @param name - The name of the configuration to retrieve
   * @returns The configuration
   */
  async getConfigByName(name: string) {
    try {
      const config = await this.configModel.findOne({ name });

      if (!config) {
        this.logger.warn('Config not found');
        throw new NotFoundException('Config not found');
      }

      return { config };
    } catch (error) {
      this.logger.error('Error when querying the configs', { error });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error when querying the configs');
    }
  }

  /**
   * Get all flag configurations with pagination
   *
   * @param page - Page number
   * @param rows - Number of rows per page
   * @returns Paginated configurations
   */
  async getAllFlagsConfigs(page: number, rows: number) {
    try {
      const configs = await this.configModel
        .find({ flag: true })
        .sort({ createdAt: -1 })
        .skip(rows * (page - 1))
        .limit(rows);

      if (!configs) {
        this.logger.warn('Configs not found');
        throw new NotFoundException('Configs not found');
      }

      const count = await this.configModel.countDocuments({ flag: true });

      return { configs, length: count };
    } catch (error) {
      this.logger.error('Error when querying the config', { error });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error when querying the config');
    }
  }

  /**
   * Get all configurations with pagination
   *
   * @param page - Page number
   * @param rows - Number of rows per page
   * @returns Paginated configurations
   */
  async getAllConfigs(page: number, rows: number) {
    try {
      const configs = await this.configModel
        .find()
        .sort({ name: -1 })
        .skip(rows * (page - 1))
        .limit(rows);

      if (!configs) {
        this.logger.warn('Config not found');
        throw new NotFoundException('Config not found');
      }

      const count = await this.configModel.countDocuments();

      return { configs, length: count };
    } catch (error) {
      this.logger.error('Error when querying the config', { error });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error when querying the config');
    }
  }

  /**
   * Set a configuration's active status
   *
   * @param id - The ID of the configuration
   * @param active - The active status
   * @param editedBy - The user who edited the configuration
   * @returns The updated configuration
   */
  async setActiveConfig(id: string, active: boolean, editedBy: string) {
    try {
      const config = await this.configModel.findById(id);
      if (!config) {
        throw new NotFoundException('Config not found');
      }
      config.isActive = active;
      config.editedBy = editedBy;
      config.editedAt = new Date();
      await config.save();
      return { config };
    } catch (error) {
      this.logger.error('Error updating config', { error });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating config');
    }
  }

  /**
   * Change a configuration's status
   *
   * @param id - The ID of the configuration
   * @param active - The active status
   * @param editedBy - The user who edited the configuration
   * @returns The updated configuration
   */
  async setChangeStatusConfig(id: string, active: boolean, editedBy: string) {
    try {
      const config = await this.configModel.findById(id);
      if (!config) {
        throw new NotFoundException('Config not found');
      }
      config.isActive = active;
      config.editedBy = editedBy;
      config.editedAt = new Date();
      await config.save();
      return { config };
    } catch (error) {
      this.logger.error('Error updating status of config', { error });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating status of config');
    }
  }

  /**
   * Update a configuration
   *
   * @param id - The ID of the configuration
   * @param updateConfigDto - The data to update
   * @returns The updated configuration
   */
  async updateConfig(id: string, updateConfigDto: UpdateConfigDto) {
    try {
      const {
        flag,
        name,
        allowedUsers,
        disallowedUsers,
        description,
        editedBy,
      } = updateConfigDto;

      const config = await this.configModel.findById(id);

      if (!config) {
        throw new NotFoundException('Config not found');
      }

      if (name) config.name = name;
      if (flag !== undefined) config.flag = flag;
      if (description) config.description = description;
      if (allowedUsers) config.allowedUsers = allowedUsers;
      if (disallowedUsers) config.disallowedUsers = disallowedUsers;
      if (editedBy) config.editedBy = editedBy;
      config.editedAt = new Date();

      await config.save();

      this.logger.log('Configuration updated successfully', { config });
      return { config };
    } catch (error) {
      this.logger.error('Error updating configs', { error });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating configs');
    }
  }

  /**
   * Validate if a user is allowed in a configuration
   *
   * @param configId - The ID of the configuration
   * @param userId - The ID of the user
   * @returns Whether the user is allowed
   */
  async validateUserInConfig(configId: string, userId: string) {
    try {
      const config = await this.configModel.findById(configId);

      if (!config) {
        throw new NotFoundException('Config not found');
      }

      const isAllowed = config.allowedUsers.includes(userId);
      const isDisallowed = config.disallowedUsers.includes(userId);

      if (isAllowed && !isDisallowed) {
        return { allowed: true };
      }

      if (!isAllowed && isDisallowed) {
        return { allowed: false };
      }

      if (!isAllowed && !isDisallowed) {
        return { allowed: false };
      }

      throw new BadRequestException(
        'The user is not in the list of allowed users or in the disallowed list of the config',
      );
    } catch (error) {
      this.logger.error('Error when consulting the configs', { error });
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error when consulting the configs',
      );
    }
  }

  /**
   * Delete a configuration
   *
   * @param id - The ID of the configuration to delete
   * @returns The deleted configuration
   */
  async deleteConfig(id: string) {
    try {
      const config = await this.configModel.findByIdAndDelete(id);

      if (!config) {
        throw new NotFoundException('Config not found');
      }

      this.logger.log('The config has been removed successfully', { config });
      return { config };
    } catch (error) {
      this.logger.error('Error delete config', { error });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error delete config');
    }
  }

  /**
   * Search configurations by term
   *
   * @param searchTerm - The term to search for
   * @returns Matching configurations
   */
  async searchConfigs(searchTerm: string) {
    try {
      // Ensure searchTerm is a string before constructing the regex
      const searchString = typeof searchTerm === 'string' ? searchTerm : '';
      // Create a regular expression for case-insensitive search
      const regex = new RegExp(searchString, 'i');

      // Construct a query object to search across all fields
      const query = {
        $or: [
          { name: { $regex: regex } },
          { description: { $regex: regex } },
          { createdBy: { $regex: regex } },
          { editedBy: { $regex: regex } },
        ],
      };

      // Perform the search using the Mongoose model
      const configs = await this.configModel.find(query);

      return {
        message: 'Search results',
        data: configs,
      };
    } catch (error) {
      this.logger.error('An error occurred during the search', error);
      throw new InternalServerErrorException(
        'An error occurred during the search',
      );
    }
  }
}
